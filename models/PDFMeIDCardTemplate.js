import mongoose from "mongoose";

const PDFMeIDCardTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    
    // The main pdfme JSON template configuration
    // Contains: basePdf, schemas, and columns
    templateJson: {
        type: mongoose.Schema.Types.Mixed,
        required: true
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
PDFMeIDCardTemplateSchema.index({ institute: 1, isDefault: 1 });
PDFMeIDCardTemplateSchema.index({ institute: 1, createdAt: -1 });

export default mongoose.models.PDFMeIDCardTemplate || mongoose.model("PDFMeIDCardTemplate", PDFMeIDCardTemplateSchema);
