import mongoose from 'mongoose';
const { Schema } = mongoose;

const WebsiteConfigSchema = new Schema({
    instituteId: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        unique: true,
        index: true
    },
    domain: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true
    },
    subdomain: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    template: {
        type: String,
        enum: ['VOCATIONAL', 'SCHOOL', 'CUSTOM'],
        default: 'SCHOOL'
    },
    branding: {
        logo: String,
        favicon: String,
        primaryColor: { type: String, default: '#3B82F6' },
        secondaryColor: { type: String, default: '#8B5CF6' },
        fontFamily: { type: String, default: 'Inter' }
    },
    settings: {
        seoTitle: String,
        seoDescription: String,
        googleAnalyticsId: String,
        headerConfig: {
            showSocialLinks: { type: Boolean, default: true },
            sticky: { type: Boolean, default: true }
        },
        footerConfig: {
            text: String,
            showNewsletter: { type: Boolean, default: true }
        }
    },

    // Theme preset — controls the visual design of the public website
    theme: {
        preset: {
            type: String,
            enum: ['modern', 'classic', 'bold', 'minimal', 'dark'],
            default: 'modern'
        }
    }
}, { 
    timestamps: true 
});

// Safe export for Next.js
if (process.env.NODE_ENV !== 'production') delete mongoose.models.WebsiteConfig;
export default mongoose.models.WebsiteConfig || mongoose.model('WebsiteConfig', WebsiteConfigSchema);
