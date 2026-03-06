import mongoose from 'mongoose';
const { Schema } = mongoose;

const MembershipSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ['admin', 'instructor', 'staff'],
        required: true
    },
    lastAccessed: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Ensure a user can only have one membership per institute
MembershipSchema.index({ user: 1, institute: 1 }, { unique: true });

export default mongoose.models.Membership || mongoose.model('Membership', MembershipSchema);
