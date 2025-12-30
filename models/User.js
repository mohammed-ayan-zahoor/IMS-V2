import mongoose from 'mongoose';
import Counter from './Counter';
const { Schema } = mongoose;

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    passwordHash: {
        type: String,
        required: true,
        select: false // Never return password in queries
    },
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'student'],
        required: true,
        index: true
    },
    profile: {
        type: {
            firstName: { type: String, required: true },
            lastName: { type: String, required: true },
            phone: { type: String, match: [/^\+?[\d\s-()]+$/, 'Invalid phone number'] },
            avatar: String,
            dateOfBirth: Date,
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
        sparse: true,
        unique: true,
        uppercase: true
    },
    guardianDetails: {
        name: String,
        phone: String,
        relation: { type: String, enum: ['father', 'mother', 'guardian', 'other'] }
    },
    // Security
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordChangeRequested: { type: Boolean, default: false },
    lastLogin: Date,
    // Soft delete
    deletedAt: { type: Date, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
UserSchema.index({ role: 1, deletedAt: 1 });
UserSchema.index({ 'profile.firstName': 'text', 'profile.lastName': 'text' });

// Virtual for full name
UserSchema.virtual('fullName').get(function () {
    if (!this.profile || !this.profile.firstName || !this.profile.lastName) {
        return '';
    }
    return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Pre-save hook to ensure enrollment number for students
UserSchema.pre('save', async function (next) {
    if (this.isNew && this.role === 'student' && !this.enrollmentNumber) {
        try {
            const year = new Date().getFullYear();
            const counter = await Counter.findByIdAndUpdate(
                `student_enrollment_${year}`,
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            if (!counter) throw new Error('Failed to generate sequence');
            this.enrollmentNumber = `STU${year}${String(counter.seq).padStart(4, '0')}`;
        } catch (error) {
            return next(error);
        }
    }
    next();
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
