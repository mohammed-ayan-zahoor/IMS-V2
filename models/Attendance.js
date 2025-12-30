import mongoose from 'mongoose';
const { Schema } = mongoose;

const AttendanceRecordSchema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['present', 'absent', 'late', 'excused'],
        required: true
    },
    remarks: { type: String, maxlength: 500 }
});

const AttendanceSchema = new Schema({
    date: { type: Date, required: true, index: true },
    batch: {
        type: Schema.Types.ObjectId,
        ref: 'Batch',
        required: true,
        index: true
    },
    records: [AttendanceRecordSchema],
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isLocked: { type: Boolean, default: false }
}, { timestamps: true });

// Unique constraint: one attendance record per batch per date
AttendanceSchema.index({ batch: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
