import mongoose from 'mongoose';
const { Schema } = mongoose;

const CollectorSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    accountType: {
        type: String,
        enum: ['Person', 'Bank'],
        default: 'Person'
    },
    phone: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    accountNumber: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    designation: String
}, { timestamps: true });

CollectorSchema.index({ institute: 1, name: 1 }, { unique: true });

export default mongoose.models.Collector || mongoose.model('Collector', CollectorSchema);
