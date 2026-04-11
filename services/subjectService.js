import Subject from '@/models/Subject';
import { createAuditLog } from './auditService';
import { connectDB } from '@/lib/mongodb';

export class SubjectService {
    /**
     * List subjects with optional institute scoping.
     * @param {string|null} instituteId - Scope to this institute, or null for global (super_admin).
     */
    static async getSubjects(instituteId = null) {
        await connectDB();

        const query = { deletedAt: null };
        if (instituteId) query.institute = instituteId;

        return Subject.find(query).sort({ name: 1 });
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

        const { institute, name, code, description } = data;
        if (!institute) throw new Error("Institute context missing");
        if (!name || !code) throw new Error("Name and code are required");

        const normalizedCode = code.toUpperCase();

        // Check uniqueness within the institute
        const existing = await Subject.findOne({
            institute,
            code: normalizedCode,
            deletedAt: null
        });

        if (existing) {
            throw new Error("Subject code already exists");
        }

        const subject = await Subject.create({
            institute,
            name,
            code: normalizedCode,
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
}
