import mongoose from 'mongoose';
const { Schema } = mongoose;

const AuditLogSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: false, index: true }, actor: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'student.create', 'student.update', 'student.delete',
            'course.create', 'course.update', 'course.delete',
            'batch.create', 'batch.update', 'batch.delete', 'batch.enroll', 'batch.remove_student',
            'fee.create', 'fee.update', 'fee.payment', 'fee.discount',
            'material.upload', 'material.delete',
            'attendance.mark', 'attendance.update',
            'exam.create', 'exam.update', 'exam.delete', 'exam.publish',
            'user.password_reset', 'user.role_change', 'user.create', 'user.delete',
            'institute.create', 'institute.update', 'institute.delete',
            'LOGIN'
        ],
        index: true
    },
    resource: {
        type: {
            type: String,
            enum: ['Student', 'User', 'Course', 'Batch', 'Fee', 'Material', 'Attendance', 'Exam', 'ExamSubmission', 'Institute']
        },
        id: Schema.Types.ObjectId
    },
    details: Schema.Types.Mixed, // Store before/after states or additional context
    ipAddress: String,
    userAgent: String
}, { timestamps: true });

// Compound indexes
AuditLogSchema.index({ actor: 1, createdAt: -1 }); AuditLogSchema.index({ institute: 1, actor: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ 'resource.type': 1, 'resource.id': 1 });
// Safe config parsing
const getRetentionSeconds = () => {
    try {
        const envVal = process.env.AUDIT_LOG_RETENTION_DAYS;
        if (!envVal || typeof envVal !== 'string') return 90 * 86400; // Default 90 days

        const days = parseInt(envVal.trim(), 10);
        // Ensure valid positive integer
        if (Number.isNaN(days) || days <= 0 || !/^\d+$/.test(envVal.trim())) {
            console.warn(`Invalid AUDIT_LOG_RETENTION_DAYS "${envVal}", defaulting to 90 days.`);
            return 90 * 86400;
        }
        return days * 86400;
    } catch {
        return 90 * 86400;
    }
};

AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: getRetentionSeconds() }); // Customizable retention

// Force recompilation in dev to pick up enum changes
if (process.env.NODE_ENV === 'development') {
    if (mongoose.models.AuditLog) {
        delete mongoose.models.AuditLog;
    }
}

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
