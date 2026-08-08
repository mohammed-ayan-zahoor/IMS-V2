import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true
    },

    // Pricing override
    discountedPricePerSeat: {
        type: Number,
        required: true,
        min: 1
    },

    // GST handling:
    // "inclusive" → discountedPricePerSeat is the FINAL amount (GST inside)
    // "exclusive" → GST (18%) is ADDED ON TOP of discountedPricePerSeat
    gstType: {
        type: String,
        enum: ['inclusive', 'exclusive'],
        default: 'inclusive'
    },

    // If set, ONLY this email can use this coupon. MUST match exactly (case-insensitive).
    lockedToEmail: {
        type: String,
        lowercase: true,
        trim: true
    },

    maxUses: {
        type: Number,
        default: 1,
        min: 1
    },
    usedCount: {
        type: Number,
        default: 0
    },

    // When this coupon expires (set to MOU end date)
    validUntil: {
        type: Date,
        required: true
    },

    // Whether seat top-ups also get this coupon price (true for MOU schools)
    topUpsAtCouponPrice: {
        type: Boolean,
        default: true
    },

    // Reference: which MOU submission this was generated from (optional)
    mouSubmissionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MouSubmission',
        default: null
    },

    // Internal notes (not shown to schools)
    notes: {
        type: String,
        trim: true
    },

    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

export default mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);
