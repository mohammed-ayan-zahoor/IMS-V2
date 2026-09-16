import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * A physical stock point within the institute — Main Store, Electrical Lab
 * Store, Library, Hostel Store, Canteen, etc. Every StockTransaction and
 * AssetUnit is pinned to exactly one of these, which is what makes
 * "how much chalk is in the Main Store vs the Chemistry Lab" answerable.
 */
const StockLocationSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    inCharge: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

StockLocationSchema.index({ institute: 1, name: 1 }, { unique: true });
StockLocationSchema.index(
    { institute: 1, code: 1 },
    { unique: true, partialFilterExpression: { code: { $exists: true, $ne: '' } } }
);

export default mongoose.models.StockLocation || mongoose.model('StockLocation', StockLocationSchema);
