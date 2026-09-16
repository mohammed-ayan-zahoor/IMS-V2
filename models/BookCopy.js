import mongoose from 'mongoose';
import './Counter.js';
const { Schema } = mongoose;

const BookCopySchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    accessionNumber: { type: String, uppercase: true },
    condition: { type: String, enum: ['good', 'fair', 'poor'], default: 'good' },
    status: {
        type: String,
        enum: ['available', 'issued', 'reserved', 'lost', 'damaged', 'withdrawn'],
        default: 'available',
        index: true
    },
    shelfLocation: { type: String, trim: true },
    // Set when a hold advances to 'ready' and this copy is set aside for that patron
    reservedForHold: { type: Schema.Types.ObjectId, ref: 'LibraryHold', default: null },
    notes: { type: String, trim: true }
}, { timestamps: true });

BookCopySchema.index({ institute: 1, accessionNumber: 1 }, { unique: true });
BookCopySchema.index({ institute: 1, book: 1, status: 1 });

// Auto-generate accession number — same Counter pattern as enrollmentNumber
BookCopySchema.pre('save', async function () {
    if (this.isNew && !this.accessionNumber) {
        const settings = await mongoose.model('LibrarySettings')
            .findOne({ institute: this.institute })
            .lean()
            .catch(() => null);
        const prefix = settings?.barcodePrefix || 'LIB';
        const year = new Date().getFullYear();
        const counterId = `lib_accession_${this.institute.toString()}_${year}`;
        const counter = await mongoose.model('Counter').findByIdAndUpdate(
            counterId,
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.accessionNumber = `${prefix}-${year}-${String(counter.seq).padStart(6, '0')}`;
    }
});

export default mongoose.models.BookCopy || mongoose.model('BookCopy', BookCopySchema);
