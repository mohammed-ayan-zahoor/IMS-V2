import mongoose from 'mongoose';
const { Schema } = mongoose;

const HostelRoomSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    block: {
        type: Schema.Types.ObjectId,
        ref: 'HostelBlock',
        required: true,
        index: true
    },
    roomNumber: {
        type: String,
        required: true,
        trim: true
    },
    floor: {
        type: Number,
        default: 0
    },
    type: {
        type: String,
        enum: ['single', 'double', 'triple', 'dormitory'],
        default: 'double'
    },
    capacity: {
        type: Number,
        required: true,
        min: 1
    },
    monthlyRent: {
        type: Number,
        required: true,
        min: 0
    },
    amenities: [{
        type: String,
        trim: true
    }],
    deletedAt: {
        type: Date,
        default: null,
        index: true
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound index to ensure room number is unique within a block per institute
HostelRoomSchema.index(
    { institute: 1, block: 1, roomNumber: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null } }
);

export default mongoose.models.HostelRoom || mongoose.model('HostelRoom', HostelRoomSchema);
