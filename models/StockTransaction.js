import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * Movement ledger for CONSUMABLE items only (trackingType: 'consumable').
 * Mirrors the Finance Ledger's own direction-based design deliberately:
 * `direction` lets stock-on-hand be computed the exact same way cash balance
 * is — sum(IN) - sum(OUT) before a date = opening; add the day's net = closing.
 * This is intentionally an append-only event log; nothing here is ever
 * mutated after creation. Corrections are made with a new ADJUSTMENT row,
 * never by editing history.
 *
 * NOTE: Whether `item.trackingType === 'consumable'` is enforced at the
 * service/API layer, not with an async pre-save hook here — cross-model
 * lookups on every single transaction write are unnecessary overhead for a
 * check the UI should already prevent (asset items simply shouldn't appear
 * in the "record stock transaction" picker in the first place).
 */
const StockTransactionSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    item: { type: Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    location: { type: Schema.Types.ObjectId, ref: 'StockLocation', required: true, index: true },
    type: { type: String, enum: ['PURCHASE_IN', 'ISSUE_OUT', 'ADJUSTMENT'], required: true },
    direction: { type: String, enum: ['IN', 'OUT'], required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, min: 0 }, // optional metadata now; feeds future valuation reporting without a migration
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' }, // set for PURCHASE_IN
    referenceNo: { type: String, trim: true }, // invoice/GRN/requisition number
    issuedToUser: { type: Schema.Types.ObjectId, ref: 'User' }, // set for ISSUE_OUT to a specific person
    issuedToLabel: { type: String, trim: true }, // set for ISSUE_OUT to a department/room/class rather than a person
    reason: { type: String, trim: true }, // required in practice for ADJUSTMENT (enforced in API layer)
    notes: { type: String, trim: true },
    transactionDate: { type: Date, required: true, default: Date.now },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

StockTransactionSchema.index({ institute: 1, item: 1, transactionDate: -1 });
StockTransactionSchema.index({ institute: 1, location: 1, transactionDate: -1 });

export default mongoose.models.StockTransaction || mongoose.model('StockTransaction', StockTransactionSchema);
