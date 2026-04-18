import mongoose from 'mongoose';

const { Schema } = mongoose;

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

    // Template type: STANDARD, MODERN, ELEGANT, etc.
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

    // Default template for this institute (only one can be default)
    isDefault: {
        type: Boolean,
        default: false
    },

    // Placeholder positions (percentage-based coordinates)
    placeholders: {
        studentName: {
            enabled: { type: Boolean, default: true },
            x: { type: Number, default: 50 }, // percentage
            y: { type: Number, default: 45 }  // percentage
        },
        courseName: {
            enabled: { type: Boolean, default: true },
            x: { type: Number, default: 50 },
            y: { type: Number, default: 55 }
        },
        issueDate: {
            enabled: { type: Boolean, default: true },
            x: { type: Number, default: 50 },
            y: { type: Number, default: 85 }
        },
        certificateNumber: {
            enabled: { type: Boolean, default: true },
            x: { type: Number, default: 85 },
            y: { type: Number, default: 85 }
        }
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
CertificateTemplateSchema.pre('save', async function(next) {
    if (this.isDefault && !this.isModified('isDefault')) {
        return next();
    }

    if (this.isDefault) {
        // Remove default flag from other templates in the same institute
        await this.constructor.updateMany(
            { institute: this.institute, _id: { $ne: this._id }, deletedAt: null },
            { isDefault: false }
        );
    }
    next();
});

export default mongoose.models.CertificateTemplate || mongoose.model('CertificateTemplate', CertificateTemplateSchema);
