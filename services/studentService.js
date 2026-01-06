import User from '@/models/User';
import Batch from '@/models/Batch';
import Fee from '@/models/Fee';
import '@/models/Course'; // Ensure Course schema is registered
import { createAuditLog } from './auditService';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { escapeRegExp } from 'lodash';
import crypto from 'crypto';
import { connectDB } from '@/lib/mongodb';

export class StudentService {
    /**
     * Create a new student with enrollment
     */
    static async createStudent(data, actorId) {
        try {
            const { email, password, profile, guardianDetails, institute } = data; // Destructure institute

            if (!institute) {
                throw new Error('Institute context required for student creation');
            }

            // Check if active user exists (ignore soft deleted) within Institute
            const existingUser = await User.findOne({
                email: email?.toLowerCase(),
                institute: institute,
                deletedAt: null
            });

            if (existingUser) {
                throw new Error('User with this email already exists in this institute');
            }

            const salt = await bcrypt.genSalt(10);

            // Random password if env var is missing, for security
            const randomPassword = crypto.randomBytes(16).toString('base64url');
            const defaultPass = process.env.DEFAULT_STUDENT_PASSWORD || randomPassword;
            const passwordHash = await bcrypt.hash(password || defaultPass, salt);

            // Create student
            const student = await User.create({
                email: email?.toLowerCase(),
                passwordHash,
                role: 'student',
                profile,
                guardianDetails,
                institute: institute // Add Institute
            });

            // Log action
            await createAuditLog({
                actor: actorId,
                action: 'student.create',
                resource: { type: 'User', id: student._id },
                institute: institute, // Pass scope to audit log
                details: {
                    name: `${profile.firstName} ${profile.lastName}`,
                    email: email
                }
            });

            return student;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Hard Delete student and cleanup related data
     */
    static async deleteStudent(studentId, actorId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const student = await User.findById(studentId).session(session);
            if (!student) throw new Error('Student not found');

            // 1. Remove Fee Records
            await Fee.deleteMany({ student: studentId }).session(session);

            // 2. Remove from Batch Enrollments
            await Batch.updateMany(
                { 'enrolledStudents.student': studentId },
                { $pull: { enrolledStudents: { student: studentId } } }
            ).session(session);

            // 3. Hard Delete User
            await User.findByIdAndDelete(studentId).session(session);

            await session.commitTransaction();

            await createAuditLog({
                actor: actorId,
                action: 'student.hard_delete',
                resource: { type: 'User', id: studentId },
                institute: student.institute,
                details: { name: student.fullName, email: student.email }
            });

            return true;
        } catch (error) {
            await session.abortTransaction();
            // Fallback for standalone mongo (which doesn't support transactions)
            if (error.message && error.message.includes('Transaction numbers are only allowed on a replica set')) {
                // Manual Cleanup without transaction (Fallback)
                const student = await User.findById(studentId);
                if (!student) return false;

                await Fee.deleteMany({ student: studentId });
                await Batch.updateMany(
                    { 'enrolledStudents.student': studentId },
                    { $pull: { enrolledStudents: { student: studentId } } }
                );
                await User.findByIdAndDelete(studentId);

                await createAuditLog({
                    actor: actorId,
                    action: 'student.hard_delete',
                    resource: { type: 'User', id: studentId },
                    institute: student.institute,
                    details: {
                        name: student.profile?.firstName + ' ' + student.profile?.lastName,
                        email: student.email,
                        event: "Manual Hard Delete due to No RS"
                    }
                });
                return true;
            }
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get all students with pagination and filters
     */
    static async getStudents({ page = 1, limit = 10, search = "", showDeleted = false, batchId = null, courseId = null, isActive = null, instituteId = null }) {
        // if (!instituteId) throw new Error('Institute context required for fetching students'); // Allow global view

        const skip = (page - 1) * limit;

        const query = {
            role: 'student',
            // institute: instituteId // Enforce Scope conditionally
        };
        if (instituteId) {
            query.institute = instituteId;
        }

        // Normalize isActive to handle both string and boolean inputs
        const normalizedIsActive = isActive === true || isActive === 'true'
            ? true
            : isActive === false || isActive === 'false'
                ? false
                : null;

        if (normalizedIsActive === true) {
            query.deletedAt = null;
        } else if (normalizedIsActive === false) {
            query.deletedAt = { $ne: null };
        } else if (showDeleted) {
            // Legacy support
            query.deletedAt = { $ne: null };
        } else {
            // Default: show active only
            query.deletedAt = null;
        }
        // Filter by batch or course
        if (batchId || courseId) {
            const batchQuery = { deletedAt: null }; // Scope Batch Search
            if (instituteId) batchQuery.institute = instituteId;
            if (batchId) batchQuery._id = batchId;
            if (courseId) batchQuery.course = courseId;

            const batches = await Batch.find(batchQuery).select('enrolledStudents.student');
            const studentIds = batches.flatMap(b => b.enrolledStudents.map(e => e.student));

            query._id = { $in: studentIds };
        }

        if (search) {
            const escapedSearch = escapeRegExp(search);
            query.$or = [
                { 'profile.firstName': { $regex: escapedSearch, $options: 'i' } },
                { 'profile.lastName': { $regex: escapedSearch, $options: 'i' } },
                { email: { $regex: escapedSearch, $options: 'i' } },
                { enrollmentNumber: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        const students = await User.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(query);

        return {
            students,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Enroll student in a batch and initialize fees
     */
    static async enrollInBatch(studentId, batchId, actorId, instituteId) {
        const session = await mongoose.startSession();
        try {
            session.startTransaction();

            const student = await User.findById(studentId).session(session);
            if (!student || student.role !== 'student' || student.deletedAt) {
                throw new Error('Invalid or inactive student');
            }

            // Check cross-institute access if instituteId is provided
            // Check cross-institute access if instituteId is provided
            if (instituteId) {
                if (!student.institute) {
                    throw new Error("Student has no institute assigned");
                }
                if (student.institute.toString() !== instituteId.toString()) {
                    throw new Error("Student does not belong to this institute");
                }
            }

            const batch = await Batch.findById(batchId).populate('course').session(session);
            if (!batch || batch.deletedAt) {
                throw new Error('Batch not found or inactive');
            }

            if (!batch.course?.fees?.amount) {
                throw new Error('Course fee information is missing');
            }

            // Check if already enrolled
            const existingEnrollment = batch.enrolledStudents.find(
                e => e.student.toString() === studentId && e.status === 'active'
            );

            if (existingEnrollment) {
                // Check if fee record also exists
                const existingFee = await Fee.findOne({ student: studentId, batch: batchId }).session(session);
                if (existingFee) {
                    throw new Error('Student already enrolled in this batch');
                }
                // If enrolled but no Fee, we proceed to create Fee (Fix consistency)
            } else {
                // Check capacity
                if (batch.activeEnrollmentCount >= batch.capacity) {
                    throw new Error('Batch has reached its maximum capacity');
                }

                // Add to batch
                batch.enrolledStudents.push({
                    student: studentId,
                    enrolledAt: new Date(),
                    status: 'active'
                });
                await batch.save({ session });
            }

            // Enforce Institute Consistency for Fee
            const targetInstitute = batch.institute;
            if (!targetInstitute) throw new Error("Batch has no institute assigned");

            if (student.institute && student.institute.toString() !== targetInstitute.toString()) {
                throw new Error("Institute mismatch: Student does not belong to the batch's institute");
            }
            if (instituteId && instituteId.toString() !== targetInstitute.toString()) {
                throw new Error("Institute mismatch: Act on behalf of correct institute");
            }

            // Create initial fee record
            const fee = await Fee.create([{
                student: studentId,
                batch: batchId,
                institute: targetInstitute, // Use validated batch institute
                totalAmount: batch.course.fees.amount,
                installments: [],
                status: 'not_started' // Default status
            }], { session });

            await session.commitTransaction();

            // Log action independently after commit
            try {
                await createAuditLog({
                    actor: actorId,
                    action: 'batch.enroll',
                    resource: { type: 'Batch', id: batchId },
                    institute: instituteId || student.institute,
                    details: {
                        studentId,
                        studentName: student.fullName,
                        batchName: batch.name,
                        event: existingEnrollment ? "Fee Recovery for existing enrollment" : "New Enrollment"
                    }
                });
            } catch (auditError) {
                console.error("Audit Log Error (Batch Enroll):", auditError);
            }

            return { student, batch, fee: fee[0] };
        } catch (error) {
            await session.abortTransaction();
            // Fallback for standalone mongo (Replica Set required for transactions)
            if (error.message && error.message.includes('Transaction numbers are only allowed on a replica set')) {
                return this.enrollInBatchStandalone(studentId, batchId, actorId, instituteId);
            }
            throw error;
        } finally {
            session.endSession();
        }
    }

    // Fallback for standalone DB without transactions
    static async enrollInBatchStandalone(studentId, batchId, actorId, instituteId) {
        const student = await User.findById(studentId);
        if (!student || student.role !== 'student' || student.deletedAt) throw new Error('Invalid or inactive student');

        if (instituteId && (!student.institute || student.institute.toString() !== instituteId.toString())) {
            throw new Error("Student does not belong to this institute");
        }

        const batch = await Batch.findById(batchId).populate('course');
        if (!batch || batch.deletedAt) throw new Error('Batch not found or inactive');
        if (!batch.institute) throw new Error('Batch configuration error: Institute is missing'); // Validation
        if (!batch.course?.fees?.amount) throw new Error('Course fee information is missing');

        const existingEnrollment = batch.enrolledStudents.find(
            e => e.student.toString() === studentId && e.status === 'active'
        );

        if (existingEnrollment) {
            const existingFee = await Fee.findOne({ student: studentId, batch: batchId });
            if (existingFee) throw new Error('Student already enrolled in this batch');
            // Proceed to create Fee
        } else {
            if (batch.activeEnrollmentCount >= batch.capacity) throw new Error('Batch has reached its maximum capacity');
            batch.enrolledStudents.push({
                student: studentId,
                enrolledAt: new Date(),
                status: 'active'
            });
            await batch.save();
        }

        const fee = await Fee.create({
            student: studentId,
            batch: batchId,
            institute: batch.institute, // Enforce Batch's Institute
            totalAmount: batch.course.fees.amount,
            installments: [],
            status: 'not_started'
        });

        await createAuditLog({
            actor: actorId,
            action: 'batch.enroll',
            resource: { type: 'Batch', id: batchId },
            institute: instituteId || student.institute,
            details: { studentName: student.fullName, batchName: batch.name }
        });

        return { student, batch, fee };
    }
    /**
     * Get full student profile with batches and fees
     */
    static async getStudentProfile(studentId) {
        const student = await User.findOne({ _id: studentId, role: 'student', deletedAt: null })
            .select('-passwordHash -passwordResetToken -passwordResetExpires');

        if (!student) return null;

        // Get batches
        const batches = await Batch.find({
            'enrolledStudents.student': studentId,
            deletedAt: null
        }).populate('course', 'name code duration fees');

        // Get fees
        const fees = await Fee.find({
            student: studentId
        }).populate('batch', 'name');

        return {
            student,
            batches: batches.map(b => ({
                _id: b._id,
                name: b.name,
                course: b.course,
                enrollment: b.enrolledStudents.find(e => e.student.toString() === studentId),
                schedule: b.schedule
            })),
            fees
        };
    }
    /**
     * Unenroll student from a batch (Correcting mistakes)
     */
    static async unenrollFromBatch(studentId, batchId, actorId, instituteId) {
        await connectDB(); // Ensure DB connection

        // Transaction logic removed for standalone MongoDB support

        // Check if active student exists
        const student = await User.findById(studentId);
        if (!student) throw new Error("Student not found");

        // Verify institute scope
        if (instituteId && student.institute && student.institute.toString() !== instituteId.toString()) {
            throw new Error("Unauthorized: Student belongs to a different institute");
        }

        // 1. Remove from Batch Enrolled Students
        // STRICT SECURITY: Use student.institute to scope the query.
        // A student can only be unenrolled from a batch that belongs to THEIR institute.
        const batch = await Batch.findOneAndUpdate(
            { _id: batchId, institute: student.institute },
            { $pull: { enrolledStudents: { student: studentId } } },
            { new: true }
        );

        if (!batch) throw new Error("Batch not found or access denied");

        // 2. Clean up Fee record ONLY if it hasn't been paid yet (status: 'not_started')
        // This prevents data loss if they actually paid and then got removed.
        const deleteResult = await Fee.deleteMany({
            student: studentId,
            batch: batchId,
            status: 'not_started'
        });

        // If fee was mostly paid, we might want to warn or log, but for "Remove" 
        // requested by admin to fix a mistake, removing the association is key.
        // If status was 'partial' or 'paid', the Fee record remains but effectively orphaned 
        // from the batch list perspective, serving as a financial record of what happened.

        await createAuditLog({
            actor: actorId,
            action: 'batch.unenroll',
            resource: { type: 'Batch', id: batchId },
            institute: instituteId || student.institute,
            details: {
                studentId,
                studentName: student.fullName,
                batchName: batch.name,
                feesRemoved: deleteResult.deletedCount
            }
        });

        return true;
    }
}
