import mongoose from 'mongoose';

const { Schema } = mongoose;

const StudentIDCardSchema = new Schema({
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
        ref: 'IDCardTemplate',
        required: true
    },

    frontImageUrl: {
        type: String,
        required: true
    },

    backImageUrl: {
        type: String,
        required: true
    },

    frontPublicId: String,
    backPublicId: String,

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

// One active ID card per student per institute
StudentIDCardSchema.index({ studentId: 1, instituteId: 1, status: 1 });

export default mongoose.models.StudentIDCard || mongoose.model('StudentIDCard', StudentIDCardSchema);
