#!/usr/bin/env node
/**
 * Migration: replace the triplicate Vehicle.route +
 * Driver.assignedVehicle/assignedRoute fields with a single
 * VehicleSchedule collection (one row per vehicle+route+shift).
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://..." node scripts/migrate-vehicle-schedules.js --dry-run
 *   MONGODB_URI="mongodb+srv://..." node scripts/migrate-vehicle-schedules.js
 *   MONGODB_URI="mongodb+srv://..." node scripts/migrate-vehicle-schedules.js --finalize --dry-run
 *   MONGODB_URI="mongodb+srv://..." node scripts/migrate-vehicle-schedules.js --finalize
 *   MONGODB_URI="mongodb+srv://..." node scripts/migrate-vehicle-schedules.js --rollback-finalize=migrations/backups/vehicle-driver-2026-08-10T12-00-00-000Z.json
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Auto-load environment variables from .env.local / .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const DRY_RUN = process.argv.includes('--dry-run');
const FINALIZE = process.argv.includes('--finalize');
const ROLLBACK_ARG = process.argv.find((a) => a.startsWith('--rollback-finalize='));
const ROLLBACK_FILE = ROLLBACK_ARG ? ROLLBACK_ARG.split('=')[1] : null;

const VEHICLES_COLLECTION = 'vehicles';
const DRIVERS_COLLECTION = 'drivers';
const SCHEDULES_COLLECTION = 'vehicleschedules';

const BACKUP_DIR = path.join(__dirname, '..', 'migrations', 'backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

const DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5, 6]; // Mon–Sat

const VehicleScheduleSchema = new mongoose.Schema(
  {
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    route: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute', required: true },
    shift: { type: String, enum: ['pickup', 'drop'], required: true },
    weekdays: { type: [Number], default: DEFAULT_WEEKDAYS },
    isActive: { type: Boolean, default: true },
  },
  { collection: SCHEDULES_COLLECTION, timestamps: true }
);
VehicleScheduleSchema.index({ vehicle: 1, route: 1, shift: 1 }, { unique: true });

async function runRollbackFinalize(db) {
  const filePath = path.resolve(ROLLBACK_FILE);
  if (!fs.existsSync(filePath)) {
    console.error(`Rollback file not found: ${filePath}`);
    process.exit(1);
  }
  const backup = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`Restoring ${backup.vehicles.length} vehicles and ${backup.drivers.length} drivers from ${filePath}`);

  if (DRY_RUN) {
    console.log('DRY RUN — would restore deprecated fields. No writes performed.');
    return;
  }

  const vehicleOps = backup.vehicles.map((v) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(v._id) },
      update: { $set: { route: v.route } },
    },
  }));
  const driverOps = backup.drivers.map((d) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(d._id) },
      update: { $set: { assignedVehicle: d.assignedVehicle, assignedRoute: d.assignedRoute } },
    },
  }));

  if (vehicleOps.length) await db.collection(VEHICLES_COLLECTION).bulkWrite(vehicleOps, { ordered: false });
  if (driverOps.length) await db.collection(DRIVERS_COLLECTION).bulkWrite(driverOps, { ordered: false });
  console.log('Rollback of finalize step complete.');
}

async function stage1CreateSchedules(db) {
  const vehicles = await db.collection(VEHICLES_COLLECTION).find({}).toArray();
  const drivers = await db.collection(DRIVERS_COLLECTION).find({}).toArray();

  // In IMS-V2, Driver.assignedVehicle references Vehicle._id
  const driversByVehicleId = new Map(
    drivers.filter(d => d.assignedVehicle).map((d) => [String(d.assignedVehicle), d])
  );

  const existingSchedules = await db.collection(SCHEDULES_COLLECTION).find({}).toArray();
  const existingKey = (s) => `${s.vehicle}:${s.route}:${s.shift}`;
  const existingSet = new Set(existingSchedules.map(existingKey));

  const toInsert = [];
  const mismatches = [];
  const skippedNoAssignment = [];

  for (const vehicle of vehicles) {
    const driver = driversByVehicleId.get(String(vehicle._id));

    if (!vehicle.route || !driver) {
      skippedNoAssignment.push({
        _id: vehicle._id,
        registrationNumber: vehicle.registrationNumber,
        reason: !vehicle.route ? 'Vehicle missing assigned route' : 'No driver assigned to this vehicle'
      });
      continue;
    }

    // Check if driver assignedRoute matches vehicle route
    if (driver.assignedRoute && String(driver.assignedRoute) !== String(vehicle.route)) {
      mismatches.push({
        vehicle: vehicle._id,
        registrationNumber: vehicle.registrationNumber,
        vehicleRoute: vehicle.route,
        driverAssignedRoute: driver.assignedRoute,
        reason: 'Vehicle route and Driver assignedRoute disagree — using Vehicle route as source of truth',
      });
    }

    for (const shift of ['pickup', 'drop']) {
      const key = `${vehicle._id}:${vehicle.route}:${shift}`;
      if (existingSet.has(key)) continue; // idempotent skip

      const doc = {
        institute: vehicle.institute,
        vehicle: vehicle._id,
        driver: driver._id,
        route: vehicle.route,
        shift,
        weekdays: DEFAULT_WEEKDAYS,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      toInsert.push(doc);
    }
  }

  console.log(`Vehicles with valid driver + route assignment : ${vehicles.length - skippedNoAssignment.length}`);
  console.log(`Skipped (no driver or route)                  : ${skippedNoAssignment.length}`);
  console.log(`Vehicle/Driver route mismatches flagged      : ${mismatches.length}`);
  console.log(`New VehicleSchedule rows to create           : ${toInsert.length}`);

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const reportPath = path.join(BACKUP_DIR, `vehicle-schedule-report-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({ skippedNoAssignment, mismatches, toInsertCount: toInsert.length }, null, 2));
  console.log(`Detail report written to: ${reportPath}`);

  if (toInsert.length && !DRY_RUN) {
    const result = await db.collection(SCHEDULES_COLLECTION).insertMany(toInsert, { ordered: false });
    console.log(`Inserted ${result.insertedCount} VehicleSchedule documents.`);
  } else if (DRY_RUN) {
    console.log('DRY RUN — no schedules written. Re-run without --dry-run to apply.');
  }

  return { vehicles, drivers, mismatches };
}

async function stage2Finalize(db) {
  const schedules = await db.collection(SCHEDULES_COLLECTION).find({}).toArray();
  const vehiclesWithSchedule = new Set(schedules.map((s) => String(s.vehicle)));
  const driversWithSchedule = new Set(schedules.map((s) => String(s.driver)));

  const vehicles = await db
    .collection(VEHICLES_COLLECTION)
    .find({ _id: { $in: [...vehiclesWithSchedule].map((id) => new mongoose.Types.ObjectId(id)) } })
    .toArray();
  const drivers = await db
    .collection(DRIVERS_COLLECTION)
    .find({ _id: { $in: [...driversWithSchedule].map((id) => new mongoose.Types.ObjectId(id)) } })
    .toArray();

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupPath = path.join(BACKUP_DIR, `vehicle-driver-${timestamp}.json`);
  const backupPayload = {
    vehicles: vehicles.map((v) => ({ _id: v._id, route: v.route })),
    drivers: drivers.map((d) => ({ _id: d._id, assignedVehicle: d.assignedVehicle, assignedRoute: d.assignedRoute })),
  };
  fs.writeFileSync(backupPath, JSON.stringify(backupPayload, null, 2));
  console.log(`Backup of deprecated fields written to:\n  ${backupPath}`);
  console.log(`  (rerun with --rollback-finalize=${path.relative(process.cwd(), backupPath)} to undo)`);

  console.log(`Vehicles eligible to strip route                : ${vehicles.length}`);
  console.log(`Drivers eligible to strip assignedVehicle/Route : ${drivers.length}`);

  if (DRY_RUN) {
    console.log('DRY RUN — no fields stripped. Re-run with --finalize (no --dry-run) to apply.');
    return;
  }

  const vehicleOps = vehicles.map((v) => ({
    updateOne: { filter: { _id: v._id }, update: { $unset: { route: '' } } },
  }));
  const driverOps = drivers.map((d) => ({
    updateOne: { filter: { _id: d._id }, update: { $unset: { assignedVehicle: '', assignedRoute: '' } } },
  }));

  if (vehicleOps.length) await db.collection(VEHICLES_COLLECTION).bulkWrite(vehicleOps, { ordered: false });
  if (driverOps.length) await db.collection(DRIVERS_COLLECTION).bulkWrite(driverOps, { ordered: false });

  console.log('Finalize complete — deprecated fields stripped from Vehicle and Driver.');
}

async function main() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI env var is required.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  mongoose.model('VehicleSchedule', VehicleScheduleSchema);
  const db = mongoose.connection.db;
  console.log(`Connected. Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}${FINALIZE ? ' | FINALIZE' : ''}`);

  if (ROLLBACK_FILE) {
    await runRollbackFinalize(db);
  } else if (FINALIZE) {
    await stage2Finalize(db);
  } else {
    await stage1CreateSchedules(db);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
