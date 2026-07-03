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
            'student.create', 'student.update', 'student.delete', 'student.hard_delete',
            'student.complete', 'student.drop', 'student.revert', 'student.promote',
            'student.document_upload', 'student.document_delete',
            'certificate.generate', 'certificate.regenerate', 'certificate.revoke',
            'course.create', 'course.update', 'course.delete', 'course.assignSubjects',
            'batch.create', 'batch.update', 'batch.delete', 'batch.enroll', 'batch.remove_student', 'batch.unenroll', 'batch.course_transfer',
            'fee.create', 'fee.update', 'fee.payment', 'fee.delete', 'fee.discount', 'fee.extra_charges', 'fee.cancel',
            'material.upload', 'material.delete',
            'attendance.mark', 'attendance.update',
            'exam.create', 'exam.update', 'exam.delete', 'exam.publish',
            'user.password_reset', 'user.password_change', 'user.role_change', 'user.create', 'user.update', 'user.delete', 'user.login',
            'collector.create', 'collector.update', 'collector.delete', 'collector.transfer',
            'institute.create', 'institute.update', 'institute.delete',
            'expense_head.create', 'expense_head.delete',
            'expense.create', 'expense.delete',
            'income_head.create', 'income_head.delete',
            'income.create', 'income.delete',
            'hr.designation.create', 'hr.designation.delete',
            'hr.component.create', 'hr.component.delete',
            'hr.leave.create', 'hr.leave.delete',
            'hr.attendance.mark',
            'hr.payslip.generate', 'hr.payslip.delete',
            'subject.create', 'subject.update', 'subject.delete', 'subject.syllabus_update', 'subject.syllabus_import',
            'fee_preset.create', 'fee_preset.update', 'fee_preset.delete',
            'session.create', 'session.activate', 'session.delete', 'session.student_fetch', 'session.student_create', 'session.dashboard_stats_access',
            'masterSubject.create', 'masterSubject.update', 'masterSubject.delete', 'masterSubject.import',
            'hostel.block.create', 'hostel.block.update', 'hostel.block.delete',
            'hostel.room.create', 'hostel.room.update', 'hostel.room.delete',
            'hostel.allotment.create', 'hostel.allotment.vacate', 'hostel.allotment.payment',
            'transport.vehicle.create', 'transport.vehicle.update', 'transport.vehicle.delete',
            'transport.driver.create', 'transport.driver.update', 'transport.driver.delete',
            'transport.route.create', 'transport.route.update', 'transport.route.delete',
            'transport.fee_preset.create', 'transport.fee_preset.update', 'transport.fee_preset.delete'
        ],
        index: true
    },
     resource: {
          type: {
              type: String,
              enum: ['Student', 'User', 'Course', 'Batch', 'Fee', 'Material', 'Attendance', 'Exam', 'ExamSubmission', 'Institute', 'Collector', 'ExpenseHead', 'Expense', 'IncomeHead', 'Income', 'Designation', 'SalaryComponent', 'LeaveType', 'StaffAttendance', 'Payslip', 'Subject', 'Enquiry', 'FeePreset', 'Session', 'MasterSubject', 'CollectorTransfer', 'HostelBlock', 'HostelRoom', 'HostelAllotment', 'Vehicle', 'Driver', 'TransportRoute', 'TransportFeePreset', 'TransportFee', 'Visitor', 'PhoneCallLog', 'Postal', 'Complaint', 'StudentTimeline']
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
