import mongoose from 'mongoose';

const { Schema } = mongoose;

const ElementSchema = new Schema({
    x: { type: Number, default: 50 },
    y: { type: Number, default: 50 },
    fontSize: { type: Number, default: 24 },
    fontFamily: { type: String, default: "Roboto" },
    fontWeight: { type: String, default: "normal" },
    fontStyle: { type: String, default: "normal" },
    color: { type: String, default: "#000000" },
    textAlign: { type: String, default: "center" },
    textTransform: { type: String, default: "none" },
    enabled: { type: Boolean, default: true },
    maxWidth: { type: Number, default: 80 },

    // Field identification
    type: { type: String, enum: ["text", "image", "qr", "static"], default: "text" },
    fieldKey: { type: String }, // e.g., 'profile.firstName', 'grNumber'
    staticText: { type: String }, // for static text elements
    label: { type: String }, // User-friendly label in editor

    // QR/Image specific (optional for certificates but good for future)
    width: { type: Number },
    height: { type: Number }
}, { _id: false });

const CertificateTemplateSchema = new Schema({
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

    description: {
        type: String,
        trim: true
    },

    // Render mode: IMAGE_OVERLAY (canvas) or HTML_TEMPLATE (puppeteer)
    renderMode: {
        type: String,
        enum: ['IMAGE_OVERLAY', 'HTML_TEMPLATE'],
        default: 'IMAGE_OVERLAY'
    },

    // Document category
    category: {
        type: String,
        enum: ['GENERAL', 'LEAVING_CERTIFICATE', 'TRANSFER_CERTIFICATE', 'BONAFIDE'],
        default: 'GENERAL'
    },

    // HTML/CSS content for HTML_TEMPLATE mode
    htmlTemplate: {
        type: String,
        default: null
    },

    cssContent: {
        type: String,
        default: null
    },

    // Schema defining available placeholders and their data mapping
    placeholderSchema: {
        type: Schema.Types.Mixed,
        default: []
    },

    // A4, Portrait/Landscape, Margins in mm
    pageConfig: {
        size: { type: String, default: 'A4' },
        orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
        margins: {
            top: { type: Number, default: 15 },
            bottom: { type: Number, default: 15 },
            left: { type: Number, default: 15 },
            right: { type: Number, default: 15 }
        }
    },

    // System templates provided by the platform
    isSystemTemplate: {
        type: Boolean,
        default: false
    },

    // Self-reference for cloned templates
    parentTemplateId: {
        type: Schema.Types.ObjectId,
        ref: 'CertificateTemplate',
        default: null
    },

    // Template type (UI/Visual style)
    type: {
        type: String,
        enum: ['STANDARD', 'MODERN', 'ELEGANT', 'PROFESSIONAL', 'CUSTOM'],
        default: 'CUSTOM'
    },

    // Template design image
    imageUrl: {
        type: String,
        default: null
    },

    // Default template for this institute
    isDefault: {
        type: Boolean,
        default: false
    },

    // Dynamic placeholder configurations
    placeholders: {
        type: Map,
        of: ElementSchema,
        default: {}
    },

    // Created and managed by
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    deletedAt: {
        type: Date,
        default: null,
        index: true
    }
}, {
    timestamps: true
});

// Ensure only one default template per institute
CertificateTemplateSchema.index({ institute: 1, isDefault: 1 }, { partialFilterExpression: { isDefault: true, deletedAt: null } });

// Pre-save hook to ensure only one default template per institute
CertificateTemplateSchema.pre('save', async function() {
    // Only proceed if this template is being set as default
    if (!this.isDefault) {
        return;
    }

    // If isDefault hasn't changed, skip the update
    if (!this.isModified('isDefault')) {
        return;
    }

    // Remove default flag from other templates in the same institute
    try {
        await this.constructor.updateMany(
            { institute: this.institute, _id: { $ne: this._id }, deletedAt: null },
            { isDefault: false }
        );
    } catch (error) {
        console.error('Error updating other templates:', error);
        throw error;
    }
});

export default mongoose.models.CertificateTemplate || mongoose.model('CertificateTemplate', CertificateTemplateSchema);
