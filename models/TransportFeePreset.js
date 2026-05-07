import mongoose from 'mongoose';
const { Schema } = mongoose;

const TransportFeePresetSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    name: { type: String, required: true, trim: true }, // "Bus Route 1 - Monthly"
    route: { type: Schema.Types.ObjectId, ref: 'TransportRoute' }, // Optional: tie to specific route
    billingCycle: { 
        type: String, 
        enum: ['monthly', 'quarterly', 'annual'], 
        required: true 
    },
    amount: { type: Number, required: true, min: 0 }, // Fee amount per cycle
    maxCycles: { type: Number, min: 1 }, // Optional: limit number of billing cycles (e.g., 10 months)
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, index: true }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

TransportFeePresetSchema.index({ institute: 1, deletedAt: 1 });

// Virtual: formatted display string
TransportFeePresetSchema.virtual('displayLabel').get(function () {
    const cycleLabels = { monthly: '/month', quarterly: '/quarter', annual: '/year' };
    return `₹${this.amount?.toLocaleString('en-IN')}${cycleLabels[this.billingCycle] || ''}`;
});

export default mongoose.models.TransportFeePreset || mongoose.model('TransportFeePreset', TransportFeePresetSchema);
