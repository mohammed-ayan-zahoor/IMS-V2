import mongoose from 'mongoose';
const { Schema } = mongoose;

const LibraryHoldSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    patron: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedAt: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['waiting', 'ready', 'fulfilled', 'cancelled'],
        default: 'waiting',
        index: true
    },
    readyAt: Date,
    expiresAt: Date // set when status → 'ready'; sweep cancels it after holdExpiryDays
}, { timestamps: true });

// One active hold per patron per title
LibraryHoldSchema.index(
    { institute: 1, book: 1, patron: 1 },
    { unique: true, partialFilterExpression: { status: { $in: ['waiting', 'ready'] } } }
);
// Sweep query: ready holds past expiry
LibraryHoldSchema.index({ status: 1, expiresAt: 1 });

export default mongoose.models.LibraryHold || mongoose.model('LibraryHold', LibraryHoldSchema);
