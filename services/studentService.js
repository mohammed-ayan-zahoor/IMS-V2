import User from '@/models/User';
import Batch from '@/models/Batch';
import Fee from '@/models/Fee';
import { createAuditLog } from './auditService';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { escapeRegExp } from 'lodash';

export class StudentService {
    /**
     * Create a new student with enrollment
     */
    static async createStudent(data, actorId) {
        try {
            const { email, password, profile, guardianDetails } = data;

            // Check if active user exists (ignore soft deleted)
            const existingUser = await User.findOne({
                email: email?.toLowerCase(),
                deletedAt: null
            });

            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            const salt = await bcrypt.genSalt(10);
            const defaultPass = process.env.DEFAULT_STUDENT_PASSWORD || 'Welcome@123';
            const passwordHash = await bcrypt.hash(password || defaultPass, salt);

            // Create student
            const student = await User.create({
                email: email?.toLowerCase(),
                passwordHash,
                role: 'student',
                profile,
                guardianDetails,
            });

            // Log action
            await createAuditLog({
                actor: actorId,
                action: 'student.create',
                resource: { type: 'User', id: student._id },
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

            await createAuditLog({
                actor: actorId,
                action: 'student.hard_delete',
                resource: { type: 'User', id: studentId },
                details: { name: student.fullName, email: student.email }
            }); // Audit log is outside transaction usually, or we accept it might fail if transaction commits but log doesn't. 
            // Better to log independently or after commit. But for simplicity here:

            await session.commitTransaction();
            return true;
        } catch (error) {
            await session.abortTransaction();
            // Fallback for standalone mongo (which doesn't support transactions)
            if (error.message && error.message.includes('Transaction numbers are only allowed on a replica set')) {
                // Manual Cleanup without transaction
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
                    details: { event: "Manual Hard Delete due to No RS" }
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
    static async getStudents({ page = 1, limit = 10, search = "", showDeleted = false, batchId = null, courseId = null, isActive = null }) {
        const skip = (page - 1) * limit;

        const query = {
            role: 'student'
        };

        if (isActive === 'true') {
            query.deletedAt = null;
        } else if (isActive === 'false') {
            query.deletedAt = { $ne: null };
        } else {
            // Default or "All" case. 
            // If explicit showDeleted is used (legacy), fallback to it
            // Otherwise, if isActive is null (All), we might want to show BOTH?
            // Usually "All" means everything. But if showDeleted was false default...
            // Let's assume:
            // - invalid/null isActive + showDeleted=false => Active Only (Default behavior)
            // - invalid/null isActive + showDeleted=true => Deleted Only (Legacy)
            // But if the UI sends isActive="" which becomes null, and we want "All", 
            // we should probably NOT filter deletedAt. 
            // However, typical behavior is hide deleted unless asked.

            // Let's match the previous default: Active Only.
            if (isActive === null && !showDeleted) {
                query.deletedAt = null;
            } else if (showDeleted) {
                query.deletedAt = { $ne: null };
            }
            // If isActive is null and we somehow want ALL, we'd need a specific flag.
            // For now, let's keep the safe default of Active Only if no filter is set.
        }

        // Filter by batch or course
        if (batchId || courseId) {
            const batchQuery = { deletedAt: null };
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
    static async enrollInBatch(studentId, batchId, actorId) {
        const session = await mongoose.startSession();
        try {
            session.startTransaction();

            const student = await User.findById(studentId).session(session);
            if (!student || student.role !== 'student' || student.deletedAt) {
                throw new Error('Invalid or inactive student');
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
                // Check if fee record exists
                const existingFee = await Fee.findOne({ student: studentId, batch: batchId }).session(session);
                if (existingFee) {
                    await session.abortTransaction();
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

            // Create initial fee record
            const fee = await Fee.create([{
                student: studentId,
                batch: batchId,
                totalAmount: batch.course.fees.amount,
                installments: [],
                status: 'not_started' // Default status
            }], { session });

            // Log action
            await createAuditLog({
                actor: actorId,
                action: 'batch.enroll',
                resource: { type: 'Batch', id: batchId },
                details: {
                    studentId,
                    studentName: student.fullName,
                    batchName: batch.name,
                    event: existingEnrollment ? "Fee Recovery for existing enrollment" : "New Enrollment"
                }
            });

            await session.commitTransaction();
            return { student, batch, fee: fee[0] };

        } catch (error) {
            await session.abortTransaction();
            // Fallback for standalone mongo (Replica Set required for transactions)
            if (error.message && error.message.includes('Transaction numbers are only allowed on a replica set')) {
                return this.enrollInBatchStandalone(studentId, batchId, actorId);
            }
            throw error;
        } finally {
            session.endSession();
        }
    }

    // Fallback for standalone DB without transactions
    static async enrollInBatchStandalone(studentId, batchId, actorId) {
        const student = await User.findById(studentId);
        if (!student || student.role !== 'student' || student.deletedAt) throw new Error('Invalid or inactive student');

        const batch = await Batch.findById(batchId).populate('course');
        if (!batch || batch.deletedAt) throw new Error('Batch not found or inactive');
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
            totalAmount: batch.course.fees.amount,
            installments: [],
            status: 'not_started'
        });

        await createAuditLog({
            actor: actorId,
            action: 'batch.enroll',
            resource: { type: 'Batch', id: batchId },
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
}
