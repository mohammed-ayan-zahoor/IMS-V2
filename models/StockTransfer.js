import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * Movement of CONSUMABLE stock between two of the institute's own locations.
 * Deliberately its own model rather than a 'TRANSFER' value inside
 * StockTransaction.type — a transfer inherently needs two locations, which a
 * single `location` field can't represent. Mirrors CollectorTransfer exactly.
 */
const StockTransferSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    item: { type: Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    fromLocation: { type: Schema.Types.ObjectId, ref: 'StockLocation', required: true },
    toLocation: { type: Schema.Types.ObjectId, ref: 'StockLocation', required: true },
    quantity: { type: Number, required: true, min: 0 },
    transferDate: { type: Date, default: Date.now, required: true },
    referenceNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

StockTransferSchema.index({ institute: 1, item: 1, transferDate: -1 });

export default mongoose.models.StockTransfer || mongoose.model('StockTransfer', StockTransferSchema);
