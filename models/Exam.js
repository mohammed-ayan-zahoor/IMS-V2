import mongoose from 'mongoose';
const { Schema } = mongoose;

const ExamSchema = new Schema({
    title: { type: String, required: true, trim: true },
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },

    // Questions - STORE AS REFERENCES, NOT EMBEDDED
    questions: [{
        type: Schema.Types.ObjectId,
        ref: 'Question'
    }],

    duration: { type: Number, required: true, min: 1 }, // minutes
    totalMarks: { type: Number, default: 0 },
    passingMarks: { type: Number, required: true, min: 0 },

    // Scheduling
    scheduledAt: { type: Date }, // DEPRECATED: Use schedule.startTime. Kept for legacy queries.
    schedule: {
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true }
    },
    // Status - USE ENUM INSTEAD OF BOOLEAN
    status: {
        type: String,
        enum: ['draft', 'published', 'ongoing', 'completed', 'archived'],
        default: 'draft',
        index: true
    },

    instructions: { type: String, maxlength: 2000 },

    // Results Control
    resultsPublished: { type: Boolean, default: false },
    resultsPublishedAt: Date,
    showCorrectAnswers: { type: Boolean, default: true },
    showExplanations: { type: Boolean, default: true },

    // Security Configuration
    securityConfig: {
        enforceFullscreen: { type: Boolean, default: true },
        allowTabSwitch: { type: Boolean, default: false },
        maxTabSwitches: { type: Number, default: 3 },
        preventCopyPaste: { type: Boolean, default: true },
        preventRightClick: { type: Boolean, default: true },
        randomizeQuestions: { type: Boolean, default: false },
        randomizeOptions: { type: Boolean, default: false }
    },

    // Grading Configuration
    negativeMarking: { type: Boolean, default: false },
    negativeMarkingPercentage: { type: Number, default: 0, min: 0, max: 100 },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, default: null }
}, { timestamps: true });

ExamSchema.index({ batch: 1, status: 1 });
ExamSchema.index({ institute: 1, batch: 1, status: 1 });
ExamSchema.index({ scheduledAt: 1 });

// Validation Hooks
function validateTotalMarks(status, totalMarks) {
    if (status === 'published' && totalMarks <= 0) {
        throw new Error('Total marks must be greater than 0 for published exams');
    }
}

function validatePassingMarks(passing, total) {
    if (passing !== undefined && total !== undefined && passing > total) {
        throw new Error('Passing marks cannot exceed total marks');
    }
}

ExamSchema.pre('save', function (next) {
    try {
        // Validation: Schedule is required
        if (!this.schedule || !this.schedule.startTime || !this.schedule.endTime) {
            throw new Error('Exam schedule (start and end time) is required');
        }

        // Sync legacy scheduledAt
        this.scheduledAt = this.schedule.startTime;

        if (this.schedule.endTime <= this.schedule.startTime) {
            throw new Error('End time must be after start time');
        }

        // Only run these checks if totalMarks/passingMarks/status are being modified or doc is new
        // Ideally we should perform this check, but let's trust the logic.
        validateTotalMarks(this.status, this.totalMarks);
        validatePassingMarks(this.passingMarks, this.totalMarks);

        next();
    } catch (error) {
        next(error);
    }
});

ExamSchema.pre(['findOneAndUpdate', 'updateOne'], async function (next) {
    try {
        const query = this.getQuery();
        const update = this.getUpdate();

        // 1. Fetch the document being updated
        const doc = await this.model.findOne(query);

        // If document not found, we should fail unless it's an upsert (which we assume false for safety or check options)
        if (!doc) {
            // If we want to be strict:
            return next(new Error("Exam not found for update"));
        }

        // 2. Compute effective values after update
        // We only care about fields that affect validation: status, totalMarks, passingMarks
        let finalStatus = doc.status;
        let finalTotal = doc.totalMarks;
        let finalPassing = doc.passingMarks;

        // Helper to apply operators
        const applyUpdate = (operator, field, value) => {
            if (operator === '$set') {
                if (field === 'status') finalStatus = value;
                if (field === 'totalMarks') finalTotal = value;
                if (field === 'passingMarks') finalPassing = value;
            } else if (operator === '$inc') {
                if (field === 'totalMarks') finalTotal = (finalTotal || 0) + value;
                if (field === 'passingMarks') finalPassing = (finalPassing || 0) + value;
            } else if (operator === '$unset') {
                if (field === 'status') finalStatus = undefined; // Should fallback to default? Schema default doesn't apply to unset.
                if (field === 'totalMarks') finalTotal = undefined;
                if (field === 'passingMarks') finalPassing = undefined;
            }
        };

        // Iterate over update object keys
        for (const key in update) {
            if (key.startsWith('$')) {
                // It's an operator like $set, $inc
                const op = key;
                const fields = update[key];
                for (const field in fields) {
                    applyUpdate(op, field, fields[field]);
                }
            } else {
                // It's a direct assignment (treated as $set in Mongoose 5+, but explicit $set is better)
                applyUpdate('$set', key, update[key]);
            }
        }

        // 3. Validation
        validateTotalMarks(finalStatus, finalTotal);
        validatePassingMarks(finalPassing, finalTotal);

        next();
    } catch (error) {
        next(error);
    }
});

export default mongoose.models.Exam || mongoose.model('Exam', ExamSchema);
