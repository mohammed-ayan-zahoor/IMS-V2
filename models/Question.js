import mongoose from 'mongoose';
const { Schema } = mongoose;

const ALLOWED_TYPES = [
    'mcq', 'multi_correct_mcq', 'true_false', 'fill_in_blank',
    'short_answer', 'essay', 'numerical', 'match_the_following'
];

const QuestionSchema = new Schema({
    text: { type: String, required: true }, // HTML content allowed
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    type: {
        type: String,
        enum: ALLOWED_TYPES,
        required: true
    },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', default: null },
    classLevel: { type: String }, // e.g., "Grade 10", "Undergraduate"

    // Content hierarchy (free-text; distinct-query powers autocomplete dropdowns)
    syllabus: { type: String, index: true },  // e.g. "CBSE", "SDC Internal"
    chapter:  { type: String, index: true },  // e.g. "Kinematics"
    topic:    { type: String },               // e.g. "Relative Velocity"

    course: { type: Schema.Types.ObjectId, ref: 'Course' },
    batch:  { type: Schema.Types.ObjectId, ref: 'Batch' },

    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },

    // Options — used by mcq, multi_correct_mcq, match_the_following
    options: {
        type: [String],
        validate: {
            validator: function (v) {
                if (this.type === 'mcq' || this.type === 'multi_correct_mcq') {
                    return Array.isArray(v) && v.length >= 2;
                }
                return true;
            },
            message: 'MCQ must have at least 2 options.'
        }
    },
    // correctAnswer encoding by type:
    //   mcq               → index string e.g. "2"
    //   multi_correct_mcq → JSON array of indices e.g. "[0,2]"
    //   true_false        → "true" | "false"
    //   numerical         → exact number string e.g. "42"
    //   fill_in_blank     → expected text (* = wildcard)
    //   match_the_following → JSON pairs e.g. "[[0,1],[1,2]]"
    //   short_answer/essay → model answer text (optional, not auto-graded)
    correctAnswer: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                if (this.type === 'mcq') {
                    if (!this.options || this.options.length === 0) return false;
                    const idx = Number(v);
                    return !isNaN(idx) && idx >= 0 && idx < this.options.length;
                }
                if (this.type === 'true_false') {
                    return v === 'true' || v === 'false';
                }
                return true; // all other types: free-form
            },
            message: 'Invalid correct answer for the selected question type.'
        }
    },

    marks: { type: Number, required: true, default: 1, min: 0 },
    explanation: { type: String },
    snippet: {
        code:     { type: String },
        language: { type: String, default: 'javascript' }
    },

    // Additional metadata
    bloomsLevel: {
        type: String,
        enum: ['remember', 'understand', 'apply', 'analyse', 'evaluate', 'create']
    },
    estimatedTimeSeconds: { type: Number },
    questionImage: { type: String }, // URL for image-based questions

    // Subjective grading support
    modelAnswer: { type: String }, // What a full-marks answer looks like
    rubric:      { type: String }, // Step-marking criteria (plain text)

    // Authoring state
    status: { type: String, enum: ['draft', 'approved'], default: 'draft', index: true },

    // General metadata
    tags:      [String],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive:  { type: Boolean, default: true },

    // Usage tracking
    timesUsed:    { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },

    deletedAt: Date
}, { timestamps: true });

QuestionSchema.index({ subject: 1, classLevel: 1, difficulty: 1 });
QuestionSchema.index({ institute: 1, subject: 1, difficulty: 1 });
QuestionSchema.index({ institute: 1, chapter: 1, difficulty: 1, type: 1 });
QuestionSchema.index({ text: 'text', tags: 'text' }); // Full-text search

// Validation is handled in the controller/service layer or by Schema constraints
// Redundant pre('validate') hook removed to prevent middleware errors

// Force recompilation in dev to ensure hooks are cleared
if (process.env.NODE_ENV === 'development') {
    if (mongoose.models.Question) {
        delete mongoose.models.Question;
    }
}

export default mongoose.models.Question || mongoose.model('Question', QuestionSchema);
