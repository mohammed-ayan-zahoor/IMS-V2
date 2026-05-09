import mongoose from 'mongoose';
const { Schema } = mongoose;

const WebsiteNoticeSchema = new Schema({
    instituteId: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    images: [{
        url: String,
        publicId: String
    }],
    link: {
        type: String,
        trim: true
    },
    displayOrder: {
        type: Number,
        default: 0
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'logged-in'],
        default: 'public'
    },
    scheduledStart: Date,
    scheduledEnd: Date,
    status: {
        type: String,
        enum: ['active', 'inactive', 'archived'],
        default: 'active',
        index: true
    },
    stats: {
        views: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 }
    }
}, { 
    timestamps: true 
});

// Safe export for Next.js
if (process.env.NODE_ENV !== 'production') delete mongoose.models.WebsiteNotice;
export default mongoose.models.WebsiteNotice || mongoose.model('WebsiteNotice', WebsiteNoticeSchema);
