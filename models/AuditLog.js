import mongoose from 'mongoose';
const { Schema } = mongoose;

const AuditLogSchema = new Schema({
    actor: {
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
            'user.password_reset', 'user.role_change', 'user.create', 'user.delete'
        ],
        index: true
    },
    resource: {
        type: {
            type: String,
            enum: ['Student', 'User', 'Course', 'Batch', 'Fee', 'Material', 'Attendance', 'Exam', 'ExamSubmission']
        },
        id: Schema.Types.ObjectId
    },
    details: Schema.Types.Mixed, // Store before/after states or additional context
    ipAddress: String,
    userAgent: String
}, { timestamps: true });

// Compound indexes
AuditLogSchema.index({ actor: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ 'resource.type': 1, 'resource.id': 1 });
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: (parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 90) * 24 * 60 * 60 }); // Customizable retention

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
