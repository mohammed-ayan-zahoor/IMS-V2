import mongoose from 'mongoose';
const { Schema } = mongoose;

const PostalSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['dispatch', 'receive'],
        required: true
    },
    referenceNo: {
        type: String,
        trim: true
    },
    senderName: {
        type: String,
        trim: true
    },
    senderAddress: {
        type: String,
        trim: true
    },
    receiverName: {
        type: String,
        trim: true
    },
    receiverAddress: {
        type: String,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    postalType: {
        type: String,
        enum: ['letter', 'parcel', 'courier', 'speed_post', 'registered'],
        default: 'courier'
    },
    toFrom: {
        type: String, // who it's from/to inside the institute
        trim: true
    },
    remarks: {
        type: String,
        trim: true
    },
    attachmentUrl: {
        type: String,
        trim: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    deletedAt: {
        type: Date,
        default: null,
        index: true
    }
}, { timestamps: true });

PostalSchema.index({ institute: 1, type: 1, deletedAt: 1 });

delete mongoose.models.Postal;
export default mongoose.models.Postal || mongoose.model('Postal', PostalSchema);
