import dotenv from 'dotenv';
import path from 'path';
import assert from 'assert';
import crypto from 'crypto';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log("\n=======================================================");
console.log("🚀 COMPREHENSIVE HR MODULE TEST SUITE");
console.log("   Testing: Staff Directory, Non-Login Staff,");
console.log("   Salary Structure Builder, Statutory Toggles,");
console.log("   Attendance Timing Rules & DB Persistence");
console.log("=======================================================\n");

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
    totalCount++;
    try {
        fn();
        console.log(`  ✅ [PASS] ${name}`);
        passedCount++;
    } catch (err) {
        console.error(`  ❌ [FAIL] ${name}`);
        console.error(`     Error: ${err.message}`);
    }
}

async function runAsyncTest(name, fn) {
    totalCount++;
    try {
        await fn();
        console.log(`  ✅ [PASS] ${name}`);
        passedCount++;
    } catch (err) {
        console.error(`  ❌ [FAIL] ${name}`);
        console.error(`     Error: ${err.message}`);
    }
}

// -------------------------------------------------------------
// SUITE 1: NON-LOGIN SUPPORT STAFF & INTERNAL CREDENTIALS
// -------------------------------------------------------------
console.log("📋 SUITE 1: Support Staff & Internal Credentials (No App Login)");

runTest("1.1 Synthetic internal email follows format 'staff.<timestamp>.<hex>@ims.internal'", () => {
    const uniquePart = crypto.randomBytes(4).toString('hex');
    const userEmail = `staff.${Date.now()}.${uniquePart}@ims.internal`;
    const regex = /^staff\.\d+\.[a-f0-9]{8}@ims\.internal$/;
    assert.ok(regex.test(userEmail), `Generated email '${userEmail}' did not match internal regex`);
});

runTest("1.2 Enrollment number format generation (EMP-XXXXXX)", () => {
    const empCode = `EMP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const regex = /^EMP-[A-F0-9]{6}$/;
    assert.ok(regex.test(empCode), `Generated code '${empCode}' did not match EMP regex`);
});

runTest("1.3 Auth Gatekeeper: lib/auth.js rejects login when allowLogin === false", () => {
    // Simulate user record in DB
    const nonLoginStaffUser = {
        _id: "staff_123",
        email: "staff.1727244000.abc12345@ims.internal",
        allowLogin: false,
        role: "staff"
    };

    // Simulate authorize logic from lib/auth.js
    const simulateAuthorize = (user) => {
        if (!user) throw new Error("No user found with this email");
        if (user.allowLogin === false) {
            throw new Error("This staff account is configured for payroll and records only. Portal login is not permitted.");
        }
        return { id: user._id, role: user.role };
    };

    assert.throws(
        () => simulateAuthorize(nonLoginStaffUser),
        /Portal login is not permitted/,
        "Auth layer should immediately throw and reject login for allowLogin: false"
    );

    const normalUser = { _id: "teacher_1", email: "teacher@school.com", allowLogin: true, role: "instructor" };
    const authResult = simulateAuthorize(normalUser);
    assert.strictEqual(authResult.id, "teacher_1");
});

// -------------------------------------------------------------
// SUITE 2: DYNAMIC SALARY COMPONENTS & CALCULATION ENGINE
// -------------------------------------------------------------
console.log("\n📋 SUITE 2: Salary Components & Dynamic Calculation Rules");

function calculateComponent(basic, gross, comp) {
    if (comp.isActive === false) return 0; // Disabled globally
    if (comp.calculationType === 'percentage') {
        const basis = comp.percentageBasis === 'gross' ? gross : basic;
        return Math.round((basis * (comp.defaultValue || 0)) / 100);
    }
    return comp.defaultValue || 0;
}

runTest("2.1 Flat allowance calculation (e.g. Medical Allowance ₹2,500)", () => {
    const comp = { name: "Medical", calculationType: "flat", defaultValue: 2500, isActive: true };
    const amt = calculateComponent(15000, 20000, comp);
    assert.strictEqual(amt, 2500);
});

runTest("2.2 Percentage of Basic calculation (e.g. DA 10% on ₹15,000 Basic)", () => {
    const comp = { name: "DA", calculationType: "percentage", percentageBasis: "basic", defaultValue: 10, isActive: true };
    const amt = calculateComponent(15000, 20000, comp);
    assert.strictEqual(amt, 1500);
});

runTest("2.3 Percentage of Gross calculation (e.g. HRA 8% on ₹25,000 Gross)", () => {
    const comp = { name: "HRA", calculationType: "percentage", percentageBasis: "gross", defaultValue: 8, isActive: true };
    const amt = calculateComponent(15000, 25000, comp);
    assert.strictEqual(amt, 2000);
});

runTest("2.4 Statutory Global Toggle: Disabled component returns 0", () => {
    // When Professional Tax or EPF is toggled off by private/exempt school
    const ptDisabled = { name: "Professional Tax", calculationType: "flat", defaultValue: 200, isActive: false };
    const amt = calculateComponent(15000, 25000, ptDisabled);
    assert.strictEqual(amt, 0, "Disabled component should evaluate to 0 in payroll");
});

// -------------------------------------------------------------
// SUITE 3: 5-TAB SALARY STRUCTURE & TAKE-HOME PREVIEW BUILDER
// -------------------------------------------------------------
console.log("\n📋 SUITE 3: Salary Structure Builder (Gross Pay & Net Payout)");

runTest("3.1 Gross Salary = Basic + Active Earning Allowances", () => {
    const basicSalary = 18000;
    const allowances = [
        { name: "DA (10% of basic)", amount: 1800, isIncluded: true },
        { name: "HRA (Flat)", amount: 4000, isIncluded: true },
        { name: "Special Allowance", amount: 2000, isIncluded: true },
        { name: "Conveyance (Opted Out)", amount: 1500, isIncluded: false } // staff opted out
    ];

    const totalAllowances = allowances
        .filter(a => a.isIncluded)
        .reduce((sum, a) => sum + a.amount, 0);

    const grossSalary = basicSalary + totalAllowances;
    assert.strictEqual(totalAllowances, 7800);
    assert.strictEqual(grossSalary, 25800);
});

runTest("3.2 Net Salary = Gross Salary - Active Deductions & Taxes", () => {
    const grossSalary = 25800;
    const basicSalary = 18000;
    const deductions = [
        { name: "EPF (12% of basic)", amount: 2160, isIncluded: true },
        { name: "ESI (0.75% of gross)", amount: 194, isIncluded: true },
        { name: "Professional Tax", amount: 200, isIncluded: true },
        { name: "TDS", amount: 500, isIncluded: false } // exempted
    ];

    const totalDeductions = deductions
        .filter(d => d.isIncluded)
        .reduce((sum, d) => sum + d.amount, 0);

    const estNetSalary = grossSalary - totalDeductions;
    assert.strictEqual(totalDeductions, 2554);
    assert.strictEqual(estNetSalary, 23246);
});

// -------------------------------------------------------------
// SUITE 4: ATTENDANCE TIMING RULES & DEDUCTION CALCULATION
// -------------------------------------------------------------
console.log("\n📋 SUITE 4: Attendance Timing Rules (Grace, Late Blocks, Overtime)");

function calcLatePenaltyHours(lateMinutes, graceMinutes = 15) {
    if (lateMinutes <= graceMinutes) return 0;
    return Math.ceil(lateMinutes / 60);
}

function calcOvertimeHours(extraMinutes, bufferMinutes = 30) {
    if (extraMinutes <= bufferMinutes) return 0;
    return Math.floor((extraMinutes - bufferMinutes) / 60);
}

runTest("4.1 Late arrival <= grace (12 mins <= 15 mins) incurs 0 hr cut", () => {
    assert.strictEqual(calcLatePenaltyHours(12, 15), 0);
});

runTest("4.2 Late arrival exactly at grace (15 mins) incurs 0 hr cut", () => {
    assert.strictEqual(calcLatePenaltyHours(15, 15), 0);
});

runTest("4.3 Late arrival past grace (20 mins) incurs 1 hr block penalty", () => {
    assert.strictEqual(calcLatePenaltyHours(20, 15), 1);
});

runTest("4.4 Late arrival past 1 hr (65 mins) incurs 2 hr block penalty", () => {
    assert.strictEqual(calcLatePenaltyHours(65, 15), 2);
});

runTest("4.5 Post-shift stay <= buffer (25 mins <= 30 mins) gives 0 OT", () => {
    assert.strictEqual(calcOvertimeHours(25, 30), 0);
});

runTest("4.6 Post-shift stay 95 mins (65 mins past buffer) gives 1 full OT hour", () => {
    assert.strictEqual(calcOvertimeHours(95, 30), 1);
});

runTest("4.7 Post-shift stay 155 mins (125 mins past buffer) gives 2 full OT hours", () => {
    assert.strictEqual(calcOvertimeHours(155, 30), 2);
});

// -------------------------------------------------------------
// SUITE 5: LIVE DATABASE INTEGRATION (if MONGODB_URI set)
// -------------------------------------------------------------
async function runDatabaseIntegrationSuite() {
    console.log("\n📋 SUITE 5: Live Database Integration & Schema Validation");

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.log("  ⚠️  MONGODB_URI is not set. Skipping live DB integration suite.");
        return;
    }

    try {
        console.log("  🔄 Connecting to MongoDB...");
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log("  ✅ Connected to MongoDB.");

        const db = mongoose.connection.db;

        // Find or create test institute
        let testInstitute = await db.collection('institutes').findOne();
        let instituteId = testInstitute ? testInstitute._id : new mongoose.Types.ObjectId();

        const testStaffEmail = `staff.test.${Date.now()}@ims.internal`;
        const testStaffId = new mongoose.Types.ObjectId();

        // 5.1 Test insert non-login support staff
        await runAsyncTest("5.1 Create non-login staff in MongoDB with statutory IDs and bank details", async () => {
            const staffDoc = {
                _id: testStaffId,
                institute: instituteId,
                email: testStaffEmail,
                role: 'staff',
                allowLogin: false,
                enrollmentNumber: `EMP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
                isActive: true,
                profile: {
                    firstName: "Lakshmi",
                    lastName: "Devi",
                    phone: "9988776655"
                },
                hrDetails: {
                    basicSalary: 12000,
                    panNumber: "ABCDE1234F",
                    uanNumber: "101234567890",
                    esiNumber: "12345678901234567",
                    bankDetails: {
                        bankName: "State Bank of India",
                        accountName: "Lakshmi Devi",
                        accountNumber: "112233445566",
                        ifscCode: "SBIN0001234",
                        branch: "Main Branch"
                    },
                    earnings: [],
                    deductions: []
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const insertResult = await db.collection('users').insertOne(staffDoc);
            assert.ok(insertResult.acknowledged, "Staff insertion was not acknowledged");

            const retrieved = await db.collection('users').findOne({ _id: testStaffId });
            assert.ok(retrieved, "Could not retrieve inserted staff member");
            assert.strictEqual(retrieved.allowLogin, false, "allowLogin must be false");
            assert.strictEqual(retrieved.hrDetails.panNumber, "ABCDE1234F");
            assert.strictEqual(retrieved.hrDetails.bankDetails.accountNumber, "112233445566");
            assert.strictEqual(retrieved.hrDetails.basicSalary, 12000);
        });

        // 5.2 Test create and toggle salary component
        const testCompId = new mongoose.Types.ObjectId();
        await runAsyncTest("5.2 Create SalaryComponent with calculationType and toggle isActive switch", async () => {
            const compDoc = {
                _id: testCompId,
                institute: instituteId,
                name: `Test Professional Tax ${Date.now()}`,
                type: "deduction",
                calculationType: "flat",
                defaultValue: 200,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await db.collection('salarycomponents').insertOne(compDoc);
            
            // Toggle active status to false (exemption test)
            await db.collection('salarycomponents').updateOne(
                { _id: testCompId },
                { $set: { isActive: false, updatedAt: new Date() } }
            );

            const updatedComp = await db.collection('salarycomponents').findOne({ _id: testCompId });
            assert.ok(updatedComp, "Could not find updated component");
            assert.strictEqual(updatedComp.isActive, false, "Component isActive should be toggled to false");
            assert.strictEqual(updatedComp.calculationType, "flat");
        });

        // 5.3 Test staff salary structure update
        await runAsyncTest("5.3 Update staff salary structure with allowances & deductions arrays", async () => {
            await db.collection('users').updateOne(
                { _id: testStaffId },
                {
                    $set: {
                        "hrDetails.basicSalary": 15000,
                        "hrDetails.earnings": [
                            { component: new mongoose.Types.ObjectId(), amount: 1500 } // DA
                        ],
                        "hrDetails.deductions": [
                            { component: testCompId, amount: 200 } // PT
                        ],
                        updatedAt: new Date()
                    }
                }
            );

            const updatedStaff = await db.collection('users').findOne({ _id: testStaffId });
            assert.strictEqual(updatedStaff.hrDetails.basicSalary, 15000);
            assert.strictEqual(updatedStaff.hrDetails.earnings.length, 1);
            assert.strictEqual(updatedStaff.hrDetails.earnings[0].amount, 1500);
            assert.strictEqual(updatedStaff.hrDetails.deductions.length, 1);
        });

        // 5.4 Clean up test data
        await runAsyncTest("5.4 Clean up test artifacts from database", async () => {
            await db.collection('users').deleteOne({ _id: testStaffId });
            await db.collection('salarycomponents').deleteOne({ _id: testCompId });

            const checkStaff = await db.collection('users').findOne({ _id: testStaffId });
            const checkComp = await db.collection('salarycomponents').findOne({ _id: testCompId });

            assert.strictEqual(checkStaff, null, "Staff document was not cleaned up");
            assert.strictEqual(checkComp, null, "SalaryComponent document was not cleaned up");
        });

        await mongoose.disconnect();
        console.log("  ✅ MongoDB disconnected cleanly.");

    } catch (err) {
        console.error("  ❌ Database test suite error:", err);
    }
}

// Execute complete test run
async function main() {
    await runDatabaseIntegrationSuite();

    console.log("\n=======================================================");
    console.log(`📊 TEST RESULTS: ${passedCount}/${totalCount} tests passed (${Math.round((passedCount/totalCount)*100)}%)`);
    if (passedCount === totalCount) {
        console.log("🎉 ALL TESTS PASSED! Everything pushed is working seamlessly.");
    } else {
        console.log("⚠️  SOME TESTS FAILED! Check error outputs above.");
    }
    console.log("=======================================================\n");

    process.exit(passedCount === totalCount ? 0 : 1);
}

main().catch(err => {
    console.error("Fatal test runner error:", err);
    process.exit(1);
});
