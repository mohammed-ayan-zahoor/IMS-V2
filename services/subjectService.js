import Subject from '@/models/Subject';
import { createAuditLog } from './auditService';
import { connectDB } from '@/lib/mongodb';

export class SubjectService {
    /**
     * List subjects with optional institute scoping.
     * @param {string|null} instituteId - Scope to this institute, or null for global (super_admin).
     */
    static async getSubjects(instituteId = null, courseId = null) {
        await connectDB();

        const query = { deletedAt: null };
        if (instituteId) query.institute = instituteId;
        if (courseId) query.course = courseId;

        return Subject.find(query).populate('masterSubject').sort({ name: 1 });
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

        const { institute, name, code, description, course, masterSubject } = data;
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
            description
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
    static async assignFromLibrary(courseId, librarySubjectIds, instituteId, actorId, req = null) {
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
                description: libSub.description
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
            details: { assignedCount: results.length },
            req
        });

        return results;
    }
}
