import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * An individual, serialized piece of equipment (furniture, computers, lab/workshop tools).
 * Only used when Item.trackingType === 'asset'.
 * 
 * Notice: this is a "current state" record, not an append-only log. If full
 * checkout history (who held this projector across the last 3 years) becomes a
 * requirement later, add a separate AssetCheckoutLog collection that gets
 * written alongside every change to `checkout` here (same lesson learned
 * from Collector.currentBalance: a cached "current state" field is fine for
 * an at-a-glance check, but only if something else keeps the real history).
 */
const AssetUnitSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    item: { type: Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    assetTag: { type: String, required: true, trim: true, uppercase: true }, // e.g. "AST-2026-001"
    serialNumber: { type: String, trim: true },
    location: { type: Schema.Types.ObjectId, ref: 'StockLocation', required: true, index: true },
    status: {
        type: String,
        enum: ['available', 'assigned', 'checked_out', 'in_repair', 'lost', 'disposed'],
        default: 'available',
        index: true
    },
    // Current holder — either a permanent assignment (label, e.g. "Room 204")
    // or a person-level checkout (user + dueDate). Both optional; at most one
    // is meaningfully set at a time, enforced at the API layer.
    checkout: {
        holderUser: { type: Schema.Types.ObjectId, ref: 'User' },
        holderLabel: { type: String, trim: true }, // e.g. "Room 204", "Electrical Lab"
        checkedOutAt: Date,
        dueDate: Date
    },
    purchaseDate: Date,
    purchaseCost: { type: Number, min: 0 }, // optional metadata now; feeds future valuation reporting
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    warrantyExpiry: Date,
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

AssetUnitSchema.index({ institute: 1, assetTag: 1 }, { unique: true });

export default mongoose.models.AssetUnit || mongoose.model('AssetUnit', AssetUnitSchema);
