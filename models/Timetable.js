import mongoose from 'mongoose';
const { Schema } = mongoose;

const TimetableSchema = new Schema({
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    session: { type: Schema.Types.ObjectId, ref: 'Session', index: true },
    
    // Step 1: Structural Time Slots (e.g. Period 1, Break, Period 2)
    timeSlots: [{
        name: { type: String, required: true, trim: true },
        startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
        endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
        isBreak: { type: Boolean, default: false }
    }],
    
    // Step 2: Weekly Schedule Assignments
    schedule: [{
        dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0 = Sunday, 1 = Monday
        assignments: [{
            timeSlotId: { type: Schema.Types.ObjectId, required: true },
            subject: { type: Schema.Types.ObjectId, ref: 'Subject' },
            instructor: { type: Schema.Types.ObjectId, ref: 'User' }
        }]
    }],
    
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, index: true }
}, { 
    timestamps: true 
});

// A batch should only have one active timetable
TimetableSchema.index({ batch: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

// Ensure hot reload doesn't break schema
delete mongoose.models.Timetable;
export default mongoose.model('Timetable', TimetableSchema);
