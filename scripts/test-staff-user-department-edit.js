import dotenv from 'dotenv';
import path from 'path';
import assert from 'assert';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import Department from '../models/Department.js';
import User from '../models/User.js';
import Institute from '../models/Institute.js';
import SalaryComponent from '../models/SalaryComponent.js';

console.log("\n=======================================================");
console.log("🚀 STAFF, USER & SALARY COMPONENT EDIT INTEGRATION TEST");
console.log("   Testing: Staff department edit, User department edit,");
console.log("   and Salary Component edit & population");
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

    const testTag = `edit_test_${Date.now()}`;
    let testInstitute, deptMath, deptScience, testUser, testStaff, testSalaryComp;

    try {
        await runAsyncTest("1. Setup test institute and departments", async () => {
            testInstitute = await Institute.create({
                name: `Edit Test Inst ${testTag}`,
                code: `ETI_${Date.now() % 10000}`,
                contactEmail: `inst.${testTag}@test.internal`,
                status: 'active'
            });

            deptMath = await Department.create({
                institute: testInstitute._id,
                name: "Mathematics Department",
                code: "MATH",
                status: "active",
                shiftTimings: {
                    useCustomShift: true,
                    shiftStart: "08:30",
                    shiftEnd: "16:30"
                }
            });

            deptScience = await Department.create({
                institute: testInstitute._id,
                name: "Science Department",
                code: "SCI",
                status: "active",
                shiftTimings: {
                    useCustomShift: true,
                    shiftStart: "09:30",
                    shiftEnd: "17:30"
                }
            });

            assert(deptMath._id && deptScience._id, "Departments created successfully");
        });

        await runAsyncTest("2. User Department Assignment & Edit", async () => {
            // Create user initially without department
            testUser = await User.create({
                institute: testInstitute._id,
                email: `user.${testTag}@example.com`,
                passwordHash: "dummyhash123",
                role: 'instructor',
                profile: { firstName: 'Alice', lastName: 'Prof' }
            });

            assert(!testUser.department, "Initial department should be null/unset");

            // Update user to assign deptMath
            testUser.department = deptMath._id;
            await testUser.save();

            // Verify populated GET
            const fetchedUser = await User.findById(testUser._id).populate('department', 'name code shiftTimings');
            assert.strictEqual(fetchedUser.department.name, "Mathematics Department");
            assert.strictEqual(fetchedUser.department.code, "MATH");

            // Re-assign user to deptScience
            testUser.department = deptScience._id;
            await testUser.save();

            const updatedUser = await User.findById(testUser._id).populate('department', 'name code shiftTimings');
            assert.strictEqual(updatedUser.department.name, "Science Department");
            assert.strictEqual(updatedUser.department.code, "SCI");
        });

        await runAsyncTest("3. Staff Directory Member Department & Detail Edit", async () => {
            // Create staff member
            testStaff = await User.create({
                institute: testInstitute._id,
                email: `staff.${testTag}@example.com`,
                passwordHash: "dummyhash123",
                role: 'staff',
                allowLogin: false,
                profile: { firstName: 'Bob', lastName: 'Caretaker', phone: '9876543210' },
                department: deptMath._id,
                hrDetails: {
                    basicSalary: 20000,
                    qualification: 'High School'
                }
            });

            assert.strictEqual(testStaff.department.toString(), deptMath._id.toString());

            // Edit staff member (changing department, salary, qualification)
            testStaff.department = deptScience._id;
            testStaff.hrDetails.basicSalary = 25000;
            testStaff.hrDetails.qualification = 'Diploma';
            testStaff.profile.firstName = 'Robert';
            await testStaff.save();

            const reloadedStaff = await User.findById(testStaff._id).populate('department');
            assert.strictEqual(reloadedStaff.profile.firstName, 'Robert');
            assert.strictEqual(reloadedStaff.department.name, 'Science Department');
            assert.strictEqual(reloadedStaff.hrDetails.basicSalary, 25000);
            assert.strictEqual(reloadedStaff.hrDetails.qualification, 'Diploma');
        });

        await runAsyncTest("4. Salary Component Edit (Name, Calculation, Recurrence)", async () => {
            testSalaryComp = await SalaryComponent.create({
                institute: testInstitute._id,
                name: "Old Allowance Name",
                description: "Old description",
                type: "earning",
                calculationType: "flat",
                defaultValue: 1000,
                recurrence: "recurring",
                isActive: true
            });

            assert.strictEqual(testSalaryComp.name, "Old Allowance Name");

            // Apply updates similar to PATCH /api/v1/hr/salary-components/[id]
            testSalaryComp.name = "Transport Allowance (Special)";
            testSalaryComp.description = "Updated conveyance support for night shifts";
            testSalaryComp.calculationType = "flat";
            testSalaryComp.defaultValue = 2500;
            testSalaryComp.recurrence = "variable";
            await testSalaryComp.save();

            const reloadedComp = await SalaryComponent.findById(testSalaryComp._id);
            assert.strictEqual(reloadedComp.name, "Transport Allowance (Special)");
            assert.strictEqual(reloadedComp.description, "Updated conveyance support for night shifts");
            assert.strictEqual(reloadedComp.defaultValue, 2500);
            assert.strictEqual(reloadedComp.recurrence, "variable");
        });

        console.log("\n=======================================================");
        console.log(`📊 TEST RESULTS: ${passedCount}/${totalCount} tests passed (100%)`);
        console.log("🎉 ALL TESTS PASSED! Staff, User & Salary Component edits verified.");
        console.log("=======================================================\n");

    } finally {
        console.log("  Cleaning up test data...");
        if (testUser) await User.deleteOne({ _id: testUser._id });
        if (testStaff) await User.deleteOne({ _id: testStaff._id });
        if (testSalaryComp) await SalaryComponent.deleteOne({ _id: testSalaryComp._id });
        if (deptMath) await Department.deleteOne({ _id: deptMath._id });
        if (deptScience) await Department.deleteOne({ _id: deptScience._id });
        if (testInstitute) await Institute.deleteOne({ _id: testInstitute._id });
        await mongoose.disconnect();
        console.log("  Cleaned up and disconnected.\n");
    }
}

run().catch(err => {
    console.error("Test failed fatal error:", err);
    process.exit(1);
});
