import mongoose from 'mongoose';
const { Schema } = mongoose;

const CollectorTransferSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    fromCollector: {
        type: Schema.Types.ObjectId,
        ref: 'Collector',
        required: true
    },
    toCollector: {
        type: Schema.Types.ObjectId,
        ref: 'Collector',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    transferDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    referenceNumber: {
        type: String,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    },
    recordedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

export default mongoose.models.CollectorTransfer || mongoose.model('CollectorTransfer', CollectorTransferSchema);
