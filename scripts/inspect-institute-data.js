const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define minimal schemas required for inspection
const InstituteSchema = new mongoose.Schema({ name: String, code: String, type: String, status: String, isActive: Boolean, subscription: Object, limits: Object, usage: Object, branding: Object }, { strict: false });
const SessionSchema = new mongoose.Schema({ name: String, instituteId: mongoose.Schema.Types.ObjectId, startDate: Date, endDate: Date, isCurrent: Boolean, isActive: Boolean, deletedAt: Date }, { strict: false });
const CourseSchema = new mongoose.Schema({ name: String, code: String, institute: mongoose.Schema.Types.ObjectId, isActive: Boolean, deletedAt: Date }, { strict: false });
const BatchSchema = new mongoose.Schema({ name: String, code: String, institute: mongoose.Schema.Types.ObjectId, course: mongoose.Schema.Types.ObjectId, session: mongoose.Schema.Types.ObjectId, instructor: mongoose.Schema.Types.ObjectId, enrolledStudents: Array, isActive: Boolean, deletedAt: Date }, { strict: false });
const UserSchema = new mongoose.Schema({ email: String, role: String, institute: mongoose.Schema.Types.ObjectId, activeSession: mongoose.Schema.Types.ObjectId, activeSessions: Array, promotionHistory: Array, status: String, deletedAt: Date, profile: Object, enrollmentNumber: String }, { strict: false });
const MembershipSchema = new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId, institute: mongoose.Schema.Types.ObjectId, role: String, isActive: Boolean }, { strict: false });
const AttendanceSchema = new mongoose.Schema({ institute: mongoose.Schema.Types.ObjectId, batch: mongoose.Schema.Types.ObjectId, date: Date, records: Array }, { strict: false });
const ExamSchema = new mongoose.Schema({ title: String, name: String, institute: mongoose.Schema.Types.ObjectId, session: mongoose.Schema.Types.ObjectId, batch: mongoose.Schema.Types.ObjectId, course: mongoose.Schema.Types.ObjectId, date: Date, totalMarks: Number }, { strict: false });
const ExamResultSchema = new mongoose.Schema({ exam: mongoose.Schema.Types.ObjectId, student: mongoose.Schema.Types.ObjectId, marksObtained: Number, grade: String }, { strict: false });
const FeePresetSchema = new mongoose.Schema({ name: String, institute: mongoose.Schema.Types.ObjectId, course: mongoose.Schema.Types.ObjectId, totalAmount: Number, isActive: Boolean }, { strict: false });
const FeeSchema = new mongoose.Schema({ institute: mongoose.Schema.Types.ObjectId, student: mongoose.Schema.Types.ObjectId, batch: mongoose.Schema.Types.ObjectId, session: mongoose.Schema.Types.ObjectId, totalAmount: Number, paidAmount: Number, balanceAmount: Number, status: String }, { strict: false });
const EnquirySchema = new mongoose.Schema({ institute: mongoose.Schema.Types.ObjectId, name: String, status: String }, { strict: false });

const Institute = mongoose.models.Institute || mongoose.model('Institute', InstituteSchema);
const Session = mongoose.models.Session || mongoose.model('Session', SessionSchema);
const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);
const Batch = mongoose.models.Batch || mongoose.model('Batch', BatchSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Membership = mongoose.models.Membership || mongoose.model('Membership', MembershipSchema);
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
const Exam = mongoose.models.Exam || mongoose.model('Exam', ExamSchema);
const ExamResult = mongoose.models.ExamResult || mongoose.model('ExamResult', ExamResultSchema);
const FeePreset = mongoose.models.FeePreset || mongoose.model('FeePreset', FeePresetSchema);
const Fee = mongoose.models.Fee || mongoose.model('Fee', FeeSchema);
const Enquiry = mongoose.models.Enquiry || mongoose.model('Enquiry', EnquirySchema);

async function inspectInstitute(targetIdentifier) {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error("ERROR: MONGODB_URI is not set in .env.local");
        process.exit(1);
    }

    console.log(`\n=============================================================`);
    console.log(`🔎 INSTITUTION DATA AUDIT & INVENTORY INSPECTION`);
    console.log(`=============================================================`);
    console.log(`Connecting to MongoDB...`);

    try {
        await mongoose.connect(mongoUri);
        console.log(`✓ Connected successfully to database.\n`);

        const identifier = targetIdentifier || process.argv[2] || "QISJC";
        
        let institute = null;
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            institute = await Institute.findById(identifier);
        }
        if (!institute) {
            institute = await Institute.findOne({ code: identifier.toUpperCase() });
        }
        if (!institute) {
            institute = await Institute.findOne({ name: new RegExp(identifier, 'i') });
        }

        if (!institute) {
            console.error(`❌ Institute not found with identifier: "${identifier}"`);
            const all = await Institute.find().select('name code type status').limit(10);
            console.log(`\nAvailable institutes in this database (${all.length}):`);
            all.forEach(i => console.log(` - ID: ${i._id} | Code: ${i.code} | Name: ${i.name} | Type: ${i.type}`));
            process.exit(1);
        }

        const instId = institute._id;

        // 1. Core Profile
        console.log(`🏫 INSTITUTION PROFILE:`);
        console.log(`   • Name:         ${institute.name}`);
        console.log(`   • ID:           ${institute._id}`);
        console.log(`   • Code:         ${institute.code}`);
        console.log(`   • Type:         ${institute.type || 'SCHOOL'}`);
        console.log(`   • Status:       ${institute.status} (isActive: ${institute.isActive !== false})`);
        console.log(`   • Subscription: ${institute.subscription?.plan || 'N/A'} (Expires: ${institute.subscription?.endDate ? new Date(institute.subscription.endDate).toLocaleDateString() : 'N/A'})`);
        console.log(`   • Allotted:     ${institute.limits?.maxStudents || 'Unlimited'} student seats\n`);

        // 2. Academic Sessions
        const sessions = await Session.find({ instituteId: instId, deletedAt: null }).sort({ startDate: -1 });
        console.log(`📅 ACADEMIC SESSIONS (${sessions.length}):`);
        if (sessions.length === 0) {
            console.log(`   ⚠️ No sessions found for this institute!`);
        } else {
            sessions.forEach(s => {
                const start = s.startDate ? new Date(s.startDate).toISOString().slice(0, 10) : 'N/A';
                const end = s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : 'N/A';
                console.log(`   • [${s._id}] "${s.name}" | Range: ${start} → ${end} | Current: ${s.isCurrent || s.isActive ? '✅ YES' : 'NO'}`);
            });
        }
        console.log('');

        // 3. Courses / Standards
        const courses = await Course.find({ institute: instId, deletedAt: null });
        console.log(`📚 COURSES / STANDARDS (${courses.length}):`);
        courses.forEach(c => console.log(`   • [${c._id}] ${c.name} (${c.code || 'No code'})`));
        console.log('');

        // 4. Batches / Sections
        const batches = await Batch.find({ institute: instId, deletedAt: null });
        console.log(`👥 BATCHES / SECTIONS (${batches.length}):`);
        let totalBatchEnrollments = 0;
        batches.forEach(b => {
            const activeCount = (b.enrolledStudents || []).filter(e => e.status === 'active').length;
            const totalCount = (b.enrolledStudents || []).length;
            totalBatchEnrollments += activeCount;
            console.log(`   • [${b._id}] "${b.name}" | Session: ${b.session || 'NONE'} | Active Students: ${activeCount} (Total: ${totalCount})`);
        });
        console.log(`   👉 Total active batch enrollments: ${totalBatchEnrollments}\n`);

        // 5. Students Breakdown
        const students = await User.find({ institute: instId, role: 'student', deletedAt: null });
        const activeStudents = students.filter(s => s.status === 'ACTIVE' || !s.status);
        const completedStudents = students.filter(s => s.status === 'COMPLETED');
        const droppedStudents = students.filter(s => s.status === 'DROPPED');
        const withPromotionHistory = students.filter(s => (s.promotionHistory || []).length > 0);
        const withActiveSession = students.filter(s => s.activeSession);

        console.log(`🎓 STUDENTS SUMMARY (${students.length} total in User collection):`);
        console.log(`   • Active Status:        ${activeStudents.length}`);
        console.log(`   • Completed Status:     ${completedStudents.length}`);
        console.log(`   • Dropped Status:       ${droppedStudents.length}`);
        console.log(`   • Has activeSession:    ${withActiveSession.length} / ${students.length}`);
        console.log(`   • Has Promotion History:${withPromotionHistory.length} / ${students.length}`);
        console.log('');

        // 6. Faculty & Staff
        const staffUsers = await User.find({ institute: instId, role: { $in: ['admin', 'instructor', 'staff', 'super_admin'] }, deletedAt: null });
        console.log(`👔 FACULTY & STAFF (${staffUsers.length}):`);
        staffUsers.forEach(u => {
            const name = u.profile ? `${u.profile.firstName || ''} ${u.profile.lastName || ''}`.trim() : 'Unnamed';
            console.log(`   • ${u.email} | Role: ${u.role} | Name: ${name}`);
        });
        console.log('');

        // 7. Attendance Records
        const attendanceCount = await Attendance.countDocuments({ institute: instId });
        const firstAttendance = await Attendance.findOne({ institute: instId }).sort({ date: 1 });
        const lastAttendance = await Attendance.findOne({ institute: instId }).sort({ date: -1 });
        console.log(`📋 ATTENDANCE LOGS:`);
        console.log(`   • Total Recorded Days/Logs: ${attendanceCount}`);
        if (attendanceCount > 0) {
            console.log(`   • First Date: ${firstAttendance?.date ? new Date(firstAttendance.date).toISOString().slice(0, 10) : 'N/A'}`);
            console.log(`   • Latest Date: ${lastAttendance?.date ? new Date(lastAttendance.date).toISOString().slice(0, 10) : 'N/A'}`);
        }
        console.log('');

        // 8. Exams & Marksheets
        const examCount = await Exam.countDocuments({ institute: instId });
        const exams = await Exam.find({ institute: instId }).limit(10);
        const resultCount = await ExamResult.countDocuments({
            exam: { $in: await Exam.find({ institute: instId }).distinct('_id') }
        });
        console.log(`📝 EXAMS & MARKSHEETS:`);
        console.log(`   • Total Exams Created:      ${examCount}`);
        exams.forEach(e => console.log(`     - [${e._id}] ${e.title || e.name} | Total Marks: ${e.totalMarks || 100} | Date: ${e.date ? new Date(e.date).toISOString().slice(0, 10) : 'N/A'}`));
        console.log(`   • Total Student Marksheets: ${resultCount}\n`);

        // 9. Fees & Collections
        const feePresets = await FeePreset.find({ institute: instId, deletedAt: null });
        const fees = await Fee.find({ institute: instId, deletedAt: null });
        const totalInvoiced = fees.reduce((sum, f) => sum + (f.totalAmount || 0), 0);
        const totalCollected = fees.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
        const totalBalance = fees.reduce((sum, f) => sum + (f.balanceAmount || 0), 0);

        console.log(`💰 FEE MANAGEMENT:`);
        console.log(`   • Fee Presets Configured:   ${feePresets.length}`);
        feePresets.forEach(p => console.log(`     - ${p.name}: ₹${p.totalAmount || 0}`));
        console.log(`   • Total Student Invoices:   ${fees.length}`);
        console.log(`   • Total Invoiced Amount:    ₹${totalInvoiced.toLocaleString('en-IN')}`);
        console.log(`   • Total Collected Amount:   ₹${totalCollected.toLocaleString('en-IN')}`);
        console.log(`   • Total Outstanding Balance:₹${totalBalance.toLocaleString('en-IN')}\n`);

        // 10. Enquiries
        const enquiryCount = await Enquiry.countDocuments({ institute: instId });
        console.log(`📞 ENQUIRIES: ${enquiryCount} leads recorded.\n`);

        // 11. Diagnostic Assessment for Year-End Simulation
        console.log(`=============================================================`);
        console.log(`🎯 YEAR-END SIMULATION READINESS ASSESSMENT:`);
        console.log(`=============================================================`);
        
        const recommendations = [];
        if (sessions.length < 2) {
            recommendations.push(`Need at least 2 Academic Sessions (e.g. Completed "2024-2025" and Target "2025-2026") to test year-over-year promotion and rollover.`);
        }
        if (attendanceCount < 100) {
            recommendations.push(`Sparse attendance: ~180 academic days needed across terms (Term 1 & Term 2) for realistic holistic student report cards.`);
        }
        if (examCount < 3) {
            recommendations.push(`Need full exam spectrum: (1) Unit Tests, (2) Mid-Term Exams, (3) Annual Final Exams across all standards with grades.`);
        }
        if (feePresets.length === 0 || fees.length < 50) {
            recommendations.push(`Need complete fee ledgers: Configure Term fees with partial payments and unpaid arrears to test carry-forward fee logic upon promotion.`);
        }
        if (staffUsers.filter(u => u.role === 'instructor').length < 3) {
            recommendations.push(`Need assigned faculty/instructors per class/batch for teacher attendance and course coverage.`);
        }

        if (recommendations.length === 0) {
            console.log(`✅ Fully equipped for year-end simulation and student promotion tests!`);
        } else {
            console.log(`⚠️ GAPS IDENTIFIED FOR FULL-YEAR SIMULATION:`);
            recommendations.forEach((r, i) => console.log(`   ${i + 1}. ${r}`));
        }
        console.log(`=============================================================\n`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("Inspection failed with error:", err);
        process.exit(1);
    }
}

inspectInstitute();
