import mongoose from 'mongoose';
const { Schema } = mongoose;

const HostelBlockSchema = new Schema({
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
    type: {
        type: String,
        enum: ['boys', 'girls', 'mixed'],
        default: 'mixed'
    },
    totalRooms: {
        type: Number,
        default: 0
    },
    floors: {
        type: Number,
        default: 1
    },
    warden: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    wardenName: {
        type: String,
        trim: true
    },
    wardenPhone: {
        type: String,
        trim: true
    },
    amenities: [{
        type: String,
        trim: true
    }],
    isActive: {
        type: Boolean,
        default: true
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

// Compound index to ensure name uniqueness per institute
HostelBlockSchema.index(
    { institute: 1, name: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null } }
);

export default mongoose.models.HostelBlock || mongoose.model('HostelBlock', HostelBlockSchema);
