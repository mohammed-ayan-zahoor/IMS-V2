
import mongoose from 'mongoose';

const { Schema } = mongoose;

const CertificateSchema = new Schema({
    studentId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    institutionId: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },

    batchId: {
        type: Schema.Types.ObjectId,
        ref: 'Batch',
        default: null,
        index: true
    },

    certificateNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    templateType: {
        type: String,
        enum: ['STANDARD', 'CUSTOM', 'CUSTOM_SCHOOL'],
        default: 'STANDARD',
    },

    // Template configuration used for this certificate
    template: {
        type: Schema.Types.Mixed,
        default: null,
        /*
    Example:
    {
        templateId: ObjectId,
        templateName: "Modern",
        styles: {...},
        placeholders: {...},
        htmlTemplate: null
    }
*/
    },

    issueDate: {
        type: Date,
        default: Date.now,
        required: true
    },

    expiryDate: {
        type: Date,
        default: null
    },

    metadata: {
        type: Schema.Types.Mixed, //flexible JSON
        default: {}
        /*
    Example:
    {
        courseName: "Full Stack Web Dev",
        duration: "6 months",
        grade: "A+"
    }
*/
    },

    pdfUrl: {
        type: String,
        required: false,
        default: null
    },

    status: {
        type: String,
        enum: ['GENERATED', 'ISSUED', 'REVOKED'],
        default: 'GENERATED',
        index: true
    },
    // Full snapshot of the template configuration at time of issuance
    snapshot: {
        type: Schema.Types.Mixed,
        default: null
    },

    isDuplicate: {
        type: Boolean,
        default: false
    },

    originalCertificateId: {
        type: Schema.Types.ObjectId,
        ref: 'Certificate',
        default: null
    },

    academicYear: {
        type: String,
        index: true
    },

    visibleToStudent: {
        type: Boolean,
        default: false,
        index: true
    }

},
    {
        timestamps : true
    });


//ensure certificate uniqueness per system
// (Redundant index removed, already defined in schema fields)

//fast lookup certificate by students
CertificateSchema.index({ studentId: 1, createdAt: -1 });

// Unique index for student+batch combination to ensure only one cert per student per batch
CertificateSchema.index({ studentId: 1, batchId: 1 }, { sparse: true });

//fast lookup institution level reports
CertificateSchema.index({ institutionId: 1, createdAt: -1 });

// For fast lookup: "all certificates for a student"
CertificateSchema.index({ studentId: 1, status: 1 });

// For institutional reports
CertificateSchema.index({ institutionId: 1, status: 1, issueDate: -1 });

// Virtual for expiry checking
CertificateSchema.virtual('isExpired').get(function () {
    if (!this.expiryDate) return false;
    return new Date() > this.expiryDate;
});


export default mongoose.models.Certificate || mongoose.model('Certificate', CertificateSchema);
