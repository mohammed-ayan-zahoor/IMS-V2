import dotenv from 'dotenv';
import path from 'path';
import assert from 'assert';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import Payslip from '../models/Payslip.js';
import Collector from '../models/Collector.js';
import Expense from '../models/Expense.js';
import ExpenseHead from '../models/ExpenseHead.js';
import User from '../models/User.js';
import Institute from '../models/Institute.js';

console.log("\n=======================================================");
console.log("🚀 PAYSLIP & DAILY FINANCIAL LEDGER INTEGRATION TEST");
console.log("   Testing: Account Master selection, Expense creation,");
console.log("   Day Book calculation & balance debit/credit lifecycle");
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

    const testTag = `test_${Date.now()}`;
    let testInstitute, testAdmin, testStaff, testCollector, testPayslip, testExpenseHead;

    try {
        await runAsyncTest("1. Setup test institute, collector account, admin, and staff user", async () => {
            testInstitute = await Institute.create({
                name: `Test Institute ${testTag}`,
                code: `TI_${Date.now() % 10000}`,
                contactEmail: `inst.${testTag}@test.internal`,
                status: 'active'
            });

            testAdmin = await User.create({
                name: "Test Admin",
                email: `admin.${testTag}@test.internal`,
                passwordHash: "dummy_hash_for_test",
                role: "admin",
                profile: { firstName: "Test", lastName: "Admin" },
                institute: testInstitute._id
            });

            testStaff = await User.create({
                name: "John Staff",
                email: `staff.${testTag}@test.internal`,
                passwordHash: "dummy_hash_for_test",
                role: "staff",
                institute: testInstitute._id,
                profile: { firstName: "John", lastName: "Staff" },
                hrDetails: { basicSalary: 30000 }
            });

            testCollector = await Collector.create({
                institute: testInstitute._id,
                name: `HDFC Bank A/C ${testTag}`,
                accountType: 'Bank',
                accountNumber: '9876543210',
                currentBalance: 100000,
                isActive: true
            });

            assert.strictEqual(testCollector.currentBalance, 100000);
            assert.strictEqual(testCollector.accountType, 'Bank');
        });

        await runAsyncTest("2. Create an unpaid test payslip", async () => {
            testPayslip = await Payslip.create({
                institute: testInstitute._id,
                staff: testStaff._id,
                month: 8,
                year: 2026,
                basicSalary: 30000,
                earnings: [{ componentName: "HRA", amount: 5000 }],
                deductions: [{ componentName: "PF", amount: 2000 }],
                netSalary: 33000,
                paymentStatus: 'unpaid',
                generatedBy: testAdmin._id
            });

            assert.strictEqual(testPayslip.paymentStatus, 'unpaid');
            assert.strictEqual(testPayslip.netSalary, 33000);
            assert.strictEqual(testPayslip.disbursedFromAccount, undefined);
        });

        await runAsyncTest("3. Mark payslip as paid via Accounts Master & verify Expense + Day Book outflow", async () => {
            const initialBalance = testCollector.currentBalance; // 100,000

            // Simulate the PATCH payslip logic
            let payrollHead = await ExpenseHead.findOne({
                institute: testInstitute._id,
                name: { $regex: /^(Faculty & Staff Payroll|Staff Salary|Salary|Payroll)$/i }
            });
            if (!payrollHead) {
                payrollHead = await ExpenseHead.create({
                    institute: testInstitute._id,
                    name: 'Faculty & Staff Payroll',
                    isActive: true,
                    createdBy: testAdmin._id
                });
            }
            testExpenseHead = payrollHead;

            const paymentDate = new Date('2026-08-31T10:00:00.000Z');
            const paymentMode = 'Bank Transfer';
            const paymentRef = 'UTR-HDFC-998877';

            // Create Expense entry (identical to PATCH route)
            const expense = await Expense.create({
                institute: testInstitute._id,
                date: paymentDate,
                expenseHead: payrollHead._id,
                amount: testPayslip.netSalary,
                description: `Salary disbursement for August 2026 (John Staff) - Ref: ${paymentRef}`,
                paidTo: "John Staff",
                paymentMode: paymentMode,
                paidByAccount: testCollector._id,
                entryBy: testAdmin._id
            });

            // Debit collector account
            await Collector.findByIdAndUpdate(testCollector._id, {
                $inc: { currentBalance: -testPayslip.netSalary }
            });

            // Update payslip
            testPayslip.paymentStatus = 'paid';
            testPayslip.paymentDate = paymentDate;
            testPayslip.paymentMode = paymentMode;
            testPayslip.disbursedFromAccount = testCollector._id;
            testPayslip.paymentReference = paymentRef;
            testPayslip.expense = expense._id;
            await testPayslip.save();

            // Verification A: Payslip updated with account and reference
            const reloadedPayslip = await Payslip.findById(testPayslip._id).populate('disbursedFromAccount');
            assert.strictEqual(reloadedPayslip.paymentStatus, 'paid');
            assert.strictEqual(reloadedPayslip.paymentReference, 'UTR-HDFC-998877');
            assert.strictEqual(reloadedPayslip.disbursedFromAccount.name, testCollector.name);

            // Verification B: Collector balance debited
            const reloadedCollector = await Collector.findById(testCollector._id);
            assert.strictEqual(reloadedCollector.currentBalance, initialBalance - 33000); // 67,000

            // Verification C: Daily Ledger query pulls this exact expense outflow for this account
            const dayStart = new Date('2026-08-31T00:00:00.000+05:30');
            const dayEnd = new Date('2026-08-31T23:59:59.999+05:30');
            const ledgerRows = await Expense.find({
                institute: testInstitute._id,
                date: { $gte: dayStart, $lte: dayEnd },
                paidByAccount: testCollector._id
            }).populate('expenseHead', 'name').populate('paidByAccount', 'name').lean();

            assert.strictEqual(ledgerRows.length, 1);
            assert.strictEqual(ledgerRows[0].amount, 33000);
            assert.strictEqual(ledgerRows[0].expenseHead.name, 'Faculty & Staff Payroll');
            assert.strictEqual(ledgerRows[0].paidByAccount.name, testCollector.name);
            assert.strictEqual(ledgerRows[0].paymentMode, 'Bank Transfer');
            assert.strictEqual(ledgerRows[0].paidTo, 'John Staff');
        });

        await runAsyncTest("4. Reverting payment to unpaid deletes Expense and restores Collector balance", async () => {
            // Simulate reverting to unpaid
            const payslip = await Payslip.findById(testPayslip._id);
            assert(payslip.expense, "Expense should be linked");

            await Expense.findByIdAndDelete(payslip.expense);
            await Collector.findByIdAndUpdate(payslip.disbursedFromAccount, {
                $inc: { currentBalance: payslip.netSalary }
            });

            payslip.paymentStatus = 'unpaid';
            payslip.paymentDate = null;
            payslip.paymentMode = null;
            payslip.disbursedFromAccount = null;
            payslip.paymentReference = null;
            payslip.expense = null;
            await payslip.save();

            // Verify Collector balance restored
            const reloadedCollector = await Collector.findById(testCollector._id);
            assert.strictEqual(reloadedCollector.currentBalance, 100000);

            // Verify Expense document is deleted
            const expDoc = await Expense.findById(testPayslip.expense);
            assert.strictEqual(expDoc, null);

            // Verify Daily Ledger query returns 0 rows now
            const dayStart = new Date('2026-08-31T00:00:00.000+05:30');
            const dayEnd = new Date('2026-08-31T23:59:59.999+05:30');
            const ledgerRows = await Expense.find({
                institute: testInstitute._id,
                date: { $gte: dayStart, $lte: dayEnd },
                paidByAccount: testCollector._id
            });
            assert.strictEqual(ledgerRows.length, 0);
        });

        await runAsyncTest("5. Deleting a paid payslip cleans up Expense and refunds account balance", async () => {
            // Mark paid again
            const expense = await Expense.create({
                institute: testInstitute._id,
                date: new Date('2026-08-31'),
                expenseHead: testExpenseHead._id,
                amount: testPayslip.netSalary,
                description: `Salary disbursement for August 2026`,
                paidTo: "John Staff",
                paymentMode: "Cash",
                paidByAccount: testCollector._id,
                entryBy: testAdmin._id
            });
            await Collector.findByIdAndUpdate(testCollector._id, {
                $inc: { currentBalance: -testPayslip.netSalary }
            });
            const payslipToPay = await Payslip.findById(testPayslip._id);
            payslipToPay.paymentStatus = 'paid';
            payslipToPay.expense = expense._id;
            payslipToPay.disbursedFromAccount = testCollector._id;
            await payslipToPay.save();

            let collBeforeDelete = await Collector.findById(testCollector._id);
            assert.strictEqual(collBeforeDelete.currentBalance, 67000);

            // Simulate DELETE endpoint logic
            const toDelete = await Payslip.findById(testPayslip._id);
            if (toDelete.expense) {
                await Expense.findByIdAndDelete(toDelete.expense);
                if (toDelete.disbursedFromAccount) {
                    await Collector.findByIdAndUpdate(toDelete.disbursedFromAccount, {
                        $inc: { currentBalance: toDelete.netSalary }
                    });
                }
            }
            await Payslip.deleteOne({ _id: toDelete._id });

            // Verify Collector balance is restored
            const collAfterDelete = await Collector.findById(testCollector._id);
            assert.strictEqual(collAfterDelete.currentBalance, 100000);

            // Verify Expense is deleted
            const expCheck = await Expense.findById(expense._id);
            assert.strictEqual(expCheck, null);

            // Verify Payslip is deleted
            const payslipCheck = await Payslip.findById(testPayslip._id);
            assert.strictEqual(payslipCheck, null);
        });

    } finally {
        console.log("\n  Cleaning up test artifacts...");
        if (testInstitute) {
            await Institute.deleteOne({ _id: testInstitute._id });
            await User.deleteMany({ institute: testInstitute._id });
            await Collector.deleteMany({ institute: testInstitute._id });
            await Expense.deleteMany({ institute: testInstitute._id });
            await ExpenseHead.deleteMany({ institute: testInstitute._id });
            await Payslip.deleteMany({ institute: testInstitute._id });
        }
        await mongoose.disconnect();
        console.log("  Cleaned up and disconnected.\n");
    }

    console.log("=======================================================");
    console.log(`📊 TEST RESULTS: ${passedCount}/${totalCount} tests passed (${Math.round(passedCount/totalCount*100)}%)`);
    if (passedCount === totalCount) {
        console.log("🎉 ALL TESTS PASSED! Payslip & Daily Ledger flow verified.");
    }
    console.log("=======================================================\n");
}

run().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
