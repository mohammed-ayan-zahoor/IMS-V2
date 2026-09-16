import mongoose from 'mongoose';
const { Schema } = mongoose;

// Per-role loan rules — student / faculty / staff / instructor
const LoanRuleSchema = new Schema({
    durationDays: { type: Number, default: 14 },
    maxBooks: { type: Number, default: 3 },
    renewalLimit: { type: Number, default: 2 }
}, { _id: false });

const LibrarySettingsSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, unique: true },
    barcodeGenerationEnabled: { type: Boolean, default: true },
    barcodePrefix: { type: String, default: 'LIB', uppercase: true, trim: true },
    loanRules: {
        student: { type: LoanRuleSchema, default: () => ({ durationDays: 14, maxBooks: 3, renewalLimit: 2 }) },
        instructor: { type: LoanRuleSchema, default: () => ({ durationDays: 30, maxBooks: 10, renewalLimit: 3 }) },
        staff: { type: LoanRuleSchema, default: () => ({ durationDays: 30, maxBooks: 10, renewalLimit: 3 }) }
    },
    // Same shape as Fee.penaltyConfig — familiar to anyone who's already configured fees
    fineConfig: {
        enabled: { type: Boolean, default: true },
        type: { type: String, enum: ['flat', 'daily'], default: 'daily' },
        amount: { type: Number, default: 1 }, // ₹1/day default
        offsetDays: { type: Number, default: 0 }
    },
    holdExpiryDays: { type: Number, default: 3 },
    // Fallback charge when a copy is lost and Book.replacementCost is not set
    defaultReplacementCost: { type: Number, default: 500 }
}, { timestamps: true });

export default mongoose.models.LibrarySettings || mongoose.model('LibrarySettings', LibrarySettingsSchema);
