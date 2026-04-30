import mongoose from 'mongoose';
const { Schema } = mongoose;

// Sub-topic: The most granular level (e.g., "Constructors")
const SubTopicSchema = new Schema({
    title: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 }
}, { _id: true });

// Topic: Mid-level (e.g., "Classes & Objects")
const TopicSchema = new Schema({
    title: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    subTopics: [SubTopicSchema]
}, { _id: true });

// Chapter: Top level (e.g., "Introduction to OOP")
const ChapterSchema = new Schema({
    title: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    topics: [TopicSchema]
}, { _id: true });

const SubjectSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    course: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        index: true
    },
    masterSubject: {
        type: Schema.Types.ObjectId,
        ref: 'MasterSubject',
        index: true
    },
    description: {
        type: String,
        maxlength: 1000
    },
    // Hierarchical syllabus: Chapter → Topic → SubTopic
    // Defined once per subject; all batches reference this template
    syllabus: [ChapterSchema],
    deletedAt: {
        type: Date,
        default: null,
        index: true
    }
}, { timestamps: true });

// A course cannot have the same master subject twice
SubjectSchema.index(
    { course: 1, masterSubject: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null, masterSubject: { $ne: null } } }
);

// Fallback: A course cannot have the same code twice (for custom subjects)
SubjectSchema.index(
    { course: 1, code: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null } }
);

// Force recompilation in dev to pick up schema changes
if (process.env.NODE_ENV === 'development') {
    if (mongoose.models.Subject) {
        delete mongoose.models.Subject;
    }
}

export default mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);
