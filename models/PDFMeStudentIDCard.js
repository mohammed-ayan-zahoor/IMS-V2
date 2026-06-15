import mongoose from 'mongoose';

const { Schema } = mongoose;

const PDFMeStudentIDCardSchema = new Schema({
    studentId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    instituteId: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },

    templateId: {
        type: Schema.Types.ObjectId,
        ref: 'PDFMeIDCardTemplate',
        required: true
    },

    pdfUrl: {
        type: String,
        required: true
    },

    pdfPublicId: {
        type: String,
        required: true
    },

    generatedAt: {
        type: Date,
        default: Date.now
    },

    status: {
        type: String,
        enum: ['ACTIVE', 'EXPIRED', 'REVOKED'],
        default: 'ACTIVE',
        index: true
    }
}, {
    timestamps: true
});

// One active ID card per student per institute in the pdfme system
PDFMeStudentIDCardSchema.index({ studentId: 1, instituteId: 1, status: 1 });

export default mongoose.models.PDFMeStudentIDCard || mongoose.model('PDFMeStudentIDCard', PDFMeStudentIDCardSchema);
