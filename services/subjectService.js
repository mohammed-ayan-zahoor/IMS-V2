import Subject from '@/models/Subject';
import '@/models/MasterSubject'; // Register for populate
import '@/models/Department'; // Register for populate
import { createAuditLog } from './auditService';
import { connectDB } from '@/lib/mongodb';

export class SubjectService {
    /**
     * List subjects with optional institute scoping and semester filtering.
     * @param {string|null} instituteId - Scope to this institute, or null for global (super_admin).
     * @param {string|null} courseId - Scope to this course.
     * @param {number|null} semester - Scope to this semester.
     */
    static async getSubjects(instituteId = null, courseId = null, semester = null) {
        await connectDB();

        const query = { deletedAt: null };
        if (instituteId) query.institute = instituteId;
        if (courseId) query.course = courseId;
        if (semester) query.semester = Number(semester);

        return Subject.find(query)
            .populate('masterSubject')
            .populate('department', 'name code')
            .sort({ semester: 1, name: 1 });
    }

    /**
     * Get a single subject by ID.
     */
    static async getSubjectById(id, instituteId = null) {
        await connectDB();
        const query = { _id: id, deletedAt: null };
        if (instituteId) query.institute = instituteId;
        return Subject.findOne(query).lean();
    }


    /**
     * Create a new subject.
     */
    static async createSubject(data, actorId, req = null) {
        await connectDB();

        const {
            institute, name, code, description, course, masterSubject,
            semester, credits, subjectType, department,
            lectureHours, tutorialHours, practicalHours
        } = data;
        if (!institute) throw new Error("Institute context missing");
        if (!name || !code) throw new Error("Name and code are required");

        const normalizedCode = code.toUpperCase();

        // Check uniqueness within the course (if provided)
        if (course) {
            const existing = await Subject.findOne({
                course,
                code: normalizedCode,
                deletedAt: null
            });
            if (existing) throw new Error("Subject code already exists in this class");
        }

        const subject = await Subject.create({
            institute,
            name,
            code: normalizedCode,
            course,
            masterSubject,
            description,
            semester: semester ? Number(semester) : null,
            credits: credits !== undefined && credits !== null && credits !== '' ? Number(credits) : null,
            subjectType: subjectType || 'THEORY',
            department: department || null,
            lectureHours: lectureHours ? Number(lectureHours) : null,
            tutorialHours: tutorialHours ? Number(tutorialHours) : null,
            practicalHours: practicalHours ? Number(practicalHours) : null
        });

        // Fire-and-forget audit log
        createAuditLog({
            actor: actorId,
            action: 'subject.create',
            resource: { type: 'Subject', id: subject._id },
            institute,
            details: { name: subject.name, code: subject.code },
            req
        });

        return subject;
    }

    /**
     * Update an existing subject.
     */
    static async updateSubject(id, data, actorId, scope, req = null) {
        await connectDB();

        const subject = await Subject.findById(id);
        if (!subject || subject.deletedAt) {
            throw new Error("Subject not found");
        }

        // Institute access check
        if (!scope.isSuperAdmin && String(subject.institute) !== String(scope.instituteId)) {
            throw new Error("Unauthorized");
        }

        if (data.name) subject.name = data.name;
        if (data.code) subject.code = data.code.toUpperCase();
        if (data.description !== undefined) subject.description = data.description;
        if (data.semester !== undefined) subject.semester = data.semester ? Number(data.semester) : null;
        if (data.credits !== undefined) subject.credits = data.credits !== null && data.credits !== '' ? Number(data.credits) : null;
        if (data.subjectType !== undefined) subject.subjectType = data.subjectType;
        if (data.department !== undefined) subject.department = data.department || null;
        if (data.lectureHours !== undefined) subject.lectureHours = data.lectureHours ? Number(data.lectureHours) : null;
        if (data.tutorialHours !== undefined) subject.tutorialHours = data.tutorialHours ? Number(data.tutorialHours) : null;
        if (data.practicalHours !== undefined) subject.practicalHours = data.practicalHours ? Number(data.practicalHours) : null;

        await subject.save();

        createAuditLog({
            actor: actorId,
            action: 'subject.update',
            resource: { type: 'Subject', id: subject._id },
            institute: scope.instituteId,
            details: { name: subject.name, code: subject.code },
            req
        });

        return subject;
    }

    /**
     * Soft-delete a subject.
     */
    static async deleteSubject(id, actorId, scope, req = null) {
        await connectDB();

        const subject = await Subject.findById(id);
        if (!subject || subject.deletedAt) {
            throw new Error("Subject not found");
        }

        if (!scope.isSuperAdmin && String(subject.institute) !== String(scope.instituteId)) {
            throw new Error("Unauthorized");
        }

        subject.deletedAt = new Date();
        await subject.save();

        // Also remove from course.subjects if associated
        if (subject.course) {
            const Course = (await import('@/models/Course')).default;
            await Course.findByIdAndUpdate(subject.course, {
                $pull: { subjects: subject._id }
            });
        }

        createAuditLog({
            actor: actorId,
            action: 'subject.delete',
            resource: { type: 'Subject', id: subject._id },
            institute: scope.instituteId,
            details: { name: subject.name, code: subject.code },
            req
        });

        return subject;
    }

    /**
     * Assign multiple subjects from library to a course.
     */
    static async assignFromLibrary(courseId, librarySubjectIds, instituteId, actorId, req = null, extraData = {}) {
        await connectDB();
        
        const MasterSubject = (await import('@/models/MasterSubject')).default;
        const Course = (await import('@/models/Course')).default;

        const course = await Course.findById(courseId);
        if (!course) throw new Error("Class not found");

        const results = [];
        for (const libId of librarySubjectIds) {
            const libSub = await MasterSubject.findById(libId);
            if (!libSub) continue;

            // Check if already assigned
            const existing = await Subject.findOne({
                course: courseId,
                masterSubject: libId,
                deletedAt: null
            });

            if (existing) continue;

            const newSub = await Subject.create({
                institute: instituteId,
                course: courseId,
                masterSubject: libId,
                name: libSub.name,
                code: libSub.code,
                description: libSub.description,
                semester: extraData.semester ? Number(extraData.semester) : null,
                credits: extraData.credits !== undefined && extraData.credits !== null && extraData.credits !== '' ? Number(extraData.credits) : null,
                subjectType: extraData.subjectType || 'THEORY',
                department: extraData.department || null
            });

            // Update course subjects list
            if (!course.subjects.includes(newSub._id)) {
                course.subjects.push(newSub._id);
            }

            results.push(newSub);
        }

        await course.save();

        createAuditLog({
            actor: actorId,
            action: 'course.assignSubjects',
            resource: { type: 'Course', id: courseId },
            institute: instituteId,
            details: { assignedCount: results.length, semester: extraData.semester || null },
            req
        });

        return results;
    }
}
