/**
 * Unit Tests for lib/attendance/recordPunch.js
 * Run with: node __tests__/record-punch.test.mjs
 */

import assert from "assert";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { parseTimeToMinutes, getISTDateTime, recordPunch } from "../lib/attendance/recordPunch.js";
import StaffAttendance from "../models/StaffAttendance.js";
import User from "../models/User.js";
import HRSettings from "../models/HRSettings.js";
import Department from "../models/Department.js";

async function runTests() {
    console.log("=========================================================");
    console.log("       UNIT TESTS: lib/attendance/recordPunch.js        ");
    console.log("=========================================================\n");

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);

    const testInstituteId = new mongoose.Types.ObjectId();
    const testStaffId = new mongoose.Types.ObjectId();
    const testDeptId = new mongoose.Types.ObjectId();

    try {
        // Setup mock department with custom shift: 10:00 to 19:00, grace 10m
        await Department.create({
            _id: testDeptId,
            institute: testInstituteId,
            name: "Science Dept",
            code: "SCI",
            shiftTimings: {
                useCustomShift: true,
                shiftStart: "10:00",
                shiftEnd: "19:00",
                checkInGraceMins: 10,
                checkOutGraceMins: 15
            }
        });

        // Setup mock staff member
        await User.create({
            _id: testStaffId,
            institute: testInstituteId,
            email: "teacher.science@school.org",
            passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
            role: "instructor",
            department: testDeptId,
            profile: { firstName: "Ananya", lastName: "Sen" }
        });

        // Setup mock institute HR settings: 09:00 to 18:00
        await HRSettings.create({
            institute: testInstituteId,
            shiftStart: "09:00",
            shiftEnd: "18:00",
            checkInGraceMins: 15,
            checkOutGraceMins: 10,
            overtimeEnabled: true,
            overtimeBufferMins: 30
        });

        // --- TEST 1: Timezone UTC to IST normalization ---
        console.log("[Test 1] Timezone UTC to IST calendar day normalization...");
        // 2026-10-22 04:30:00 UTC = 2026-10-22 10:00:00 AM IST
        const utcMorning = new Date("2026-10-22T04:30:00.000Z");
        const istResult = getISTDateTime(utcMorning);
        assert.strictEqual(istResult.istDateStr, "2026-10-22");
        assert.strictEqual(istResult.istTimeStr, "10:00 AM");
        assert.strictEqual(istResult.punchMinutes, 600); // 10 * 60
        console.log("✓ Correctly resolved 04:30 UTC -> 10:00 AM IST on 2026-10-22");

        // --- TEST 2: First Punch: On-Time Check-In with Department Shift ---
        console.log("\n[Test 2] First punch of day: On-time check-in (Department shift 10:00)...");
        const punch1 = await recordPunch({
            instituteId: testInstituteId,
            staffId: testStaffId,
            timestamp: utcMorning, // 10:00 AM IST
            source: "face_scan",
            punchId: "punch_001",
            faceMatchDistance: 0.142
        });
        assert.strictEqual(punch1.action, "IN");
        assert.strictEqual(punch1.lateMinutes, 0);
        assert.strictEqual(punch1.punchType, "IN");
        assert.strictEqual(punch1.time, "10:00 AM");
        console.log("✓ Clock-in recorded at 10:00 AM with 0 late minutes");

        // --- TEST 3: Idempotency Check with duplicate punchId ---
        console.log("\n[Test 3] Idempotency: Retrying with identical punchId...");
        const punchRetry = await recordPunch({
            instituteId: testInstituteId,
            staffId: testStaffId,
            timestamp: utcMorning,
            source: "face_scan",
            punchId: "punch_001"
        });
        assert.strictEqual(punchRetry.action, "IDEMPOTENT_REPEAT");
        console.log("✓ Duplicate punchId successfully intercepted and returned idempotently");

        // --- TEST 4: Debounce guard (< 3 minutes) ---
        console.log("\n[Test 4] Debounce: Scan 1 minute later (10:01 AM IST)...");
        const utcDebounce = new Date("2026-10-22T04:31:00.000Z"); // 1 min later
        const punchDebounce = await recordPunch({
            instituteId: testInstituteId,
            staffId: testStaffId,
            timestamp: utcDebounce,
            source: "face_scan",
            punchId: "punch_002"
        });
        assert.strictEqual(punchDebounce.action, "IGNORED_DUPLICATE");
        console.log("✓ Scan within 3 minutes correctly ignored as duplicate");

        // --- TEST 5: Arrival re-tap guard (< 30 minutes after check-in) ---
        console.log("\n[Test 5] Arrival confirmation re-tap (10:15 AM IST - 15m after check-in)...");
        const utcReTap = new Date("2026-10-22T04:45:00.000Z"); // 15 mins later
        const punchReTap = await recordPunch({
            instituteId: testInstituteId,
            staffId: testStaffId,
            timestamp: utcReTap,
            source: "face_scan",
            punchId: "punch_003"
        });
        assert.strictEqual(punchReTap.action, "ARRIVAL_RETAP");
        assert.strictEqual(punchReTap.punchType, "IN");
        console.log("✓ Scan 15 minutes after check-in protected from accidental early check-out");

        // --- TEST 6: Check-Out in Evening (19:15 PM IST - on time) ---
        console.log("\n[Test 6] Evening Check-Out (19:15 PM IST)...");
        const utcEvening = new Date("2026-10-22T13:45:00.000Z"); // 13:45 UTC = 19:15 PM IST
        const punchOut = await recordPunch({
            instituteId: testInstituteId,
            staffId: testStaffId,
            timestamp: utcEvening,
            source: "face_scan",
            punchId: "punch_004"
        });
        assert.strictEqual(punchOut.action, "OUT");
        assert.strictEqual(punchOut.punchType, "OUT");
        assert.strictEqual(punchOut.time, "07:15 PM");
        assert.strictEqual(punchOut.earlyDepartureMinutes, 0);
        console.log("✓ Clock-out recorded successfully at 07:15 PM");

        // Check MongoDB record
        const finalAttendance = await StaffAttendance.findOne({
            institute: testInstituteId,
            staff: testStaffId,
            date: istResult.istDateObj
        });
        assert.strictEqual(finalAttendance.checkInTime, "10:00 AM");
        assert.strictEqual(finalAttendance.checkOutTime, "07:15 PM");
        assert.strictEqual(finalAttendance.status, "present");
        assert.strictEqual(finalAttendance.faceMatchDistance, 0.142);
        assert.strictEqual(finalAttendance.punchIds.length, 2); // punch_001 and punch_004
        console.log("✓ Final MongoDB record verified with checkInAt, checkOutAt, faceMatchDistance, and punchIds array");

        console.log("\n=========================================================");
        console.log("       ALL 6 UNIT TESTS PASSED WITH 100% SUCCESS!        ");
        console.log("=========================================================");

    } finally {
        // Cleanup test data
        await Department.deleteMany({ institute: testInstituteId });
        await User.deleteMany({ institute: testInstituteId });
        await HRSettings.deleteMany({ institute: testInstituteId });
        await StaffAttendance.deleteMany({ institute: testInstituteId });
        await mongoose.disconnect();
    }
}

runTests().catch(err => {
    console.error("Test failure:", err);
    process.exit(1);
});
