import MasterSubject from '@/models/MasterSubject';
import { connectDB } from '@/lib/mongodb';
import { createAuditLog } from './auditService';

export class MasterSubjectService {
    static async getMasterSubjects(instituteId) {
        await connectDB();
        return MasterSubject.find({ institute: instituteId, deletedAt: null }).sort({ name: 1 });
    }

    static async createMasterSubject(data, actorId, req = null) {
        await connectDB();
        const { institute, name, code, description } = data;
        
        const existing = await MasterSubject.findOne({ 
            institute, 
            code: code.toUpperCase(), 
            deletedAt: null 
        });
        if (existing) throw new Error("Subject code already exists in library");

        const subject = await MasterSubject.create({
            institute,
            name,
            code: code.toUpperCase(),
            description
        });

        createAuditLog({
            actor: actorId,
            action: 'masterSubject.create',
            resource: { type: 'MasterSubject', id: subject._id },
            institute,
            details: { name: subject.name, code: subject.code },
            req
        });

        return subject;
    }

    static async updateMasterSubject(id, data, actorId, scope, req = null) {
        await connectDB();
        const subject = await MasterSubject.findById(id);
        if (!subject || subject.deletedAt) throw new Error("Subject not found");

        if (!scope.isSuperAdmin && String(subject.institute) !== String(scope.instituteId)) {
            throw new Error("Unauthorized");
        }

        if (data.name) subject.name = data.name;
        if (data.code) subject.code = data.code.toUpperCase();
        if (data.description !== undefined) subject.description = data.description;

        await subject.save();

        createAuditLog({
            actor: actorId,
            action: 'masterSubject.update',
            resource: { type: 'MasterSubject', id: subject._id },
            institute: scope.instituteId,
            details: { name: subject.name, code: subject.code },
            req
        });

        return subject;
    }

    static async deleteMasterSubject(id, actorId, scope, req = null) {
        await connectDB();
        const subject = await MasterSubject.findById(id);
        if (!subject || subject.deletedAt) throw new Error("Subject not found");

        if (!scope.isSuperAdmin && String(subject.institute) !== String(scope.instituteId)) {
            throw new Error("Unauthorized");
        }

        subject.deletedAt = new Date();
        await subject.save();

        createAuditLog({
            actor: actorId,
            action: 'masterSubject.delete',
            resource: { type: 'MasterSubject', id: subject._id },
            institute: scope.instituteId,
            details: { name: subject.name, code: subject.code },
            req
        });

        return subject;
    }

    /**
     * Import multiple subjects into the library (Merge logic)
     * @param {Array} subjects - List of { name, code, description }
     * @param {Boolean} overwrite - Whether to update existing subjects
     */
    static async importMasterSubjects(instituteId, subjects, actorId, overwrite = false, req = null) {
        await connectDB();
        
        const stats = { created: 0, updated: 0, skipped: 0 };
        const results = [];

        for (const sub of subjects) {
            const { name, code, description } = sub;
            if (!name || !code) {
                stats.skipped++;
                continue;
            }

            const normalizedCode = code.trim().toUpperCase();

            // Check for existence
            const existing = await MasterSubject.findOne({
                institute: instituteId,
                code: normalizedCode,
                deletedAt: null
            });

            if (existing) {
                if (overwrite) {
                    existing.name = name.trim();
                    existing.description = description || "";
                    await existing.save();
                    stats.updated++;
                    results.push(existing);
                } else {
                    stats.skipped++;
                }
                continue;
            }

            const newSub = await MasterSubject.create({
                institute: instituteId,
                name: name.trim(),
                code: normalizedCode,
                description: description || ""
            });

            stats.created++;
            results.push(newSub);
        }

        createAuditLog({
            actor: actorId,
            action: 'masterSubject.import',
            resource: { type: 'MasterSubject', id: null },
            institute: instituteId,
            details: { ...stats },
            req
        });

        return { stats, subjects: results };
    }
}
