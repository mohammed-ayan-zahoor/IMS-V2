import mongoose from 'mongoose';
const { Schema } = mongoose;

const WebsitePageSchema = new Schema({
    websiteConfigId: {
        type: Schema.Types.ObjectId,
        ref: 'WebsiteConfig',
        required: true,
        index: true
    },
    slug: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
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
    sections: {
        type: [Schema.Types.Mixed], // Flexible array for builder data
        default: []
    },
    layout: {
        type: String,
        default: 'default'
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'scheduled'],
        default: 'public'
    },
    publishedAt: Date,
    draftContent: Schema.Types.Mixed,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { 
    timestamps: true 
});

// Ensure slug is unique per website
WebsitePageSchema.index({ websiteConfigId: 1, slug: 1 }, { unique: true });

// Safe export for Next.js
if (process.env.NODE_ENV !== 'production') delete mongoose.models.WebsitePage;
export default mongoose.models.WebsitePage || mongoose.model('WebsitePage', WebsitePageSchema);
