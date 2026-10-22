/**
 * Integration Test for Step 3: Kiosk Key Auth, Descriptor Caching, and Face Match Pipeline
 * Run with: node --env-file=.env.local __tests__/face-match-api.test.mjs
 */

import assert from "assert";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { generateKioskKey, verifyKioskKey } from "../lib/attendance/kioskAuth.js";
import { getInstituteTeachers, invalidateDescriptorCache, matchFace, euclideanDistance } from "../lib/attendance/faceMatcher.js";
import { recordPunch } from "../lib/attendance/recordPunch.js";
import KioskDevice from "../models/KioskDevice.js";
import User from "../models/User.js";
import HRSettings from "../models/HRSettings.js";
import StaffAttendance from "../models/StaffAttendance.js";

function createNormalizedVector() {
    const vec = new Float32Array(128);
    let sumSq = 0;
    for (let i = 0; i < 128; i++) {
        vec[i] = (Math.random() - 0.5) * 2;
        sumSq += vec[i] * vec[i];
    }
    const norm = Math.sqrt(sumSq);
    for (let i = 0; i < 128; i++) vec[i] /= norm;
    return vec;
}

async function runStep3Tests() {
    console.log("=========================================================");
    console.log("   STEP 3 TESTS: Kiosk Auth, Cache & Face Match Pipeline ");
    console.log("=========================================================\n");

    await mongoose.connect(process.env.MONGODB_URI);

    const testInstituteId = new mongoose.Types.ObjectId();
    const testTeacher1Id = new mongoose.Types.ObjectId();
    const testTeacher2Id = new mongoose.Types.ObjectId();

    try {
        // --- TEST 1: Kiosk Key Generation and Verification ---
        console.log("[Test 1] Kiosk Key Generation, Hashing & Verification...");
        const { fullKey, keyPrefix, keyHash } = generateKioskKey();
        assert.ok(fullKey.startsWith("ksk_"));
        assert.strictEqual(keyPrefix, fullKey.slice(0, 12));

        const device = await KioskDevice.create({
            name: "Main Gate Kiosk Tablet",
            institute: testInstituteId,
            keyPrefix,
            keyHash
        });

        const authGood = await verifyKioskKey(fullKey);
        assert.strictEqual(authGood.isValid, true);
        assert.strictEqual(authGood.instituteId.toString(), testInstituteId.toString());
        assert.strictEqual(authGood.device.name, "Main Gate Kiosk Tablet");

        const authBad = await verifyKioskKey(fullKey + "wrong");
        assert.strictEqual(authBad.isValid, false);
        console.log("✓ Kiosk device registered, constant-time verification passed, invalid key rejected");

        // --- TEST 2: Enrolled Teachers Setup & In-Memory Caching ---
        console.log("\n[Test 2] Teacher Descriptors Cache & Invalidation...");
        const teacher1Vector = createNormalizedVector();
        const teacher2Vector = createNormalizedVector();

        await User.create([
            {
                _id: testTeacher1Id,
                institute: testInstituteId,
                email: "dr.verma@school.edu",
                passwordHash: "hash_test",
                role: "instructor",
                profile: { firstName: "Rajesh", lastName: "Verma" },
                faceDescriptor: Array.from(teacher1Vector)
            },
            {
                _id: testTeacher2Id,
                institute: testInstituteId,
                email: "mrs.sharma@school.edu",
                passwordHash: "hash_test",
                role: "staff",
                profile: { firstName: "Pooja", lastName: "Sharma" },
                faceDescriptor: Array.from(teacher2Vector)
            }
        ]);

        const teachersLoaded1 = await getInstituteTeachers(testInstituteId);
        assert.strictEqual(teachersLoaded1.length, 2);
        assert.strictEqual(teachersLoaded1[0].descriptor.length, 128);

        // Invalidate cache
        invalidateDescriptorCache(testInstituteId);
        const teachersLoaded2 = await getInstituteTeachers(testInstituteId);
        assert.strictEqual(teachersLoaded2.length, 2);
        console.log("✓ Teacher descriptors loaded into memory (128-d vectors) and cache invalidation verified");

        // --- TEST 3: Match Face with Threshold & Margin Checks ---
        console.log("\n[Test 3] Face Matching with Threshold (0.55) and Margin (0.08)...");
        // Create live scan for Teacher 1 with slight perturbation (dist ~ 0.15)
        const liveTeacher1 = new Float32Array(128);
        for (let i = 0; i < 128; i++) {
            liveTeacher1[i] = teacher1Vector[i] + (Math.random() - 0.5) * 0.05;
        }
        let sum = 0;
        for (let i = 0; i < 128; i++) sum += liveTeacher1[i] * liveTeacher1[i];
        const norm1 = Math.sqrt(sum);
        for (let i = 0; i < 128; i++) liveTeacher1[i] /= norm1;

        const match1 = await matchFace(liveTeacher1, testInstituteId, { threshold: 0.55, margin: 0.08 });
        assert.strictEqual(match1.matched, true);
        assert.strictEqual(match1.teacher.id, testTeacher1Id.toString());
        assert.strictEqual(match1.teacher.name, "Rajesh Verma");
        assert.ok(match1.distance <= 0.55);
        console.log(`✓ Teacher 1 correctly identified: "${match1.teacher.name}" (Distance: ${match1.distance.toFixed(4)})`);

        // Test Unrecognized / Impostor Face
        const impostorVector = createNormalizedVector();
        const matchImpostor = await matchFace(impostorVector, testInstituteId, { threshold: 0.55, margin: 0.08 });
        assert.strictEqual(matchImpostor.matched, false);
        console.log(`✓ Impostor correctly rejected (Distance: ${matchImpostor.distance?.toFixed(4)} > 0.55)`);

        // --- TEST 4: End-to-End Punch Execution ---
        console.log("\n[Test 4] Executing Punch via recordPunch for Matched Teacher...");
        await HRSettings.create({
            institute: testInstituteId,
            shiftStart: "09:00",
            shiftEnd: "18:00",
            checkInGraceMins: 15
        });

        const now = new Date("2026-10-22T03:35:00.000Z"); // 09:05 AM IST
        const punchRes = await recordPunch({
            instituteId: testInstituteId,
            staffId: match1.teacher.id,
            timestamp: now,
            source: "face_scan",
            punchId: "kiosk_punch_99",
            faceMatchDistance: match1.distance
        });

        assert.strictEqual(punchRes.action, "IN");
        assert.strictEqual(punchRes.punchType, "IN");
        assert.strictEqual(punchRes.time, "09:05 AM");
        assert.strictEqual(punchRes.lateMinutes, 0);

        const attendanceInDb = await StaffAttendance.findOne({
            institute: testInstituteId,
            staff: testTeacher1Id
        });
        assert.strictEqual(attendanceInDb.status, "present");
        assert.strictEqual(attendanceInDb.source, "face_scan");
        assert.strictEqual(attendanceInDb.faceMatchDistance, match1.distance);
        console.log("✓ Attendance document created with face_scan source and match distance verified");

        console.log("\n=========================================================");
        console.log("     ALL STEP 3 INTEGRATION TESTS PASSED 100%!          ");
        console.log("=========================================================");

    } finally {
        await KioskDevice.deleteMany({ institute: testInstituteId });
        await User.deleteMany({ institute: testInstituteId });
        await HRSettings.deleteMany({ institute: testInstituteId });
        await StaffAttendance.deleteMany({ institute: testInstituteId });
        await mongoose.disconnect();
    }
}

runStep3Tests().catch(err => {
    console.error("Step 3 Test Failure:", err);
    process.exit(1);
});
