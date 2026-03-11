import mongoose from 'mongoose';
const { Schema } = mongoose;

const SharedLinkSchema = new Schema({
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    institutes: {
        type: [{
            type: Schema.Types.ObjectId,
            ref: 'Institute'
        }],
        validate: {
            validator: function(v) {
                return Array.isArray(v) && v.length > 0;
            },
            message: 'At least one institute is required'
        }
    },
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
        visitorId: { type: String, required: true, index: true }, // For ownership
        studentId: { type: Schema.Types.ObjectId, ref: 'User' }, // Student the comment is about
        text: { type: String, required: true },
        followUpDate: { type: Date },
        createdAt: { type: Date, default: Date.now }
    }],
    settings: {
        allowComments: { type: Boolean, default: true },
        requireName: { type: Boolean, default: true },
        expiresAt: { type: Date }
    }
}, {
    timestamps: true
});

// Index for performance
SharedLinkSchema.index({ slug: 1 });
SharedLinkSchema.index({ isActive: 1 });

export default mongoose.models.SharedLink || mongoose.model('SharedLink', SharedLinkSchema);
