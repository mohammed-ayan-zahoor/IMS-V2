import mongoose from 'mongoose';
const { Schema } = mongoose;

const ExamSchema = new Schema({
    title: { type: String, required: true, trim: true },
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batches: [{ type: Schema.Types.ObjectId, ref: 'Batch', index: true }], // Changed to Array

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

    // Attempt & Result Control
    maxAttempts: { type: Number, default: 1, min: 1 },
    resultPublication: {
        type: String,
        enum: ['immediate', 'after_exam_end'],
        default: 'immediate'
    },

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

ExamSchema.index({ institute: 1, batches: 1, status: 1 }); // Optimized for common list filtering
ExamSchema.index({ institute: 1, status: 1 }); // Backup for queries without batches
ExamSchema.index({ batches: 1, status: 1, deletedAt: 1 }); // Optimized for student portal queries
ExamSchema.index({ scheduledAt: 1 });

// Validation Hooks
function validateTotalMarks(status, totalMarks) {
    if (status === 'published' && totalMarks <= 0) {
        throw new Error('Total marks must be greater than 0 for published exams');
    }
}

function validatePassingMarks(passing, total) {
    if (total > 0 && passing !== undefined && passing > total) {
        throw new Error('Passing marks cannot exceed total marks');
    }
}

ExamSchema.pre('save', async function () {
    // Validation: Schedule is required
    if (!this.schedule || !this.schedule.startTime || !this.schedule.endTime) {
        throw new Error('Exam schedule (start and end time) is required');
    }

    // Sync legacy scheduledAt
    this.scheduledAt = this.schedule.startTime;

    if (this.schedule.endTime <= this.schedule.startTime) {
        throw new Error('End time must be after start time');
    }

    // Validation: Availability Window must be at least as long as the duration
    const windowDurationMinutes = (this.schedule.endTime - this.schedule.startTime) / (1000 * 60);
    if (windowDurationMinutes < this.duration) {
        throw new Error(`Availability window (${Math.floor(windowDurationMinutes)} mins) must be at least equal to exam duration (${this.duration} mins)`);
    }

    // Only run these checks if totalMarks/passingMarks/status are being modified or doc is new
    validateTotalMarks(this.status, this.totalMarks);
    validatePassingMarks(this.passingMarks, this.totalMarks);
});

ExamSchema.pre(['findOneAndUpdate', 'updateOne'], async function () {
    const query = this.getQuery();
    const update = this.getUpdate();

    // 1. Fetch the document being updated
    // LIMITATION: This creates a race condition (TOCTOU). Another request could modify the document 
    // between this findOne and the actual update. Optimistic locking (versioning) is recommended for strict consistency.
    const doc = await this.model.findOne(query);

    // If upsert enabled, doc might be null. Validation is skipped for upserts of new documents in this hook 
    // because we can't easily predict the final state of a new document from just update operators.
    if (!doc) {
        if (this.getOptions().upsert) return;
        throw new Error("Exam not found for update (and upsert not enabled)");
    }

    // 2. Simulation Logic for Validation
    // LIMITATION: This simulation does not handle all MangoDB operators. 
    // Unsupported array operators ($push, $pull, etc.) will trigger an error to prevent inconsistent state.

    // Helper to get nested value safely
    const getVal = (obj, path) => path.split('.').reduce((o, k) => (o || {})[k], obj);

    // Helper to set value (simple version for simulation)
    const setVal = (obj, path, val) => {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]] = current[keys[i]] || {};
        }
        current[keys[keys.length - 1]] = val;
    };

    // State object representing the document after update
    // We clone only relevant fields for performance, or use the doc structure
    const nextDoc = {
        status: doc.status,
        totalMarks: doc.totalMarks,
        passingMarks: doc.passingMarks
    };

    // Helper to resolve whether a field update affects our target fields
    // We strictly care about: 'status', 'totalMarks', 'passingMarks'
    const RELEVANT_FIELDS = ['status', 'totalMarks', 'passingMarks'];

    const applyUpdate = (operator, fieldPath, value) => {
        // Only simulate if it affects one of our relevant validation fields
        // Direct match or nested match? Our fields are top-level, so strict check is mostly OK, 
        // but let's be safe if schema changes later.
        if (!RELEVANT_FIELDS.includes(fieldPath)) return;

        const currentVal = nextDoc[fieldPath];

        switch (operator) {
            case '$set':
                nextDoc[fieldPath] = value;
                break;
            case '$unset':
                nextDoc[fieldPath] = undefined;
                break;
            case '$inc':
                nextDoc[fieldPath] = (currentVal || 0) + value;
                break;
            case '$min':
                // logic: if current exists, take min(current, value). If not, take value.
                if (typeof currentVal === 'number') {
                    nextDoc[fieldPath] = Math.min(currentVal, value);
                } else {
                    nextDoc[fieldPath] = value;
                }
                break;
            case '$max':
                if (typeof currentVal === 'number') {
                    nextDoc[fieldPath] = Math.max(currentVal, value);
                } else {
                    nextDoc[fieldPath] = value;
                }
                break;
            case '$mul':
                nextDoc[fieldPath] = (currentVal || 0) * value;
                break;
            default:
                // Ignore other field-level operators that we don't strictly need for *this* specific validation
                break;
        }
    };

    // Iterate over update operators
    for (const key in update) {
        if (key.startsWith('$')) {
            // Unsupported Operators Check
            if (['$push', '$pull', '$addToSet', '$pop', '$pullAll', '$rename', '$currentDate'].includes(key)) {
                // If these operators target our critical fields, it's a risk. 
                // Since our critical fields are primitives (not arrays), array ops *shouldn't* target them.
                // But $rename could.
                const fields = update[key];
                for (const f in fields) {
                    if (RELEVANT_FIELDS.includes(f)) {
                        console.warn(`[Exam] Unsupported operator ${key} used on critical validation field ${f}. Validation may be inaccurate.`);
                    }
                }
                continue;
            }

            const fields = update[key];
            for (const field in fields) {
                applyUpdate(key, field, fields[field]);
            }
        } else {
            // Direct assignment (implicit $set)
            applyUpdate('$set', key, update[key]);
        }
    }

    // 3. Validation
    validateTotalMarks(nextDoc.status, nextDoc.totalMarks);
    validatePassingMarks(nextDoc.passingMarks, nextDoc.totalMarks);
});

if (process.env.NODE_ENV !== 'production') {
    delete mongoose.models.Exam;
}

export default mongoose.models.Exam || mongoose.model('Exam', ExamSchema);
