
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
        validate: {
            validator: function (v) {
                if (this.status === 'ISSUED' && !v) {
                    return false;
                }
                return true;
            },
            message: 'pdfUrl required for ISSUED certificates'
        }
    },

    status: {
        type: String,
        enum: ['GENERATED', 'ISSUED', 'REVOKED'],
        default: 'GENERATED',
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

//optional - auto generate certificate number if not provided
CertificateSchema.pre('save', function (next) {
    if (this.isNew && !this.certificateNumber) {
        this.certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }
    next();
});

export default mongoose.models.Certificate || mongoose.model('Certificate', CertificateSchema);
