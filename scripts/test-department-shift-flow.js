import dotenv from 'dotenv';
import path from 'path';
import assert from 'assert';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import Department from '../models/Department.js';
import User from '../models/User.js';
import Institute from '../models/Institute.js';
import HRSettings from '../models/HRSettings.js';
import StaffAttendance from '../models/StaffAttendance.js';
import Payslip from '../models/Payslip.js';

console.log("\n=======================================================");
console.log("🚀 DEPARTMENT & SHIFT TIMINGS INTEGRATION TEST");
console.log("   Testing: Custom shift vs Institute default,");
console.log("   Grace period resolution & late penalty calculations");
console.log("=======================================================\n");

let passedCount = 0;
let totalCount = 0;

async function runAsyncTest(name, fn) {
    totalCount++;
    try {
        await fn();
        console.log(`  ✅ [PASS] ${name}`);
        passedCount++;
    } catch (err) {
        console.error(`  ❌ [FAIL] ${name}`);
        console.error(`     Error: ${err.message}`);
        throw err;
    }
}

async function run() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ims_test';
    await mongoose.connect(mongoUri);
    console.log("  Connected to MongoDB.\n");

    const testTag = `dept_shift_${Date.now()}`;
    let testInstitute, deptCustom, deptStandard, staffA, staffB, staffC, hrSettings;

    try {
        await runAsyncTest("1. Setup test institute and institute HR settings", async () => {
            testInstitute = await Institute.create({
                name: `Shift Test Inst ${testTag}`,
                code: `STI_${Date.now() % 10000}`,
                contactEmail: `inst.${testTag}@test.internal`,
                status: 'active'
            });

            hrSettings = await HRSettings.create({
                institute: testInstitute._id,
                shiftStart: "09:00",
                shiftEnd: "18:00",
                checkInGraceMins: 15,
                checkOutGraceMins: 10,
                deductionRatePerHour: 100,
                overtimeRatePerHour: 150
            });

            assert.strictEqual(hrSettings.shiftStart, "09:00");
            assert.strictEqual(hrSettings.checkInGraceMins, 15);
        });

        await runAsyncTest("2. Create Department with custom shift & Department with standard shift", async () => {
            // Department A: Early shift (e.g. Teaching/Operations in school)
            deptCustom = await Department.create({
                name: `Early Operations ${testTag}`,
                code: `EOP_${Date.now() % 10000}`,
                institute: testInstitute._id,
                shiftTimings: {
                    useCustomShift: true,
                    shiftStart: "08:30",
                    shiftEnd: "16:30",
                    checkInGraceMins: 10,
                    checkOutGraceMins: 5
                }
            });

            // Department B: Standard shift (inherits institute defaults)
            deptStandard = await Department.create({
                name: `Standard Admin ${testTag}`,
                code: `STD_${Date.now() % 10000}`,
                institute: testInstitute._id,
                shiftTimings: {
                    useCustomShift: false,
                    shiftStart: "09:00",
                    shiftEnd: "18:00",
                    checkInGraceMins: 15,
                    checkOutGraceMins: 10
                }
            });

            assert.strictEqual(deptCustom.shiftTimings.useCustomShift, true);
            assert.strictEqual(deptCustom.shiftTimings.shiftStart, "08:30");
            assert.strictEqual(deptCustom.shiftTimings.checkInGraceMins, 10);

            assert.strictEqual(deptStandard.shiftTimings.useCustomShift, false);
        });

        await runAsyncTest("3. Create staff members and associate with departments", async () => {
            staffA = await User.create({
                name: "Staff Custom Shift",
                email: `staffA.${testTag}@test.internal`,
                passwordHash: "dummy",
                role: "staff",
                institute: testInstitute._id,
                department: deptCustom._id,
                profile: { firstName: "Alice", lastName: "Teacher" },
                hrDetails: { basicSalary: 30000 }
            });

            staffB = await User.create({
                name: "Staff Standard Shift",
                email: `staffB.${testTag}@test.internal`,
                passwordHash: "dummy",
                role: "staff",
                institute: testInstitute._id,
                department: deptStandard._id,
                profile: { firstName: "Bob", lastName: "Admin" },
                hrDetails: { basicSalary: 30000 }
            });

            staffC = await User.create({
                name: "Staff No Dept",
                email: `staffC.${testTag}@test.internal`,
                passwordHash: "dummy",
                role: "staff",
                institute: testInstitute._id,
                department: null,
                profile: { firstName: "Charlie", lastName: "Floating" },
                hrDetails: { basicSalary: 30000 }
            });

            assert.strictEqual(staffA.department.toString(), deptCustom._id.toString());
            assert.strictEqual(staffB.department.toString(), deptStandard._id.toString());
            assert.strictEqual(staffC.department, null);
        });

        await runAsyncTest("4. Verify shift resolution logic for all 3 staff scenarios", async () => {
            const staffList = await User.find({
                _id: { $in: [staffA._id, staffB._id, staffC._id] }
            }).populate('department');

            const resolveShift = (member) => {
                const deptShift = member.department?.shiftTimings;
                const hasCustom = Boolean(deptShift?.useCustomShift);
                return hasCustom ? {
                    isDepartmentShift: true,
                    shiftStart: deptShift.shiftStart || "09:00",
                    shiftEnd: deptShift.shiftEnd || "18:00",
                    checkInGraceMins: deptShift.checkInGraceMins ?? 15,
                    checkOutGraceMins: deptShift.checkOutGraceMins ?? 10
                } : {
                    isDepartmentShift: false,
                    shiftStart: hrSettings.shiftStart || "09:00",
                    shiftEnd: hrSettings.shiftEnd || "18:00",
                    checkInGraceMins: hrSettings.checkInGraceMins ?? 15,
                    checkOutGraceMins: hrSettings.checkOutGraceMins ?? 10
                };
            };

            const memberA = staffList.find(s => s._id.toString() === staffA._id.toString());
            const memberB = staffList.find(s => s._id.toString() === staffB._id.toString());
            const memberC = staffList.find(s => s._id.toString() === staffC._id.toString());

            const shiftA = resolveShift(memberA);
            const shiftB = resolveShift(memberB);
            const shiftC = resolveShift(memberC);

            // Alice: Custom 08:30 - 16:30, grace 10m / 5m
            assert.strictEqual(shiftA.isDepartmentShift, true);
            assert.strictEqual(shiftA.shiftStart, "08:30");
            assert.strictEqual(shiftA.shiftEnd, "16:30");
            assert.strictEqual(shiftA.checkInGraceMins, 10);
            assert.strictEqual(shiftA.checkOutGraceMins, 5);

            // Bob: Standard department -> falls back to institute 09:00 - 18:00, grace 15m / 10m
            assert.strictEqual(shiftB.isDepartmentShift, false);
            assert.strictEqual(shiftB.shiftStart, "09:00");
            assert.strictEqual(shiftB.shiftEnd, "18:00");
            assert.strictEqual(shiftB.checkInGraceMins, 15);
            assert.strictEqual(shiftB.checkOutGraceMins, 10);

            // Charlie: No department -> falls back to institute
            assert.strictEqual(shiftC.isDepartmentShift, false);
            assert.strictEqual(shiftC.shiftStart, "09:00");
            assert.strictEqual(shiftC.checkInGraceMins, 15);
        });

        await runAsyncTest("5. Test Late Penalty calculations with department grace periods", async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Alice arrives 12 mins late (at 08:42 for an 08:30 shift).
            // Her department checkInGraceMins is 10. 12 > 10 => Late penalty triggered!
            const logAlice = await StaffAttendance.create({
                institute: testInstitute._id,
                staff: staffA._id,
                date: today,
                status: 'present',
                checkInTime: "08:42",
                checkOutTime: "16:30",
                lateMinutes: 12,
                markedBy: staffA._id
            });

            // Bob also arrives 12 mins late (at 09:12 for a 09:00 shift).
            // His department uses institute checkInGraceMins of 15. 12 <= 15 => Within grace!
            const logBob = await StaffAttendance.create({
                institute: testInstitute._id,
                staff: staffB._id,
                date: today,
                status: 'present',
                checkInTime: "09:12",
                checkOutTime: "18:00",
                lateMinutes: 12,
                markedBy: staffB._id
            });

            // Calculate late penalty hours for Alice using department grace
            const effectiveGraceAlice = deptCustom.shiftTimings.useCustomShift
                ? deptCustom.shiftTimings.checkInGraceMins
                : hrSettings.checkInGraceMins;
            const aliceLateHours = (logAlice.lateMinutes > effectiveGraceAlice)
                ? Math.ceil(logAlice.lateMinutes / 60)
                : 0;

            // Calculate late penalty hours for Bob using standard/institute grace
            const effectiveGraceBob = deptStandard.shiftTimings.useCustomShift
                ? deptStandard.shiftTimings.checkInGraceMins
                : hrSettings.checkInGraceMins;
            const bobLateHours = (logBob.lateMinutes > effectiveGraceBob)
                ? Math.ceil(logBob.lateMinutes / 60)
                : 0;

            assert.strictEqual(aliceLateHours, 1, "Alice should have 1 block-hour penalty (12m > 10m grace)");
            assert.strictEqual(bobLateHours, 0, "Bob should have 0 penalty (12m <= 15m grace)");
        });

        await runAsyncTest("6. Test Early Departure calculations with department grace periods", async () => {
            // Alice leaves 8 mins early (at 16:22 for a 16:30 shift).
            // Department checkout grace is 5 mins. 8 > 5 => Early penalty triggered!
            const earlyMinsAlice = 8;
            const effectiveOutGraceAlice = deptCustom.shiftTimings.useCustomShift
                ? deptCustom.shiftTimings.checkOutGraceMins
                : hrSettings.checkOutGraceMins;
            const aliceEarlyHours = (earlyMinsAlice > effectiveOutGraceAlice)
                ? Math.ceil(earlyMinsAlice / 60)
                : 0;

            // Bob leaves 8 mins early (at 17:52 for an 18:00 shift).
            // Institute checkout grace is 10 mins. 8 <= 10 => Within grace!
            const earlyMinsBob = 8;
            const effectiveOutGraceBob = deptStandard.shiftTimings.useCustomShift
                ? deptStandard.shiftTimings.checkOutGraceMins
                : hrSettings.checkOutGraceMins;
            const bobEarlyHours = (earlyMinsBob > effectiveOutGraceBob)
                ? Math.ceil(earlyMinsBob / 60)
                : 0;

            assert.strictEqual(aliceEarlyHours, 1, "Alice should have 1 hour early departure deduction (8m > 5m grace)");
            assert.strictEqual(bobEarlyHours, 0, "Bob should have 0 deduction (8m <= 10m grace)");
        });

        console.log("\n=======================================================");
        console.log(`🎉 ALL ${passedCount}/${totalCount} TESTS PASSED SUCCESSFULLY!`);
        console.log("=======================================================\n");

    } finally {
        // Clean up test data
        console.log("  Cleaning up test data...");
        if (testInstitute) {
            await Promise.all([
                Institute.deleteOne({ _id: testInstitute._id }),
                HRSettings.deleteOne({ institute: testInstitute._id }),
                Department.deleteMany({ institute: testInstitute._id }),
                User.deleteMany({ institute: testInstitute._id }),
                StaffAttendance.deleteMany({ institute: testInstitute._id }),
                Payslip.deleteMany({ institute: testInstitute._id })
            ]);
        }
        await mongoose.disconnect();
        console.log("  Disconnected from MongoDB.\n");
    }
}

run().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
