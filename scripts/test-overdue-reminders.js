import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables before any other imports execute
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Dynamic imports to prevent hoisting-related environment resolution failures
const { connectDB } = await import('../lib/mongodb.js');
const Institute = (await import('../models/Institute.js')).default;
const User = (await import('../models/User.js')).default;
const Fee = (await import('../models/Fee.js')).default;
const VoiceCallLog = (await import('../models/VoiceCallLog.js')).default;
const { processOverdueReminders } = await import('../services/overdueReminderService.js');

async function runTest() {
    try {
        console.log("=== STARTING VOICE CALL REMINDERS VERIFICATION TEST ===");
        await connectDB();

        // 1. Get or create an active test institute
        let institute = await Institute.findOne({ isActive: true });
        if (!institute) {
            console.log("No active institute found. Seeding a mock institute...");
            institute = await Institute.create({
                name: "Test Evergreen Academy",
                contactEmail: "admin@testevergreen.edu",
                code: "TEST_EVERGREEN",
                status: "active",
                isActive: true,
                type: "SCHOOL"
            });
        }

        // Force enable voice reminders and set provider to mock for safe testing
        // Set quota to 1 to test quota enforcement
        institute.notifications = {
            smsProvider: 'mock',
            whatsappProvider: 'mock',
            voiceCallProvider: 'mock',
            overdueVoiceReminderEnabled: true
        };
        institute.usage = {
            studentCount: 1,
            adminCount: 1,
            courseCount: 1,
            storageUsedGB: 0,
            voiceCallsSent: 0,
            voiceCallsQuota: 1
        };
        await institute.save();
        console.log(`[Test Setup] Configured Institute: "${institute.name}" | Voice: Enabled (Mock) | Quota: 0/1`);

        // 2. Get or create a test student
        let student = await User.findOne({ role: 'student', institute: institute._id });
        if (!student) {
            console.log("No student found for institute. Seeding a mock student...");
            student = await User.create({
                institute: institute._id,
                email: `teststudent_${Date.now()}@example.com`,
                passwordHash: "mock_password_hash",
                role: "student",
                profile: {
                    firstName: "Rahul",
                    lastName: "Sharma",
                    phone: "+919876543210"
                },
                status: "ACTIVE"
            });
        } else {
            // Ensure student has a phone number
            student.profile.phone = "+919876543210";
            await student.save();
        }
        console.log(`[Test Setup] Configured Student: "${student.profile.firstName} ${student.profile.lastName}" | Phone: ${student.profile.phone}`);

        // 3. Create mock fee structures
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        // Remove existing test fees and call logs for clean slate
        await Fee.deleteMany({ student: student._id });
        await VoiceCallLog.deleteMany({ institute: institute._id });

        // Fee 1: Triggered when usage (0) < quota (1)
        const fee1 = await Fee.create({
            institute: institute._id,
            student: student._id,
            batch: new mongoose.Types.ObjectId(), // Mock batch ID
            totalAmount: 5000,
            balanceAmount: 2500,
            paidAmount: 2500,
            status: "overdue",
            installments: [
                {
                    amount: 2500,
                    dueDate: new Date(yesterday.setHours(12, 0, 0, 0)),
                    status: 'pending' // Due yesterday and pending -> Overdue today!
                }
            ]
        });
        console.log(`[Test Setup] Created Fee 1 with installment due yesterday.`);

        // RUN 1: Within Quota
        console.log("\n[Test Run 1] Triggering reminders (Usage: 0 / Quota: 1)...");
        await processOverdueReminders();

        // VERIFY RUN 1
        console.log("\n[Test Verification 1] Checking database states...");
        const updatedFee1 = await Fee.findById(fee1._id);
        const inst1 = updatedFee1.installments[0];
        const updatedInst1 = await Institute.findById(institute._id);
        const logs1 = await VoiceCallLog.find({ institute: institute._id });

        console.log(`* Installment 1 voiceReminderSentAt: ${inst1.voiceReminderSentAt ? inst1.voiceReminderSentAt.toISOString() : 'MISSING'}`);
        console.log(`* Institute voiceCallsSent counter: ${updatedInst1.usage.voiceCallsSent} (Expected: 1)`);
        console.log(`* Logs Count: ${logs1.length} (Expected: 1)`);

        const run1Passed = inst1.voiceReminderSentAt && updatedInst1.usage.voiceCallsSent === 1 && logs1.length === 1 && logs1[0].status === 'success';
        console.log(`* Run 1 Result: ${run1Passed ? 'PASSED' : 'FAILED'}`);

        // Fee 2: Triggered when usage (1) >= quota (1) -> Should be skipped!
        const fee2 = await Fee.create({
            institute: institute._id,
            student: student._id,
            batch: new mongoose.Types.ObjectId(), // Mock batch ID
            totalAmount: 3000,
            balanceAmount: 1500,
            paidAmount: 1500,
            status: "overdue",
            installments: [
                {
                    amount: 1500,
                    dueDate: new Date(yesterday.setHours(12, 0, 0, 0)),
                    status: 'pending' // Due yesterday and pending -> Overdue today!
                }
            ]
        });
        console.log(`\n[Test Setup] Created Fee 2 with installment due yesterday.`);

        // RUN 2: Quota Exceeded
        console.log("\n[Test Run 2] Triggering reminders (Usage: 1 / Quota: 1)...");
        await processOverdueReminders();

        // VERIFY RUN 2
        console.log("\n[Test Verification 2] Checking database states...");
        const updatedFee2 = await Fee.findById(fee2._id);
        const inst2 = updatedFee2.installments[0];
        const updatedInst2 = await Institute.findById(institute._id);
        const logs2 = await VoiceCallLog.find({ institute: institute._id });

        console.log(`* Installment 2 voiceReminderSentAt: ${inst2.voiceReminderSentAt ? inst2.voiceReminderSentAt.toISOString() : 'MISSING (Correct: Skipped due to quota)'}`);
        console.log(`* Institute voiceCallsSent counter: ${updatedInst2.usage.voiceCallsSent} (Expected: 1 - unchanged)`);
        console.log(`* Logs Count: ${logs2.length} (Expected: 1 - unchanged)`);

        const run2Passed = !inst2.voiceReminderSentAt && updatedInst2.usage.voiceCallsSent === 1 && logs2.length === 1;
        console.log(`* Run 2 Result: ${run2Passed ? 'PASSED' : 'FAILED'}`);

        const isSuccess = run1Passed && run2Passed;
        console.log(`\n=== OVERALL TEST RESULT: ${isSuccess ? 'PASSED' : 'FAILED'} ===`);

        // Cleanup test data
        await Fee.deleteMany({ student: student._id });
        await VoiceCallLog.deleteMany({ institute: institute._id });
        
    } catch (err) {
        console.error("Test execution failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
