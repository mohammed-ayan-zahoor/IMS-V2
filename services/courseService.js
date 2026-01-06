import Course from '@/models/Course';
import Batch from '@/models/Batch';
import mongoose from 'mongoose';
import { createAuditLog } from './auditService';
import { connectDB } from '@/lib/mongodb';

// Simple In-Memory Mutex for Standalone Server (locks by Course ID)
const courseLocks = new Map();

function runSynchronized(courseId, action) {
    const key = String(courseId);
    const prev = courseLocks.get(key) || Promise.resolve();

    const next = prev
        .catch(() => { }) // Swallow previous operation errors
        .then(() => action())
        .finally(() => {
            // Cleanup chain if we are the last one
            if (courseLocks.get(key) === next) {
                courseLocks.delete(key);
            }
        });

    courseLocks.set(key, next);
    return next;
}
export class CourseService {
    static async createCourse(data, actorId) {
        await connectDB();
        const { institute } = data;
        if (!institute) throw new Error("Institute context missing");

        let course;
        try {
            course = await Course.create({ ...data, createdBy: actorId });
        } catch (error) {
            // Self-healing check for Obsolete Global Index 'code_1'
            // We must be careful not to match the NEW compound index 'institute_1_code_1'
            const isObsoleteIndex = error.code === 11000 && error.message.includes('code_1') && !error.message.includes('institute_1');

            if (isObsoleteIndex) {
                console.warn("Detected obsolete 'code_1' index. Dropping it...");
                try {
                    await Course.collection.dropIndex('code_1');
                    // Retry creation
                    course = await Course.create({ ...data, createdBy: actorId });
                } catch (retryError) {
                    // If dropping failed or retry failed, it might be a real duplicate or ongoing issue
                    if (retryError.code === 27 || retryError.message?.includes('index not found')) {
                        // Index didn't exist, so it wasn't the obsolete one affecting us.
                        // This implies it's a real duplicate in the new scheme (or another index).
                        throw new Error("Course with this code already exists in this institute");
                    }
                    throw retryError;
                }
            } else if (error.code === 11000) {
                throw new Error("Course with this code already exists in this institute");
            } else {
                throw error;
            }
        }

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
        // if (!instituteId) throw new Error("Institute context missing"); // Allow global view
        await connectDB();
        // Prevent filter injection by only allowing specific top-level fields
        const allowedFilters = ['name', 'code', 'duration.unit'];
        const safeFilters = {};
        Object.keys(filters).forEach(key => {
            if (allowedFilters.includes(key)) safeFilters[key] = filters[key];
        });

        const query = { deletedAt: null, ...safeFilters };
        if (instituteId) query.institute = instituteId;

        return await Course.find(query)
            .populate('createdBy', 'profile.firstName profile.lastName');
    }

    static async updateCourse(id, data, actorId, instituteId) {
        await connectDB();
        const allowedFields = ['code', 'name', 'duration', 'fees', 'description'];
        const updateData = {};
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        });

        if (Object.keys(updateData).length === 0) {
            throw new Error("No valid updatable fields provided");
        }

        console.log(`[UpdateCourse] Attempting update. ID: ${id}, Inst: ${instituteId}`);

        const course = await Course.findOneAndUpdate(
            { _id: id, institute: instituteId, deletedAt: null },
            { $set: updateData },
            { new: true, runValidators: true }
        );
        if (!course) {
            console.error(`[UpdateCourse] Failed. Course NOT found for ID: ${id} and Institute: ${instituteId}`);
            throw new Error("Course not found or access denied");
        }

        await createAuditLog({
            actor: actorId,
            action: 'course.update',
            resource: { type: 'Course', id: course._id },
            institute: instituteId,
            details: { name: course.name, changes: Object.keys(data) }
        });

        return course;
    }

    static async deleteCourse(id, actorId, instituteId) {
        // Use In-Memory Lock to serialize operations on this course
        // This prevents 'Batch.create' from running concurrently with the validation/deletion here
        return runSynchronized(id, async () => {
            await connectDB();

            // 1. Check for active batches
            const batchQuery = {
                course: id,
                deletedAt: null
            };
            if (instituteId) batchQuery.institute = instituteId;

            const activeBatchCount = await Batch.countDocuments(batchQuery);

            if (activeBatchCount > 0) {
                throw new Error("Cannot delete course. It has active batches associated with it.");
            }

            // 2. Soft Delete
            const courseQuery = { _id: id, deletedAt: null };
            if (instituteId) courseQuery.institute = instituteId;

            const course = await Course.findOneAndUpdate(
                courseQuery,
                { deletedAt: new Date() },
                { new: true }
            );

            if (!course) {
                throw new Error("Course not found or access denied");
            }

            // Audit Log
            await createAuditLog({
                actor: actorId,
                action: 'course.delete',
                resource: { type: 'Course', id: course._id },
                institute: instituteId,
                details: { name: course.name, code: course.code }
            });

            return true;
        });
    }
}

export class BatchService {
    static async createBatch(data, actorId) {
        // Lock on the course ID to prevent concurrent deletion
        const courseId = data.course; // Ensure 'course' field is present in data
        if (!courseId) throw new Error("Course ID is required");

        return runSynchronized(courseId, async () => {
            await connectDB();
            const { institute } = data;
            if (!institute) throw new Error("Institute context missing");

            // Re-validate course existence/active status INSIDE the lock
            const course = await Course.findOne({
                _id: courseId,
                institute: institute,
                deletedAt: null
            });
            if (!course) throw new Error("Course not found or inactive");
            const batch = await Batch.create({ ...data, createdBy: actorId });

            await createAuditLog({
                actor: actorId,
                action: 'batch.create',
                resource: { type: 'Batch', id: batch._id },
                institute: institute,
                details: { name: batch.name }
            });

            return batch;
        });
    }

    static async getBatches(filters = {}, instituteId) {
        // if (!instituteId) throw new Error("Institute context missing"); // Allow global view
        await connectDB();
        const allowedFilters = ['course', 'instructor'];
        const safeFilters = {};
        Object.keys(filters).forEach(key => {
            if (allowedFilters.includes(key)) safeFilters[key] = filters[key];
        });

        const query = { deletedAt: null, ...safeFilters };
        if (instituteId) query.institute = instituteId;

        const batches = await Batch.find(query)
            .populate('course')
            .populate('instructor', 'profile.firstName profile.lastName')
            .sort({ 'schedule.startDate': -1 });

        return batches.map(b => b.toObject({ virtuals: true }));
    }

    static async getBatchById(id, instituteId) {
        // if (!instituteId) throw new Error("Institute context missing");
        await connectDB();
        const query = { _id: id, deletedAt: null };
        if (instituteId) query.institute = instituteId;
        const batch = await Batch.findOne(query)
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

        const allowedFields = ['name', 'course', 'schedule', 'capacity', 'instructor', 'description', 'startDate', 'endDate'];
        const sanitizedData = {};
        const updatesLog = [];

        Object.keys(data).forEach(key => {
            if (allowedFields.includes(key)) {
                if (key === 'schedule') {
                    // Process schedule first, top-level fields will override below
                    sanitizedData.schedule = { ...sanitizedData.schedule, ...data[key] };
                } else {
                    sanitizedData[key] = data[key];
                }
                updatesLog.push(key);
            }
        });

        // Apply top-level convenience fields after schedule, giving them precedence
        if (data.startDate !== undefined) sanitizedData.schedule = { ...sanitizedData.schedule, startDate: data.startDate };
        if (data.endDate !== undefined) sanitizedData.schedule = { ...sanitizedData.schedule, endDate: data.endDate };
        if (Object.keys(sanitizedData).length === 0) {
            throw new Error("No valid updatable fields provided");
        }

        const query = { _id: id, deletedAt: null };
        if (instituteId) query.institute = instituteId;

        // Fetch existing batch first for validation
        const existingBatch = await Batch.findOne(query).populate('course');
        if (!existingBatch) throw new Error("Batch not found or access denied");

        if (sanitizedData.course) {
            // Validate Target Course
            const targetCourse = await Course.findOne({
                _id: sanitizedData.course,
                institute: existingBatch.institute, // Must match batch's institute
                deletedAt: null
            });

            if (!targetCourse) {
                throw new Error("Invalid Course: Target course does not exist or belongs to a different institute");
            }

            // Business Rule: Check for active active enrollments
            // User requested gating or "shift". Since we are allowing the shift, we validate integrity.
            // If the course changes, students in this batch implicitly "shift" to the new course.
            const hasActiveStudents = existingBatch.enrolledStudents?.some(s => s.status === 'active');
            if (hasActiveStudents) {
                // Audit the transfer event explicitly
                try {
                    await createAuditLog({
                        actor: actorId,
                        action: 'batch.course_transfer',
                        resource: { type: 'Batch', id: existingBatch._id },
                        institute: existingBatch.institute,
                        details: {
                            batchName: existingBatch.name,
                            previousCourse: existingBatch.course?.name || 'Unknown',
                            newCourse: targetCourse.name,
                            activeStudentsCount: existingBatch.activeEnrollmentCount,
                            note: "Implicit migration of active students to new course logic."
                        }
                    });
                } catch (logErr) {
                    console.error("Failed to log course transfer audit", logErr);
                }
            }
        }

        const batch = await Batch.findOneAndUpdate(
            query,
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
        // if (!instituteId) throw new Error("Institute context missing");
        await connectDB();
        const query = { _id: id, deletedAt: null };
        if (instituteId) query.institute = instituteId; // Restrict if institute provided

        const batch = await Batch.findOneAndUpdate(
            query,
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
