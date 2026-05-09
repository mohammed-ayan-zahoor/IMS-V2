import mongoose from 'mongoose';
const { Schema } = mongoose;

const WebsiteMediaSchema = new Schema({
    instituteId: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    url: {
        type: String,
        required: true
    },
    publicId: {
        type: String,
        required: true
    },
    title: {
        type: String,
        trim: true
    },
    altText: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        enum: ['gallery', 'banner', 'carousel', 'logo', 'other'],
        default: 'other',
        index: true
    },
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    usage: [{
        pageId: { type: Schema.Types.ObjectId, ref: 'WebsitePage' },
        sectionId: String
    }],
    metadata: {
        width: Number,
        height: Number,
        fileSize: Number,
        format: String
    }
}, { 
    timestamps: true 
});

// Safe export for Next.js
if (process.env.NODE_ENV !== 'production') delete mongoose.models.WebsiteMedia;
export default mongoose.models.WebsiteMedia || mongoose.model('WebsiteMedia', WebsiteMediaSchema);
