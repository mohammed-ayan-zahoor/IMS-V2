import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * Institute-configurable grouping for stock items (e.g. "Stationery", "Lab
 * Equipment", "Uniforms", "Mess Supplies"). Deliberately has NO type/tracking
 * field of its own — trackingType lives on Item only, so there is exactly one
 * place that decision can be made. A category can freely contain a mix of
 * consumable and asset items.
 */
const StockCategorySchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

StockCategorySchema.index({ institute: 1, name: 1 }, { unique: true });

export default mongoose.models.StockCategory || mongoose.model('StockCategory', StockCategorySchema);
