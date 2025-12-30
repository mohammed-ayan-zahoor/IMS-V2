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
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { email, password, profile, guardianDetails } = data;

            // Start transaction-safe check
            const existingUser = await User.findOne({ email: email?.toLowerCase() }).session(session);
            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            const salt = await bcrypt.genSalt(10);
            const defaultPass = process.env.DEFAULT_STUDENT_PASSWORD || 'Welcome@123';
            const passwordHash = await bcrypt.hash(password || defaultPass, salt);

            // Create student
            const student = await User.create([{
                email: email?.toLowerCase(),
                passwordHash,
                role: 'student',
                profile,
                guardianDetails,
            }], { session });

            const studentId = student[0]._id;

            // Log action
            await createAuditLog({
                actor: actorId,
                action: 'student.create',
                resource: { type: 'User', id: studentId },
                details: {
                    name: `${profile.firstName} ${profile.lastName}`,
                    email: email
                }
            }, { session });

            await session.commitTransaction();
            return student[0];

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get all students with pagination and filters
     */
    static async getStudents({ page = 1, limit = 10, search = "", showDeleted = false }) {
        const skip = (page - 1) * limit;

        const query = {
            role: 'student',
            deletedAt: showDeleted ? { $ne: null } : null
        };

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
        session.startTransaction();

        try {
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
            const alreadyEnrolled = batch.enrolledStudents.some(
                e => e.student.toString() === studentId && e.status === 'active'
            );

            if (alreadyEnrolled) {
                throw new Error('Student already enrolled in this batch');
            }

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

            // Create initial fee record
            const fee = await Fee.create([{
                student: studentId,
                batch: batchId,
                totalAmount: batch.course.fees.amount,
                installments: []
            }], { session });

            // Log action
            await createAuditLog({
                actor: actorId,
                action: 'batch.enroll',
                resource: { type: 'Batch', id: batchId },
                details: {
                    studentId,
                    studentName: student.fullName,
                    batchName: batch.name
                }
            }, { session });

            await session.commitTransaction();
            return { student, batch, fee: fee[0] };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}
