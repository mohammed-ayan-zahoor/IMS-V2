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

    // Placeholder positions and styles (percentage-based coordinates + typography)
    placeholders: {
        studentName: {
            enabled: { type: Boolean, default: true },
            x: { type: Number, default: 50 }, // percentage
            y: { type: Number, default: 45 }, // percentage
            fontSize: { type: Number, default: 48 }, // px (relative to 1000px reference width)
            fontFamily: { type: String, default: "Roboto", enum: ["Arial", "Roboto", "Inter", "Lora", "Poppins"] },
            fontWeight: { type: String, default: "bold", enum: ["normal", "bold"] },
            fontStyle: { type: String, default: "normal", enum: ["normal", "italic"] },
            color: { type: String, default: "#000000" }, // hex color
            textAlign: { type: String, default: "center", enum: ["left", "center", "right"] },
            maxWidth: { type: Number, default: 80 } // % of image width
        },
        courseName: {
            enabled: { type: Boolean, default: true },
            x: { type: Number, default: 50 },
            y: { type: Number, default: 55 },
            fontSize: { type: Number, default: 32 },
            fontFamily: { type: String, default: "Roboto", enum: ["Arial", "Roboto", "Inter", "Lora", "Poppins"] },
            fontWeight: { type: String, default: "normal", enum: ["normal", "bold"] },
            fontStyle: { type: String, default: "normal", enum: ["normal", "italic"] },
            color: { type: String, default: "#000000" },
            textAlign: { type: String, default: "center", enum: ["left", "center", "right"] },
            maxWidth: { type: Number, default: 80 }
        },
        issueDate: {
            enabled: { type: Boolean, default: true },
            x: { type: Number, default: 50 },
            y: { type: Number, default: 85 },
            fontSize: { type: Number, default: 24 },
            fontFamily: { type: String, default: "Roboto", enum: ["Arial", "Roboto", "Inter", "Lora", "Poppins"] },
            fontWeight: { type: String, default: "normal", enum: ["normal", "bold"] },
            fontStyle: { type: String, default: "normal", enum: ["normal", "italic"] },
            color: { type: String, default: "#000000" },
            textAlign: { type: String, default: "center", enum: ["left", "center", "right"] },
            maxWidth: { type: Number, default: 80 }
        },
        certificateNumber: {
            enabled: { type: Boolean, default: true },
            x: { type: Number, default: 85 },
            y: { type: Number, default: 85 },
            fontSize: { type: Number, default: 20 },
            fontFamily: { type: String, default: "Roboto", enum: ["Arial", "Roboto", "Inter", "Lora", "Poppins"] },
            fontWeight: { type: String, default: "normal", enum: ["normal", "bold"] },
            fontStyle: { type: String, default: "normal", enum: ["normal", "italic"] },
            color: { type: String, default: "#000000" },
            textAlign: { type: String, default: "center", enum: ["left", "center", "right"] },
            maxWidth: { type: Number, default: 80 }
        },
        duration: {
            enabled: { type: Boolean, default: false },
            x: { type: Number, default: 50 },
            y: { type: Number, default: 65 },
            fontSize: { type: Number, default: 20 },
            fontFamily: { type: String, default: "Roboto", enum: ["Arial", "Roboto", "Inter", "Lora", "Poppins"] },
            fontWeight: { type: String, default: "normal", enum: ["normal", "bold"] },
            fontStyle: { type: String, default: "normal", enum: ["normal", "italic"] },
            color: { type: String, default: "#000000" },
            textAlign: { type: String, default: "center", enum: ["left", "center", "right"] },
            maxWidth: { type: Number, default: 80 }
        },
        grade: {
            enabled: { type: Boolean, default: false },
            x: { type: Number, default: 50 },
            y: { type: Number, default: 70 },
            fontSize: { type: Number, default: 28 },
            fontFamily: { type: String, default: "Roboto", enum: ["Arial", "Roboto", "Inter", "Lora", "Poppins"] },
            fontWeight: { type: String, default: "bold", enum: ["normal", "bold"] },
            fontStyle: { type: String, default: "normal", enum: ["normal", "italic"] },
            color: { type: String, default: "#000000" },
            textAlign: { type: String, default: "center", enum: ["left", "center", "right"] },
            maxWidth: { type: Number, default: 80 }
        },
        instituteName: {
            enabled: { type: Boolean, default: false },
            x: { type: Number, default: 50 },
            y: { type: Number, default: 10 },
            fontSize: { type: Number, default: 24 },
            fontFamily: { type: String, default: "Roboto", enum: ["Arial", "Roboto", "Inter", "Lora", "Poppins"] },
            fontWeight: { type: String, default: "normal", enum: ["normal", "bold"] },
            fontStyle: { type: String, default: "normal", enum: ["normal", "italic"] },
            color: { type: String, default: "#000000" },
            textAlign: { type: String, default: "center", enum: ["left", "center", "right"] },
            maxWidth: { type: Number, default: 80 }
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
CertificateTemplateSchema.pre('save', async function() {
    if (this.isDefault && !this.isModified('isDefault')) {
        return;
    }

    if (this.isDefault) {
        // Remove default flag from other templates in the same institute
        await this.constructor.updateMany(
            { institute: this.institute, _id: { $ne: this._id }, deletedAt: null },
            { isDefault: false }
        );
    }
});

export default mongoose.models.CertificateTemplate || mongoose.model('CertificateTemplate', CertificateTemplateSchema);
