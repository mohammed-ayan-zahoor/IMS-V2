import Course from '@/models/Course';
import Batch from '@/models/Batch';
import { createAuditLog } from './auditService';
import { connectDB } from '@/lib/mongodb';

export class CourseService {
    static async createCourse(data, actorId) {
        await connectDB();
        const { institute } = data;
        if (!institute) throw new Error("Institute context missing");

        const course = await Course.create({ ...data, createdBy: actorId });

        await createAuditLog({
            actor: actorId,
            action: 'course.create',
            resource: { type: 'Course', id: course._id },
            institute: institute,
            details: { name: course.name, code: course.code }
        });

        return course;
    }

    static async getCourses(filters = {}, instituteId) {
        if (!instituteId) throw new Error("Institute context missing");
        await connectDB();
        // Prevent filter injection by only allowing specific top-level fields
        const allowedFilters = ['name', 'code', 'duration.unit'];
        const safeFilters = {};
        Object.keys(filters).forEach(key => {
            if (allowedFilters.includes(key)) safeFilters[key] = filters[key];
        });

        return await Course.find({ deletedAt: null, institute: instituteId, ...safeFilters })
            .populate('createdBy', 'profile.firstName profile.lastName');
    }
}

export class BatchService {
    static async createBatch(data, actorId) {
        await connectDB();
        const { institute } = data;
        if (!institute) throw new Error("Institute context missing");

        const batch = await Batch.create({ ...data, createdBy: actorId });

        await createAuditLog({
            actor: actorId,
            action: 'batch.create',
            resource: { type: 'Batch', id: batch._id },
            institute: institute,
            details: { name: batch.name }
        });

        return batch;
    }

    static async getBatches(filters = {}, instituteId) {
        if (!instituteId) throw new Error("Institute context missing");
        await connectDB();
        const allowedFilters = ['course', 'instructor'];
        const safeFilters = {};
        Object.keys(filters).forEach(key => {
            if (allowedFilters.includes(key)) safeFilters[key] = filters[key];
        });

        const batches = await Batch.find({ deletedAt: null, institute: instituteId, ...safeFilters })
            .populate('course')
            .populate('instructor', 'profile.firstName profile.lastName')
            .sort({ 'schedule.startDate': -1 });

        return batches.map(b => b.toObject({ virtuals: true }));
    }

    static async getBatchById(id, instituteId) {
        if (!instituteId) throw new Error("Institute context missing");
        await connectDB();
        const batch = await Batch.findOne({ _id: id, deletedAt: null, institute: instituteId })
            .populate('course')
            .populate('enrolledStudents.student', 'profile.firstName profile.lastName enrollmentNumber');

        if (!batch) return null;
        return batch.toObject({ virtuals: true });
    }
    static async updateBatch(id, data, actorId, actorInstituteId) {
        await connectDB();

        let instituteId = actorInstituteId;
        if (!instituteId) {
            const User = (await import('@/models/User')).default;
            const user = await User.findById(actorId).select('institute');
            if (!user) throw new Error("Actor not found");
            instituteId = user.institute;
        }

        const allowedFields = ['name', 'schedule', 'capacity', 'instructor', 'description', 'startDate', 'endDate'];
        const sanitizedData = {};
        const updatesLog = [];

        Object.keys(data).forEach(key => {
            if (allowedFields.includes(key)) {
                if (key === 'description') {
                    sanitizedData.schedule = { ...sanitizedData.schedule, description: data[key] };
                } else if (key === 'startDate') {
                    sanitizedData.schedule = { ...sanitizedData.schedule, startDate: data[key] };
                } else if (key === 'endDate') {
                    sanitizedData.schedule = { ...sanitizedData.schedule, endDate: data[key] };
                } else if (key === 'schedule') {
                    sanitizedData.schedule = { ...sanitizedData.schedule, ...data[key] };
                } else {
                    sanitizedData[key] = data[key];
                }
                updatesLog.push(key);
            }
        });

        if (Object.keys(sanitizedData).length === 0) {
            throw new Error("No valid updatable fields provided");
        }

        const batch = await Batch.findOneAndUpdate(
            { _id: id, deletedAt: null, institute: instituteId },
            { $set: sanitizedData },
            { new: true }
        );

        if (!batch) throw new Error("Batch not found or access denied");

        await createAuditLog({
            actor: actorId,
            action: 'batch.update',
            resource: { type: 'Batch', id: batch._id },
            institute: batch.institute,
            details: { updates: updatesLog }
        });

        return batch;
    }

    static async deleteBatch(id, actorId, instituteId) {
        if (!instituteId) throw new Error("Institute context missing");
        await connectDB();
        const batch = await Batch.findOneAndUpdate(
            { _id: id, deletedAt: null, institute: instituteId },
            { deletedAt: new Date() },
            { new: true }
        );

        if (!batch) throw new Error("Batch not found");

        await createAuditLog({
            actor: actorId,
            action: 'batch.delete',
            resource: { type: 'Batch', id: batch._id },
            institute: instituteId,
            details: { name: batch.name }
        });

        return true;
    }
}
