import mongoose from 'mongoose';
const { Schema } = mongoose;

const BatchSchema = new Schema({
    name: { type: String, required: true, trim: true },
    course: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    schedule: {
        startDate: { type: Date, required: true },
        endDate: Date,
        daysOfWeek: [{
            type: Number,
            min: 0,
            max: 6,
            validate: {
                validator: function (v) {
                    return v >= 0 && v <= 6;
                },
                message: 'Day must be between 0 (Sunday) and 6 (Saturday)'
            }
        }],
        timeSlot: {
            start: {
                type: String,
                match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
            },
            end: {
                type: String,
                match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
            }
        }
    },
    capacity: { type: Number, default: 30, min: 1 },
    enrolledStudents: [{
        student: { type: Schema.Types.ObjectId, ref: 'User' },
        enrolledAt: { type: Date, default: Date.now },
        status: {
            type: String,
            enum: ['active', 'completed', 'dropped'],
            default: 'active'
        }
    }],
    instructor: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, index: true }
}, { timestamps: true });

BatchSchema.index({ course: 1, deletedAt: 1 });
BatchSchema.index({ 'schedule.startDate': 1 });

// Virtual for active enrollment count
BatchSchema.virtual('activeEnrollmentCount').get(function () {
    return this.enrolledStudents.filter(e => e.status === 'active').length;
});

export default mongoose.models.Batch || mongoose.model('Batch', BatchSchema);
