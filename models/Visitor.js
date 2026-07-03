import mongoose from 'mongoose';
const { Schema } = mongoose;

const VisitorSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    visitorName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    purpose: {
        type: String,
        required: true,
        trim: true
    },
    personToMeet: {
        type: String,
        trim: true
    },
    idProof: {
        type: String,
        trim: true
    },
    idNumber: {
        type: String,
        trim: true
    },
    checkIn: {
        type: Date,
        default: Date.now,
        required: true
    },
    checkOut: {
        type: Date
    },
    status: {
        type: String,
        enum: ['inside', 'left'],
        default: 'inside',
        required: true
    },
    remarks: {
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

VisitorSchema.index({ institute: 1, deletedAt: 1 });

delete mongoose.models.Visitor;
export default mongoose.models.Visitor || mongoose.model('Visitor', VisitorSchema);
