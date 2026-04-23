import mongoose from "mongoose";

const IDCardTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    
    frontImageUrl: {
        type: String,
        required: true
    },
    
    backImageUrl: {
        type: String,
        required: true
    },
    
    // Front side placeholder configuration
    frontPlaceholders: {
        studentName: {
            x: { type: Number, default: 50 },
            y: { type: Number, default: 30 },
            fontSize: { type: Number, default: 16 },
            fontFamily: { type: String, default: "Arial" },
            fontWeight: { type: String, default: "bold" },
            color: { type: String, default: "#000000" },
            textAlign: { type: String, default: "center" },
            enabled: { type: Boolean, default: true }
        },
        studentPhoto: {
            x: { type: Number, default: 10 },
            y: { type: Number, default: 15 },
            width: { type: Number, default: 25 },
            height: { type: Number, default: 30 },
            enabled: { type: Boolean, default: true }
        },
        studentId: {
            x: { type: Number, default: 50 },
            y: { type: Number, default: 50 },
            fontSize: { type: Number, default: 12 },
            fontFamily: { type: String, default: "Arial" },
            fontWeight: { type: String, default: "normal" },
            color: { type: String, default: "#000000" },
            textAlign: { type: String, default: "center" },
            enabled: { type: Boolean, default: true }
        },
        batch: {
            x: { type: Number, default: 50 },
            y: { type: Number, default: 62 },
            fontSize: { type: Number, default: 11 },
            fontFamily: { type: String, default: "Arial" },
            fontWeight: { type: String, default: "normal" },
            color: { type: String, default: "#000000" },
            textAlign: { type: String, default: "center" },
            enabled: { type: Boolean, default: true }
        },
        rollNumber: {
            x: { type: Number, default: 50 },
            y: { type: Number, default: 73 },
            fontSize: { type: Number, default: 11 },
            fontFamily: { type: String, default: "Arial" },
            fontWeight: { type: String, default: "normal" },
            color: { type: String, default: "#000000" },
            textAlign: { type: String, default: "center" },
            enabled: { type: Boolean, default: false }
        },
        dateOfAdmission: {
            x: { type: Number, default: 50 },
            y: { type: Number, default: 84 },
            fontSize: { type: Number, default: 10 },
            fontFamily: { type: String, default: "Arial" },
            fontWeight: { type: String, default: "normal" },
            color: { type: String, default: "#000000" },
            textAlign: { type: String, default: "center" },
            enabled: { type: Boolean, default: false }
        }
    },
    
    // Back side placeholder configuration
    backPlaceholders: {
        instituteName: {
            x: { type: Number, default: 50 },
            y: { type: Number, default: 10 },
            fontSize: { type: Number, default: 14 },
            fontFamily: { type: String, default: "Arial" },
            fontWeight: { type: String, default: "bold" },
            color: { type: String, default: "#000000" },
            textAlign: { type: String, default: "center" },
            enabled: { type: Boolean, default: true }
        },
        validity: {
            x: { type: Number, default: 50 },
            y: { type: Number, default: 40 },
            fontSize: { type: Number, default: 11 },
            fontFamily: { type: String, default: "Arial" },
            fontWeight: { type: String, default: "normal" },
            color: { type: String, default: "#000000" },
            textAlign: { type: String, default: "center" },
            enabled: { type: Boolean, default: true }
        },
        qrCode: {
            x: { type: Number, default: 50 },
            y: { type: Number, default: 60 },
            size: { type: Number, default: 20 },
            enabled: { type: Boolean, default: true }
        },
        disclaimer: {
            x: { type: Number, default: 50 },
            y: { type: Number, default: 85 },
            fontSize: { type: Number, default: 8 },
            fontFamily: { type: String, default: "Arial" },
            fontWeight: { type: String, default: "normal" },
            color: { type: String, default: "#666666" },
            textAlign: { type: String, default: "center" },
            enabled: { type: Boolean, default: false }
        }
    },
    
    // Card dimensions in mm (ISO/IEC 7810 ID-1)
    cardDimensions: {
        width: { type: Number, default: 85.6 },
        height: { type: Number, default: 53.98 }
    },
    
    isDefault: {
        type: Boolean,
        default: false
    },
    
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
IDCardTemplateSchema.index({ isDefault: 1 });
IDCardTemplateSchema.index({ createdAt: -1 });

export default mongoose.models.IDCardTemplate || mongoose.model("IDCardTemplate", IDCardTemplateSchema);
