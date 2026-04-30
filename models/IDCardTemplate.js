import mongoose from "mongoose";

const ElementSchema = new mongoose.Schema({
    x: { type: Number, default: 50 },
    y: { type: Number, default: 50 },
    fontSize: { type: Number, default: 12 },
    fontFamily: { type: String, default: "Arial" },
    fontWeight: { type: String, default: "normal" },
    color: { type: String, default: "#000000" },
    textAlign: { type: String, default: "center" },
    textTransform: { type: String, default: "none" },
    enabled: { type: Boolean, default: true },
    
    // Field identification
    type: { type: String, enum: ["text", "image", "qr", "static"], default: "text" },
    fieldKey: { type: String }, // e.g., 'profile.firstName', 'grNumber'
    staticText: { type: String }, // for static text elements
    label: { type: String }, // User-friendly label in editor
    
    // Image/Shape specific
    width: { type: Number },
    height: { type: Number },
    borderRadius: { type: Number },
    borderWidth: { type: Number },
    borderColor: { type: String },
    shape: { type: String },
    
    // QR specific
    size: { type: Number },
    dataMode: { type: String }
}, { _id: false });

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
    
    // Dynamic placeholder configurations
    frontPlaceholders: {
        type: Map,
        of: ElementSchema,
        default: {}
    },
    
    backPlaceholders: {
        type: Map,
        of: ElementSchema,
        default: {}
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
    
    institute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Institute",
        required: true,
        index: true
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
IDCardTemplateSchema.index({ institute: 1, isDefault: 1 });
IDCardTemplateSchema.index({ institute: 1, createdAt: -1 });

export default mongoose.models.IDCardTemplate || mongoose.model("IDCardTemplate", IDCardTemplateSchema);
