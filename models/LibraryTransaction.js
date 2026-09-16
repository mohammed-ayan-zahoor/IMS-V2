import mongoose from 'mongoose';
const { Schema } = mongoose;

const RenewalSchema = new Schema({
    renewedAt: { type: Date, default: Date.now },
    previousDueDate: { type: Date, required: true },
    newDueDate: { type: Date, required: true },
    renewedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const LibraryTransactionSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    bookCopy: { type: Schema.Types.ObjectId, ref: 'BookCopy', required: true },
    // Denormalized from copy at issue time — avoids $lookup through BookCopy in reports
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    patron: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['active', 'returned', 'lost'],
        default: 'active',
        index: true
    },
    issuedAt: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    renewalHistory: [RenewalSchema],
    returnedAt: Date,
    fineAmount: { type: Number, default: 0 },
    finePaid: { type: Boolean, default: false },
    fineCollectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true }
}, { timestamps: true });

// "How many books does this patron have out" check
LibraryTransactionSchema.index({ institute: 1, patron: 1, status: 1 });
// Overdue report: status='active', dueDate < now
LibraryTransactionSchema.index({ institute: 1, dueDate: 1, status: 1 });
// DB-level guard: a copy can only have one active loan at a time
LibraryTransactionSchema.index(
    { bookCopy: 1 },
    { unique: true, partialFilterExpression: { status: 'active' } }
);

export default mongoose.models.LibraryTransaction || mongoose.model('LibraryTransaction', LibraryTransactionSchema);
