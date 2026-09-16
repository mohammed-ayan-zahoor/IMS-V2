import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * The product master. `trackingType` is the single fork in the whole module:
 *   - 'consumable' -> stock level tracked via StockTransaction (quantity in/out)
 *   - 'asset'      -> individually tracked via AssetUnit (one row per physical unit)
 * An Item never changes trackingType after creation in normal use — if a
 * mistake is made, the fix is to deactivate this Item and create a new one,
 * NOT flip the flag, since the two transaction models are incompatible with
 * each other's history.
 */
const ItemSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true }, // SKU / Item Code
    category: { type: Schema.Types.ObjectId, ref: 'StockCategory', required: true, index: true },
    trackingType: { type: String, enum: ['consumable', 'asset'], required: true },
    unit: { type: String, trim: true, default: 'pcs' }, // pcs, box, kg, litre, set, etc. — free text, institute-defined
    reorderLevel: { type: Number, default: 0, min: 0 }, // consumables only; ignored for assets
    defaultLocation: { type: Schema.Types.ObjectId, ref: 'StockLocation' }, // suggested default, not authoritative
    defaultVendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

ItemSchema.index({ institute: 1, code: 1 }, { unique: true });
ItemSchema.index({ institute: 1, name: 1 });

export default mongoose.models.Item || mongoose.model('Item', ItemSchema);
