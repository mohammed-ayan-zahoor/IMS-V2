import mongoose from 'mongoose';
const { Schema } = mongoose;

const InstituteSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        match: [/^[A-Z0-9_-]+$/, 'Code must be alphanumeric with underscores/hyphens'],
        index: true
    },

    // Contact Information
    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        pincode: String
    },
    contactEmail: {
        type: String,
        required: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Invalid email']
    },
    contactPhone: String,
    website: String,

    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'trial'],
        default: 'active',
        index: true
    },

    // Subscription (for SaaS billing)
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'basic', 'professional', 'enterprise'],
            default: 'free'
        },
        startDate: Date,
        endDate: Date,
        isActive: { type: Boolean, default: true }
    },

    // Limits & Quotas
    limits: {
        maxStudents: { type: Number, default: 100 },
        maxAdmins: { type: Number, default: 5 },
        maxCourses: { type: Number, default: 20 },
        maxStorageGB: { type: Number, default: 5 }
    },

    // Current Usage (updated periodically)
    usage: {
        studentCount: { type: Number, default: 0 },
        adminCount: { type: Number, default: 0 },
        courseCount: { type: Number, default: 0 },
        storageUsedGB: { type: Number, default: 0 }
    },

    // Branding & Customization
    branding: {
        logo: String, // URL to logo
        primaryColor: { type: String, default: '#3B82F6' },
        secondaryColor: { type: String, default: '#8B5CF6' },
        favicon: String
    },

    // Settings
    settings: {
        timezone: { type: String, default: 'UTC' },
        dateFormat: { type: String, default: 'YYYY-MM-DD' },
        currency: { type: String, default: 'USD' },
        language: { type: String, default: 'en' },
        receiptTemplate: {
            type: String,
            enum: ['classic', 'compact'],
            default: 'classic'
        },

        // Feature toggles
        features: {
            exams: { type: Boolean, default: true },
            attendance: { type: Boolean, default: true },
            fees: { type: Boolean, default: true },
            materials: { type: Boolean, default: true }
        },

        // Email settings
        emailNotifications: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false }
    },

    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Super Admin who created it
    isActive: { type: Boolean, default: true },
    deletedAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
InstituteSchema.index({ status: 1, isActive: 1 });
InstituteSchema.index({ name: 'text' });

// Virtual: Check if subscription is expired
InstituteSchema.virtual('isSubscriptionExpired').get(function () {
    if (!this.subscription.endDate) return false;
    return new Date() > this.subscription.endDate;
});

// Method: Check if limit is reached
InstituteSchema.methods.isLimitReached = function (limitType) {
    const limits = {
        students: this.usage.studentCount >= this.limits.maxStudents,
        admins: this.usage.adminCount >= this.limits.maxAdmins,
        courses: this.usage.courseCount >= this.limits.maxCourses,
        storage: this.usage.storageUsedGB >= this.limits.maxStorageGB
    };
    return limits[limitType] || false;
};

// Method: Update usage statistics
InstituteSchema.methods.updateUsage = async function () {
    const User = mongoose.model('User');
    const Course = mongoose.model('Course');

    try {
        const [studentCount, adminCount, courseCount] = await Promise.all([
            User.countDocuments({ institute: this._id, role: 'student', isActive: true }),
            User.countDocuments({ institute: this._id, role: { $in: ['admin', 'instructor'] }, isActive: true }),
            Course.countDocuments({ institute: this._id, isActive: true })
        ]);

        // Direct update to avoid triggering pre-save hooks and for atomicity
        await this.constructor.updateOne(
            { _id: this._id },
            {
                $set: {
                    'usage.studentCount': studentCount,
                    'usage.adminCount': adminCount,
                    'usage.courseCount': courseCount
                    // storageUsedGB remains 0 for now
                }
            }
        );

        // Update local instance to reflect changes if needed immediately
        this.usage.studentCount = studentCount;
        this.usage.adminCount = adminCount;
        this.usage.courseCount = courseCount;

    } catch (error) {
        console.error(`Failed to update usage for institute ${this._id}:`, error);
        // We choose not to throw so it doesn't block other operations calling this
    }
};

export default mongoose.models.Institute || mongoose.model('Institute', InstituteSchema);
