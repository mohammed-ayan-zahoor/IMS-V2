import mongoose from 'mongoose';
const { Schema } = mongoose;

const QuestionSchema = new Schema({
    text: { type: String, required: true }, // HTML content allowed
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    type: {
        type: String,
        enum: ['mcq', 'true_false', 'short_answer', 'essay'],
        required: true
    },
    subject: { type: String },
    classLevel: { type: String }, // e.g., "Grade 10", "Undergraduate"

    course: { type: Schema.Types.ObjectId, ref: 'Course' },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch' },

    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },

    // MCQ specific
    options: {
        type: [String],
        validate: {
            validator: function (v) {
                if (this.type === 'mcq') {
                    return Array.isArray(v) && v.length >= 2;
                }
                return true;
            },
            message: 'MCQ must have at least 2 options.'
        }
    },
    correctAnswer: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                if (this.type === 'mcq') {
                    // In MCQ, we store the *index* (as string) or the *value*?
                    // The user request says "correctAnswer is one of this.options".
                    // Ideally we store the actual value or the index.
                    // The API route (lines 105-114 of Step 1672) converts index to string? 
                    // "validatedAnswer = String(index);" 
                    // Wait, `body.correctAnswer` comes as index.
                    // But the prompt says "correctAnswer is one of this.options".
                    // If existing data stores "0", "1", etc., checking `this.options.includes(v)` might fail if `options` are ["A", "B"].
                    // The API route logic: `validatedAnswer = String(index);` suggesting it stores "0", "1".
                    // BUT the user prompt says: "checks this.type: for 'mcq' ensure this.options exists, has length>0 and correctAnswer is one of this.options"
                    // This implies the stored value IS the option text, OR the user meant "valid index".
                    // Given the ambiguity and the API route's `index` logic, I should clarify or stick to what API does.
                    // HOWEVER, if I strictly follow "correctAnswer is one of this.options", I might break existing logic if it stores indices.
                    // The API code at 1672:
                    // `const index = Number(body.correctAnswer);`
                    // `validatedAnswer = String(index);`
                    // So usage is INDEX based.
                    // But user prompt says "correctAnswer is one of this.options".
                    // Maybe the user *wants* to store the value now?
                    // Or maybe they meant "valid pointer to an option".
                    // "ensure ... correctAnswer is one of this.options" usually means value inclusion.
                    // But if the data model is indices, `includes` is wrong.
                    // Actually, looking at the API code again:
                    // `const safeData = { ... correctAnswer: validatedAnswer ... }`
                    // It stores "0", "1".
                    // So `this.options.includes("0")`? Unlikely options are "0", "1".
                    // I will assume the user meant "valid index" OR they want to change the behavior?
                    // "reintroduce schema-level validation ... checks ... correctAnswer is one of this.options"
                    // I will interpret "is one of this.options" loosely as "corresponds to a valid option" to avoid breaking the app,
                    // UNLESS the user explicitly wants to store the text.
                    // If I change it to check inclusion, and the API stores indices, validation fails.
                    // Let's look at `Question.js` again. `options: [{ type: String }]`.
                    // If I implement `this.options[v]` (if v is index) check?
                    // Wait, if `v` is "0", `this.options[0]` exists.
                    // IF the user insists on "one of this.options" literally, they might mean equality.
                    // Let's look at the "True/False" part: "ensure correctAnswer is exactly 'true' or 'false'".
                    // API stores "true"/"false".
                    // So API stores values for T/F.
                    // For MCQ, API stores INDICES ("0", "1").
                    // So "one of this.options" is technically INCORRECT for the current API implementation.
                    // I should probably validate that `v` is a valid index relative to `options`.
                    // i.e. `v >= 0 && v < this.options.length`.
                    // BUT, if the user requested "is one of this.options", maybe they WANT to switch to value storage?
                    // Changing storage format is a breaking change (migration needed).
                    // I'll stick to the current API behavior (Indices) and validate that the index is valid.
                    // OR, I can validate that `this.options` contains `v` IF `v` was the value.
                    // I will implement "valid index" logic first, but if I see strict instructions...
                    // "checks ... correctAnswer is one of this.options"
                    // This is very specific.
                    // I'll add a comment about Index vs Value.
                    // Actually, if I am forced to follow the prompt exactly, I might break it.
                    // I will assume "valid option" means "valid index" referenced by the API.
                    // Wait, if I change the validator to check inclusion `this.options.includes(v)`, and the API sends "0", and options are ["Apple", "Banana"], `"0"` is NOT in options.
                    // So validation would fail.
                    // I must align with the API `POST` logic unless I change the API too.
                    // The API `POST` logic definitely parses it as index: `const index = Number(body.correctAnswer); validatedAnswer = String(index);`
                    // So for now, I will validate that `Number(v)` is a valid index.

                    validate: {
                        validator: function(v) {
                            if (this.type === 'mcq') {
                                if (!this.options || this.options.length === 0) return false;
                                const idx = Number(v);
                                return !isNaN(idx) && idx >= 0 && idx < this.options.length;
                            }
                            if (this.type === 'true_false') {
                                return v === 'true' || v === 'false';
                            }
                            return true;
                        },
                        message: 'Invalid correct answer for the selected question type.'
                    }
                }
            },

            marks: { type: Number, required: true, default: 1, min: 0 },
            explanation: { type: String }, // Optional explanation

            // Metadata
            tags: [String],
            createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            isActive: { type: Boolean, default: true },

            // Usage tracking
            timesUsed: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 }, // For analytics

            deletedAt: Date
        }, { timestamps: true });

QuestionSchema.index({ subject: 1, classLevel: 1, difficulty: 1 });
QuestionSchema.index({ institute: 1, subject: 1, difficulty: 1 });
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
