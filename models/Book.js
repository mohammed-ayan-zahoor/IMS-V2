import mongoose from 'mongoose';
const { Schema } = mongoose;

const BookSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    title: { type: String, required: true, trim: true },
    authors: [{ type: String, trim: true }],
    publisher: { type: String, trim: true },
    edition: { type: String, trim: true },
    isbn: { type: String, trim: true },
    coverUrl: { type: String },
    coverFetched: { type: Boolean, default: false },
    // Used when a copy is marked lost — charge patron this instead of overdue fine
    replacementCost: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Only enforce isbn uniqueness per institute when isbn is present
BookSchema.index(
    { institute: 1, isbn: 1 },
    { unique: true, partialFilterExpression: { isbn: { $exists: true, $ne: '' } } }
);
BookSchema.index({ institute: 1, title: 'text', authors: 'text' });

export default mongoose.models.Book || mongoose.model('Book', BookSchema);
