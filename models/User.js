import mongoose from 'mongoose';
import './Counter.js'; // Ensure schema is registered
const { Schema } = mongoose;
const UserSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: false, // Primary/initial institute; optional for roles like super_admin. Multi-institute access is managed via the Membership model.
        index: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    passwordHash: {
        type: String,
        required: true,
        select: false // Never return password in queries
    },
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'instructor', 'staff', 'student'],
        required: true,
        index: true
    },
    // RBAC: Assignments for Instructors/Staff
    assignments: {
        batches: [{ type: Schema.Types.ObjectId, ref: 'Batch' }],
        courses: [{ type: Schema.Types.ObjectId, ref: 'Course' }]
    },
    profile: {
        type: {
            firstName: { type: String, required: true },
            lastName: { type: String, required: true },
            phone: { type: String, match: [/^\+?[\d\s-()]+$/, 'Invalid phone number'] },
            gender: { type: String, enum: ['Male', 'Female', 'Other', 'Not Specified', ''] },
            avatar: String,
            bio: { type: String, maxLength: 500 },
            socialLinks: {
                linkedin: String,
                github: String,
                portfolio: String
            },
            dateOfBirth: Date,
            bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Not Known', ''] },
            address: {
                street: String,
                city: String,
                state: String,
                pincode: String
            }
        },
        required: true
    },
    // Student-specific fields
    enrollmentNumber: {
        type: String,
        // sparse: true, // Removed to avoid duplicate index warning (covered by partial index below)
        // unique: true, // Moved to index with partialFilterExpression
        uppercase: true
    },
    guardianDetails: {
        name: String,
        phone: String,
        relation: { type: String, enum: ['father', 'mother', 'guardian', 'other', ''] }
    },
    referredBy: { type: String, trim: true },

    // Advanced Student Metadata (Optional for Certificates)
    grNumber: String,
    studentIdUdise: String,
    aadharNumber: String,
    apaarId: String,
    penNumber: String,

    fatherName: String,
    fatherAadhar: String,
    motherName: String,
    motherAadhar: String,

    nationality: { type: String, default: 'Indian' },
    motherTongue: String,
    religion: String,
    caste: String,
    subCaste: String,

    placeOfBirth: {
        city: String,
        taluka: String,
        district: String,
        state: String,
        country: { type: String, default: 'India' }
    },

    lastSchoolAttended: String,
    admissionDate: Date,
    admissionStd: String,
    leavingDate: Date,
    leavingReason: String,
    studyingSinceStandard: String,

    progress: { type: String, default: 'Good' },
    conduct: { type: String, default: 'Good' },
    remarks: String,

    // Security
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordChangeRequested: { type: Boolean, default: false },
    lastLogin: Date,
    // Soft delete
    deletedAt: { type: Date, index: true, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
        type: String,
        enum: ['ACTIVE', 'COMPLETED', 'DROPPED', 'PAUSED'],
        default: 'ACTIVE',
        index: true,
        validate: {
            validator: function (value) {
                // if the role is not student, status should always be ACTIVE
                if (this.role !== 'student' && value !== 'ACTIVE') return false;
                return true; // For students, any status is valid
            },
            message: 'only students can have life cycle statuses'
        }
    },
    completedAt: {
        type: Date,
        default: null
    },
    certificateId: {
        type: Schema.Types.ObjectId,
        ref: 'Certificate',
        default: null
    },
    completionReason: {
        type: String,
        trim: true,
    },
    documents: [{
        name: { type: String, required: true },
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        category: { 
            type: String, 
            enum: ['Aadhar', 'Photo', 'Marksheet', 'Certificate', 'Birth Certificate', 'Previous TC', 'Other'], 
            default: 'Other' 
        },
        uploadedAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});



// Email is now globally unique for non-deleted users (deletedAt === null)
UserSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
// Enrollment remains scoped by institute and required for students (where enrollmentNumber exists)
UserSchema.index({ institute: 1, enrollmentNumber: 1 }, { unique: true, partialFilterExpression: { deletedAt: null, enrollmentNumber: { $exists: true } } });
UserSchema.index({ institute: 1, role: 1, deletedAt: 1 });
// Virtual for full name
UserSchema.virtual('fullName').get(function () {
    if (!this.profile || !this.profile.firstName || !this.profile.lastName) {
        return '';
    }
    return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Virtual for active status
UserSchema.virtual('isActive').get(function () {
    return !this.deletedAt;
});

// Pre-save hook to ensure enrollment number for students
UserSchema.pre('save', async function () {
    // 1. Enrollment Number Generation
    if (this.isNew && this.role === 'student' && !this.enrollmentNumber) {
        try {
            const year = new Date().getFullYear();
            const counter = await mongoose.model('Counter').findByIdAndUpdate(
                `student_enrollment_${year}`,
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );

            if (!counter) throw new Error('Failed to generate sequence');
            this.enrollmentNumber = `STU${year}${String(counter.seq).padStart(4, '0')}`;
        } catch (err) {
            console.error("Enrollment ID Gen Error:", err);
            throw err;
        }
    }

    // 2. Assignment Validation (RBAC)
    if (this.isModified('assignments') || this.isModified('role')) {
        const allowedRoles = ['instructor', 'staff'];
        // If has assignments but role is NOT allowed
        if ((this.assignments?.batches?.length > 0 || this.assignments?.courses?.length > 0) && !allowedRoles.includes(this.role)) {
            console.warn(`Clearing assignments for user with disallowed role: ${this.role}`);
            this.assignments = { batches: [], courses: [] };
        }
    }

    // 3. Completion Logic Enforcement
    if (this.isModified('status')) {
        if (this.status === 'COMPLETED') {
            if (!this.completedAt) {
                this.completedAt = new Date(); // auto-fix
            }
        } else if (this.isDirectModified('status')) {
            // If status changed away from COMPLETED (only if it was previously completed)
            // We use a simple check or rely on the fact that these should be null for other statuses
            this.completedAt = null;
            this.certificateId = null;
        }
    }
});

// Indexes
UserSchema.index({ role: 1, deletedAt: 1 });
UserSchema.index({ 'profile.firstName': 'text', 'profile.lastName': 'text' });
// Multikey indexes for fast lookup of "Which users are assigned to Batch X?"
UserSchema.index({ 'assignments.batches': 1 });
UserSchema.index({ 'assignments.courses': 1 });
// Dashboard efficiency
UserSchema.index({ institute: 1, status: 1, role: 1 });

// Force re-compilation of model to ensure virtuals and hooks are updated in Dev
// if (mongoose.models.User) {
//    delete mongoose.models.User;
// }

export default mongoose.models.User || mongoose.model('User', UserSchema);
