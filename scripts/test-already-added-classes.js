/**
 * Ponytail Verification Script for Already-Added Classes & Batches
 * Simulates pre-existing/legacy data before push:
 * - A class created earlier with fees = 0
 * - A batch created with session = null, enrolledStudents = []
 * - A student created with admissionStd pointing to the class, but not enrolled in the batch
 *
 * Verifies that:
 * 1. BatchService.getBatches auto-heals batch session to active session.
 * 2. StudentService.getStudents auto-heals student enrollment in Section A and sets activeSession.
 * 3. Filtering by Class returns the student.
 * 4. Filtering by Section returns the student.
 * 5. Everything cleans up afterwards.
 */

const mongoose = require('mongoose');
const assert = require('assert');
require('dotenv').config({ path: '.env.local' });

async function run() {
    console.log("=== Testing Already Added Classes Self-Healing After Push ===");
    await mongoose.connect(process.env.MONGODB_URI);

    const instId = new mongoose.Types.ObjectId("6ac9bec8b777381406e0537d");

    // Import real schemas
    const Session = (await import('../models/Session.js')).default;
    const Course = (await import('../models/Course.js')).default;
    const Batch = (await import('../models/Batch.js')).default;
    const User = (await import('../models/User.js')).default;

    const activeSession = await Session.findOne({ instituteId: instId, isActive: true }).lean();
    assert(activeSession, "Active session must exist");

    // 1. Simulate an "already added class before push"
    const testCourseName = `LegacyClass_${Date.now()}`;
    const legacyCourse = await Course.create({
        name: testCourseName,
        code: `LEG${Date.now().toString().slice(-4)}`,
        institute: instId,
        duration: { value: 12, unit: "months" },
        fees: { amount: 0, currency: "INR" },
        createdBy: new mongoose.Types.ObjectId()
    });
    console.log("✔ Created legacy course with 0 fee:", legacyCourse._id);

    // 2. Simulate a section created with session = null (as occurred before fix)
    const legacyBatch = await Batch.create({
        name: "Section A",
        course: legacyCourse._id,
        capacity: 40,
        session: null, // Legacy state!
        institute: instId,
        createdBy: new mongoose.Types.ObjectId(),
        schedule: { startDate: new Date() },
        enrolledStudents: [] // Empty because auto-enrollment failed previously!
    });
    console.log("✔ Created legacy batch with session: null and 0 enrolled students:", legacyBatch._id);

    // 3. Simulate a student added to this class before push
    const legacyStudent = await User.create({
        email: `legacystudent_${Date.now()}@example.com`,
        passwordHash: "test_password_hash",
        role: "student",
        institute: instId,
        admissionStd: legacyCourse._id.toString(),
        activeSession: null, // Missing active session
        activeSessions: [],
        profile: { firstName: "Legacy", lastName: "Student" }
    });
    console.log("✔ Created legacy student with admissionStd but no batch enrollment:", legacyStudent._id);

    // 4. Test BatchService.getBatches with course and session filters (and auto-heal)
    const { BatchService } = await import('../services/courseService.js');
    const batchesResult = await BatchService.getBatches({
        course: legacyCourse._id.toString(),
        session: activeSession._id.toString()
    }, instId.toString());

    assert(batchesResult.length >= 1, "Legacy batch must be returned by getBatches even if created with session: null");
    console.log("✔ getBatches successfully found legacy batch with course and session filter");

    // Check that batch was auto-healed in DB
    const healedBatch = await Batch.findById(legacyBatch._id).lean();
    assert(healedBatch.session, "Legacy batch should have its session auto-healed");
    assert.strictEqual(healedBatch.session.toString(), activeSession._id.toString(), "Healed session must match active session");
    console.log("✔ Batch auto-healed to active session:", healedBatch.session);

    // 5. Test StudentService.getStudents filtering by Course ID (Class filter)
    const { StudentService } = await import('../services/studentService.js');
    const studentsByClass = await StudentService.getStudents({
        instituteId: instId.toString(),
        sessionId: activeSession._id.toString(),
        courseId: legacyCourse._id.toString(),
        instituteType: 'SCHOOL',
        skipSessionValidation: true
    });

    console.log(`✔ Filter by Class '${testCourseName}' returned ${studentsByClass.students.length} students`);
    assert.strictEqual(studentsByClass.students.length, 1, "Must return the legacy student");
    assert.strictEqual(studentsByClass.students[0]._id.toString(), legacyStudent._id.toString());

    // Check that student was auto-enrolled in Section A and student's activeSession was set
    const batchAfterClassQuery = await Batch.findById(legacyBatch._id).lean();
    assert(batchAfterClassQuery.enrolledStudents.length >= 1, "Student must be auto-enrolled into Section A");
    const isEnrolled = batchAfterClassQuery.enrolledStudents.some(e => e.student.toString() === legacyStudent._id.toString());
    assert(isEnrolled, "Legacy student must now be in enrolledStudents of Section A");
    console.log("✔ Legacy student auto-enrolled in Section A on class query");

    // 6. Test StudentService.getStudents filtering by Batch ID (Section filter)
    const studentsBySection = await StudentService.getStudents({
        instituteId: instId.toString(),
        sessionId: activeSession._id.toString(),
        batchId: legacyBatch._id.toString(),
        instituteType: 'SCHOOL',
        skipSessionValidation: true
    });

    console.log(`✔ Filter by Section A returned ${studentsBySection.students.length} students`);
    assert.strictEqual(studentsBySection.students.length, 1, "Must return the student when filtering by Section A");
    assert.strictEqual(studentsBySection.students[0]._id.toString(), legacyStudent._id.toString());

    // 7. Cleanup test data
    await Course.findByIdAndDelete(legacyCourse._id);
    await Batch.findByIdAndDelete(legacyBatch._id);
    await User.findByIdAndDelete(legacyStudent._id);
    console.log("✔ Cleaned up test data");

    console.log("\n========================================================");
    console.log("ALL ALREADY-ADDED CLASSES / LEGACY VERIFICATIONS PASSED!");
    console.log("========================================================\n");

    await mongoose.disconnect();
    process.exit(0);
}

run().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
