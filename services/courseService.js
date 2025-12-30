import Course from '@/models/Course';
import Batch from '@/models/Batch';
import { createAuditLog } from './auditService';
import { connectDB } from '@/lib/mongodb';

export class CourseService {
    static async createCourse(data, actorId) {
        await connectDB();
        const course = await Course.create({ ...data, createdBy: actorId });

        await createAuditLog({
            actor: actorId,
            action: 'course.create',
            resource: { type: 'Course', id: course._id },
            details: { name: course.name, code: course.code }
        });

        return course;
    }

    static async getCourses(filters = {}) {
        await connectDB();
        // Prevent filter injection by only allowing specific top-level fields
        const allowedFilters = ['name', 'code', 'duration.unit'];
        const safeFilters = {};
        Object.keys(filters).forEach(key => {
            if (allowedFilters.includes(key)) safeFilters[key] = filters[key];
        });

        return await Course.find({ deletedAt: null, ...safeFilters })
            .populate('createdBy', 'profile.firstName profile.lastName');
    }
}

export class BatchService {
    static async createBatch(data, actorId) {
        await connectDB();
        const batch = await Batch.create({ ...data, createdBy: actorId });

        await createAuditLog({
            actor: actorId,
            action: 'batch.create',
            resource: { type: 'Batch', id: batch._id },
            details: { name: batch.name }
        });

        return batch;
    }

    static async getBatches(filters = {}) {
        await connectDB();
        const allowedFilters = ['course', 'instructor'];
        const safeFilters = {};
        Object.keys(filters).forEach(key => {
            if (allowedFilters.includes(key)) safeFilters[key] = filters[key];
        });

        const batches = await Batch.find({ deletedAt: null, ...safeFilters })
            .populate('course')
            .populate('instructor', 'profile.firstName profile.lastName')
            .sort({ 'schedule.startDate': -1 });

        return batches.map(b => b.toObject({ virtuals: true }));
    }

    static async updateBatch(id, data, actorId) {
        await connectDB();
        const batch = await Batch.findOneAndUpdate(
            { _id: id, deletedAt: null },
            { $set: data },
            { new: true }
        );

        if (!batch) throw new Error("Batch not found using id " + id);

        await createAuditLog({
            actor: actorId,
            action: 'batch.update',
            resource: { type: 'Batch', id: batch._id },
            details: { updates: Object.keys(data) }
        });

        return batch;
    }

    static async deleteBatch(id, actorId) {
        await connectDB();
        const batch = await Batch.findOneAndUpdate(
            { _id: id, deletedAt: null },
            { deletedAt: new Date() },
            { new: true }
        );

        if (!batch) throw new Error("Batch not found");

        await createAuditLog({
            actor: actorId,
            action: 'batch.delete',
            resource: { type: 'Batch', id: batch._id },
            details: { name: batch.name }
        });

        return true;
    }
}
