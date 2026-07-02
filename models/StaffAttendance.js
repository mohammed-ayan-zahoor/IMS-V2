import mongoose from 'mongoose';
const { Schema } = mongoose;

const StaffAttendanceSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    staff: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'half_day', 'on_leave', 'holiday'],
        required: true
    },
    remarks: {
        type: String,
        trim: true
    },
    markedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

StaffAttendanceSchema.index({ institute: 1, staff: 1, date: 1 }, { unique: true });

delete mongoose.models.StaffAttendance;

export default mongoose.models.StaffAttendance || mongoose.model('StaffAttendance', StaffAttendanceSchema);
