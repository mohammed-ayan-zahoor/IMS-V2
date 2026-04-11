import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * Tracks which syllabus items a batch has completed for a given subject.
 * One document per (batch, subject) pair.
 * Progress references items by their _id from Subject.syllabus — so
 * reordering chapters/topics never breaks existing completion records.
 */
const CompletionSchema = new Schema({
    // The _id of the Chapter, Topic, or SubTopic from Subject.syllabus
    itemId: { type: Schema.Types.ObjectId, required: true },
    itemType: {
        type: String,
        enum: ['chapter', 'topic', 'subtopic'],
        required: true
    },
    // Parent context for efficient lookup
    chapterId: { type: Schema.Types.ObjectId, required: true },
    topicId: { type: Schema.Types.ObjectId, default: null }, // null for chapter-level
    // Completion state (can be flipped to false to "unmark")
    isCompleted: { type: Boolean, default: true },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, maxlength: 500, trim: true },
    // If unmarked, track that too
    unmarkedAt: { type: Date },
    unmarkedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { _id: false }); // Use itemId as the natural key

const BatchSyllabusProgressSchema = new Schema({
    batch: {
        type: Schema.Types.ObjectId,
        ref: 'Batch',
        required: true,
        index: true
    },
    subject: {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    completions: [CompletionSchema],
    // Cached percentage 0–100 (updated on every mark/unmark)
    overallProgress: { type: Number, default: 0, min: 0, max: 100 },
    // Last time any topic was marked — used for inactivity notifications
    lastActivityAt: { type: Date, default: null }
}, { timestamps: true });

// One progress document per batch-subject pair
BatchSyllabusProgressSchema.index(
    { batch: 1, subject: 1 },
    { unique: true }
);

export default mongoose.models.BatchSyllabusProgress
    || mongoose.model('BatchSyllabusProgress', BatchSyllabusProgressSchema);
