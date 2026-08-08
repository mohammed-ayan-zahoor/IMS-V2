import mongoose from 'mongoose';

const OnboardingOrderSchema = new mongoose.Schema({
    razorpayOrderId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Form data from the landing page
    instituteName: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    contactName: { type: String, required: true, trim: true },
    designation: { type: String, trim: true, default: 'Principal' },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    seats: { type: Number, required: true, min: 1 },
    udiseCode: { type: String, trim: true },
    instituteType: {
        type: String,
        enum: ['VOCATIONAL', 'SCHOOL'],
        default: 'VOCATIONAL'
    },

    // Pricing captured at time of order
    pricePerSeat: { type: Number, required: true },
    gstType: { type: String, enum: ['inclusive', 'exclusive'], default: 'exclusive' },
    totalAmountPaise: { type: Number, required: true }, // what Razorpay was told

    // Coupon (if applied)
    couponCode: { type: String, uppercase: true, trim: true, default: null },
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },

    // Lifecycle
    status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'provisioned'],
        default: 'pending',
        index: true
    },

    // Set after provisioning
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },

    // For debugging webhook issues
    webhookPayload: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

export default mongoose.models.OnboardingOrder || mongoose.model('OnboardingOrder', OnboardingOrderSchema);
