import mongoose from 'mongoose';
const { Schema } = mongoose;

const SharedLinkSchema = new Schema({
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    institutes: [{
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true
    }],
    name: {
        type: String, // Friendly label for Super Admin
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    visitors: [{
        name: String,
        lastVisited: { type: Date, default: Date.now }
    }],
    comments: [{
        visitorName: { type: String, required: true },
        studentId: { type: Schema.Types.ObjectId, ref: 'User' }, // Student the comment is about
        text: { type: String, required: true },
        followUpDate: { type: Date },
        createdAt: { type: Date, default: Date.now }
    }],
    settings: {
        allowComments: { type: Boolean, default: true },
        requireName: { type: Boolean, default: true }
    }
}, {
    timestamps: true
});

// Index for performance
SharedLinkSchema.index({ slug: 1 });
SharedLinkSchema.index({ isActive: 1 });

export default mongoose.models.SharedLink || mongoose.model('SharedLink', SharedLinkSchema);
