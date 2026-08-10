#!/usr/bin/env node
/**
 * Migration: backfill Student.transport.stopId from the legacy
 * Student.transport.pickupStop string, ensure every embedded route stop
 * has a stable _id, and remove the deprecated Student.transport.vehicle
 * field (vehicle is now derived from VehicleSchedule).
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://..." node scripts/migrate-transport-stops.js --dry-run
 *   MONGODB_URI="mongodb+srv://..." node scripts/migrate-transport-stops.js
 *   MONGODB_URI="mongodb+srv://..." node scripts/migrate-transport-stops.js --rollback=migrations/backups/student-transport-2026-08-10T12-00-00-000Z.json
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Auto-load environment variables from .env.local / .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const DRY_RUN = process.argv.includes('--dry-run');
const ROLLBACK_ARG = process.argv.find((a) => a.startsWith('--rollback='));
const ROLLBACK_FILE = ROLLBACK_ARG ? ROLLBACK_ARG.split('=')[1] : null;

const ROUTES_COLLECTION = 'transportroutes';
const STUDENTS_COLLECTION = 'users';

const BACKUP_DIR = path.join(__dirname, '..', 'migrations', 'backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

function normalize(str) {
  return (str || '').toString().trim().toLowerCase();
}

function getStudentName(student) {
  if (student.profile) {
    const first = student.profile.firstName || '';
    const last = student.profile.lastName || '';
    const full = `${first} ${last}`.trim();
    if (full) return full;
  }
  return student.name || student.email || String(student._id);
}

async function runRollback(db) {
  const filePath = path.resolve(ROLLBACK_FILE);
  if (!fs.existsSync(filePath)) {
    console.error(`Rollback file not found: ${filePath}`);
    process.exit(1);
  }
  const backups = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`Restoring transport block for ${backups.length} students from ${filePath}`);

  const ops = backups.map((b) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(b._id) },
      update: { $set: { transport: b.transport } },
    },
  }));

  if (DRY_RUN) {
    console.log(`DRY RUN — would restore ${ops.length} students. No writes performed.`);
    return;
  }

  const result = await db.collection(STUDENTS_COLLECTION).bulkWrite(ops, { ordered: false });
  console.log(`Rollback complete. Restored ${result.modifiedCount} student documents.`);
}

async function main() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI env var is required.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(`Connected. Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);

  if (ROLLBACK_FILE) {
    await runRollback(db);
    await mongoose.disconnect();
    return;
  }

  // ---------- Step 1: ensure every embedded stop has an _id ----------
  const routes = await db.collection(ROUTES_COLLECTION).find({}).toArray();
  const routeStopFixOps = [];

  for (const route of routes) {
    let changed = false;
    const stops = (route.stops || []).map((s) => {
      if (!s._id) {
        changed = true;
        return { ...s, _id: new mongoose.Types.ObjectId() };
      }
      return s;
    });
    if (changed) {
      routeStopFixOps.push({
        updateOne: { filter: { _id: route._id }, update: { $set: { stops } } },
      });
      route.stops = stops; // keep in-memory copy in sync for step 2
    }
  }

  if (routeStopFixOps.length) {
    console.log(`${routeStopFixOps.length} route(s) need stop _id backfill.`);
    if (!DRY_RUN) {
      await db.collection(ROUTES_COLLECTION).bulkWrite(routeStopFixOps);
    }
  } else {
    console.log('All route stops already have _id — nothing to backfill there.');
  }

  const routesById = new Map(routes.map((r) => [String(r._id), r]));

  // ---------- Step 2: match + backfill student.transport.stopId ----------
  const students = await db
    .collection(STUDENTS_COLLECTION)
    .find({ role: 'student', 'transport.isAvailing': true })
    .toArray();

  console.log(`Found ${students.length} students availing transport.`);

  const studentOps = [];
  const backups = [];
  const unmatched = [];
  let mapped = 0;

  for (const student of students) {
    const t = student.transport || {};
    const studentName = getStudentName(student);

    if (!t.route) {
      unmatched.push({ _id: student._id, name: studentName, email: student.email, reason: 'No route assigned' });
      continue;
    }

    const route = routesById.get(String(t.route));
    if (!route) {
      unmatched.push({ _id: student._id, name: studentName, email: student.email, reason: `Route ${t.route} not found` });
      continue;
    }

    const target = normalize(t.pickupStop);
    const match = (route.stops || []).find((s) => normalize(s.name) === target);

    if (!match) {
      unmatched.push({
        _id: student._id,
        name: studentName,
        email: student.email,
        route: route.name,
        pickupStop: t.pickupStop,
        reason: 'No matching stop name on route',
      });
      continue;
    }

    backups.push({ _id: student._id, transport: student.transport });

    studentOps.push({
      updateOne: {
        filter: { _id: student._id },
        update: {
          $set: { 'transport.stopId': match._id },
          $unset: { 'transport.vehicle': '' },
        },
      },
    });
    mapped++;
  }

  // ---------- Step 3: write backup file BEFORE any mutation ----------
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupPath = path.join(BACKUP_DIR, `student-transport-${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backups, null, 2));
  console.log(`Backup of ${backups.length} student transport blocks written to:\n  ${backupPath}`);
  console.log(`  (rerun with --rollback=${path.relative(process.cwd(), backupPath)} to undo)`);

  // ---------- Step 4: apply, transactionally if possible ----------
  if (studentOps.length && !DRY_RUN) {
    const session = mongoose.connection.getClient().startSession();
    try {
      await session.withTransaction(async () => {
        const result = await db
          .collection(STUDENTS_COLLECTION)
          .bulkWrite(studentOps, { ordered: false, session });
        console.log(`Applied ${result.modifiedCount} student updates inside a transaction.`);
      });
    } catch (txErr) {
      console.warn('Transaction not available (likely a standalone MongoDB instance).');
      console.warn('Falling back to a plain bulkWrite — not fully atomic across all documents.');
      const result = await db.collection(STUDENTS_COLLECTION).bulkWrite(studentOps, { ordered: false });
      console.log(`Applied ${result.modifiedCount} student updates.`);
    } finally {
      await session.endSession();
    }
  }

  // ---------- Step 5: report ----------
  const reportPath = path.join(BACKUP_DIR, `stop-migration-report-${timestamp}.json`);
  const report = {
    mode: DRY_RUN ? 'dry-run' : 'live',
    totalProcessed: students.length,
    mapped,
    unmatchedCount: unmatched.length,
    unmatched,
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n=== Summary ===');
  console.log(`Total students processed : ${students.length}`);
  console.log(`Successfully mapped      : ${mapped}`);
  console.log(`Flagged for review       : ${unmatched.length}`);

  if (unmatched.length > 0) {
    console.log('\n--- Flagged Students Details ---');
    unmatched.forEach((u, i) => {
      console.log(`${i + 1}. Student: ${u.name} (${u.email || u._id})`);
      console.log(`   Reason: ${u.reason}`);
      if (u.route) console.log(`   Route: ${u.route}`);
      if (u.pickupStop) console.log(`   Current pickupStop text: "${u.pickupStop}"`);
      const r = [...routesById.values()].find(rt => rt.name === u.route);
      if (r && r.stops) {
        console.log(`   Available stops on this route: [ ${r.stops.map(s => `"${s.name}"`).join(', ')} ]`);
      }
      console.log('');
    });
  }

  console.log(`Full report written to   : ${reportPath}`);
  if (DRY_RUN) console.log('\nDRY RUN — no data was changed. Re-run without --dry-run to apply.');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
