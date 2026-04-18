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
        default: 'STANDARD'
    },

    // Default template for this institute (only one can be default)
    isDefault: {
        type: Boolean,
        default: false
    },

    // CSS styling for the certificate
    styles: {
        backgroundColor: { type: String, default: 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)' },
        borderColor: { type: String, default: '#2c5aa0' },
        borderWidth: { type: Number, default: 3 },
        fontFamily: { type: String, default: 'Georgia, serif' },
        titleColor: { type: String, default: '#2c5aa0' },
        titleFontSize: { type: Number, default: 48 },
        textColor: { type: String, default: '#555' },
        accentColor: { type: String, default: '#2c5aa0' }
    },

    // Placeholder positions and formatting
    placeholders: {
        studentName: {
            enabled: { type: Boolean, default: true },
            label: { type: String, default: 'Student Name' },
            fontSize: { type: Number, default: 36 },
            fontWeight: { type: String, default: 'bold' },
            color: { type: String, default: '#2c5aa0' },
            decoration: { type: String, default: 'underline' },
            position: {
                top: { type: Number, default: 45 }, // percentage
                left: { type: Number, default: 50 },
                width: { type: Number, default: 80 }
            }
        },
        courseName: {
            enabled: { type: Boolean, default: true },
            label: { type: String, default: 'Course Name' },
            fontSize: { type: Number, default: 18 },
            fontWeight: { type: String, default: '600' },
            color: { type: String, default: '#2c5aa0' },
            position: {
                top: { type: Number, default: 55 },
                left: { type: Number, default: 50 },
                width: { type: Number, default: 80 }
            }
        },
        issueDate: {
            enabled: { type: Boolean, default: true },
            label: { type: String, default: 'Date Issued' },
            fontSize: { type: Number, default: 14 },
            color: { type: String, default: '#555' },
            position: {
                bottom: { type: Number, default: 15 },
                left: { type: Number, default: 50 },
                width: { type: Number, default: 80 }
            }
        },
        certificateNumber: {
            enabled: { type: Boolean, default: true },
            label: { type: String, default: 'Certificate #' },
            fontSize: { type: Number, default: 12 },
            color: { type: String, default: '#999' },
            position: {
                bottom: { type: Number, default: 20 },
                right: { type: Number, default: 15 },
                width: { type: Number, default: 20 }
            }
        },
        instituteName: {
            enabled: { type: Boolean, default: true },
            label: { type: String, default: 'Institution Name' },
            fontSize: { type: Number, default: 14 },
            fontWeight: { type: String, default: '600' },
            color: { type: String, default: '#2c5aa0' },
            position: {
                top: { type: Number, default: 10 },
                left: { type: Number, default: 50 },
                width: { type: Number, default: 80 }
            }
        },
        signatureBlock: {
            enabled: { type: Boolean, default: true },
            label: { type: String, default: 'Authorized Signature' },
            position: {
                bottom: { type: Number, default: 15 },
                left: { type: Number, default: 10 },
                width: { type: Number, default: 20 }
            }
        }
    },

    // HTML template for custom rendering
    htmlTemplate: {
        type: String,
        default: null
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
