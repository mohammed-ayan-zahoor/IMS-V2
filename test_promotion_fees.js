const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const User = require('./models/User.js').default;
const Batch = require('./models/Batch.js').default;
const Institute = require('./models/Institute.js').default;
const Session = require('./models/Session.js').default;
const FeePreset = require('./models/FeePreset.js').default;
const Fee = require('./models/Fee.js').default;
const Course = require('./models/Course.js').default;

async function testPromotionWithFees() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✓ Connected to DB\n");

        // 1. Find test data
        const institute = await Institute.findOne({ deletedAt: null }).lean();
        if (!institute) {
            console.log("✗ No institute found");
            return;
        }
        console.log(`✓ Found institute: ${institute.name} (${institute._id})`);

        // 2. Get or create active session
        let session = await Session.findOne({ 
            instituteId: institute._id,
            isActive: true,
            deletedAt: null
        });
        
        if (!session) {
            console.log("! No active session. Creating test session...");
            const now = new Date();
            const endDate = new Date(now);
            endDate.setFullYear(endDate.getFullYear() + 1);
            
            session = await Session.create({
                instituteId: institute._id,
                sessionName: "25-26",
                startDate: now,
                endDate: endDate,
                isActive: true
            });
        }
        console.log(`✓ Using session: ${session.sessionName}`);

        // 3. Find a course
        let course = await Course.findOne({ 
            institute: institute._id,
            deletedAt: null 
        });
        
        if (!course) {
            console.log("! Creating test course...");
            course = await Course.create({
                institute: institute._id,
                name: "Test Course",
                code: "TST001",
                createdBy: new mongoose.Types.ObjectId(),
                fees: { amount: 5000 }
            });
        }
        console.log(`✓ Using course: ${course.name}`);

        // 4. Get or create fee preset
        let feePreset = await FeePreset.findOne({
            institute: institute._id,
            course: course._id,
            isActive: true,
            deletedAt: null
        });
        
        if (!feePreset) {
            console.log("! Creating test fee preset...");
            feePreset = await FeePreset.create({
                institute: institute._id,
                course: course._id,
                name: "Standard Preset",
                amount: 5000,
                description: "Standard fee preset",
                category: 'general',
                complexity: 'standard',
                isActive: true
            });
        }
        console.log(`✓ Using fee preset: ${feePreset.name} (₹${feePreset.amount})\n`);

        // 5. Create test batches
        const batch1 = await Batch.create({
            institute: institute._id,
            session: session._id,
            course: course._id,
            name: `Test Batch 1 - ${Date.now()}`,
            schedule: {
                startDate: new Date(),
                endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            },
            createdBy: new mongoose.Types.ObjectId()
        });

        const batch2 = await Batch.create({
            institute: institute._id,
            session: session._id,
            course: course._id,
            name: `Test Batch 2 (Promotion Target) - ${Date.now()}`,
            schedule: {
                startDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
            },
            createdBy: new mongoose.Types.ObjectId()
        });

        console.log(`📚 Created Test Batches:`);
        console.log(`  - Batch 1 (Current): ${batch1.name}`);
        console.log(`  - Batch 2 (Target): ${batch2.name}\n`);

        // 6. Find test students
        let testStudents = await User.find({
            institute: institute._id,
            role: 'student',
            deletedAt: null
        }).limit(2);

        if (testStudents.length < 2) {
            console.log("✗ Not enough students found for testing");
            return;
        }

        console.log(`👥 Test Students:`);
        testStudents.forEach(s => {
            console.log(`  - ${s.profile?.firstName} ${s.profile?.lastName} (${s._id})`);
        });

        // 7. Enroll students in batch1
        for (const student of testStudents) {
            batch1.enrolledStudents.push({
                student: student._id,
                enrolledAt: new Date(),
                status: 'active'
            });
        }
        await batch1.save();
        console.log(`✓ Enrolled students in Batch 1\n`);

        // 8. Check for existing fees before promotion
        const feesBeforePromotion = await Fee.find({
            student: { $in: testStudents.map(s => s._id) },
            batch: batch2._id
        });
        console.log(`📊 Fees in Batch 2 BEFORE promotion: ${feesBeforePromotion.length}\n`);

        // 9. Test fee creation via FeeService
        console.log(`🚀 Simulating Promotion with Auto-Fee Creation:\n`);

        const FeeService = require('./services/feeService.js').FeeService;
        const mockAdminId = new mongoose.Types.ObjectId();

        let feesCreated = 0;
        for (const student of testStudents) {
            try {
                console.log(`→ Creating fee for ${student.profile?.firstName}...`);
                const fee = await FeeService.createFeeFromPreset({
                    student: student._id,
                    batch: batch2._id,
                    preset: feePreset,
                    institute: institute._id,
                    session: session._id,
                    numInstallments: 3
                }, mockAdminId);

                console.log(`  ✓ Successfully created fee (ID: ${fee._id})`);
                console.log(`    • Total Amount: ₹${fee.totalAmount}`);
                console.log(`    • Status: ${fee.status}`);
                console.log(`    • Installments: ${fee.installments.length}`);
                fee.installments.forEach((inst, idx) => {
                    const dueDate = new Date(inst.dueDate);
                    console.log(`      [${idx + 1}] ₹${inst.amount.toFixed(2)} - Due: ${dueDate.toLocaleDateString()}`);
                });
                feesCreated++;
                console.log();
            } catch (err) {
                console.log(`  ✗ Error: ${err.message}\n`);
            }
        }

        // 10. Query and display created fees
        const createdFees = await Fee.find({
            batch: batch2._id,
            student: { $in: testStudents.map(s => s._id) }
        }).populate('student', 'profile.firstName profile.lastName').populate('batch', 'name').populate('feePreset', 'name amount');

        console.log(`\n✅ Test Complete!\n`);
        console.log(`📊 Results:`);
        console.log(`  • Students Promoted: ${testStudents.length}`);
        console.log(`  • Fees Created: ${feesCreated}`);
        console.log(`  • Fees in Database: ${createdFees.length}`);
        
        if (createdFees.length > 0) {
            console.log(`\n📋 Fees Created in Target Batch (${batch2.name}):`);
            console.log(`${'─'.repeat(80)}`);
            createdFees.forEach((fee, idx) => {
                console.log(`${idx + 1}. Student: ${fee.student.profile?.firstName} ${fee.student.profile?.lastName}`);
                console.log(`   Fee Amount: ₹${fee.totalAmount} | Preset: ${fee.feePreset?.name}`);
                console.log(`   Status: ${fee.status} | Created: ${new Date(fee.createdAt).toLocaleDateString()}`);
                console.log();
            });
        }

        console.log(`✨ Promotion with auto-fee creation working correctly!`);

    } catch (err) {
        console.error("✗ Error:", err.message);
    } finally {
        await mongoose.disconnect();
        console.log("\n✓ Disconnected from DB");
    }
}

testPromotionWithFees();
