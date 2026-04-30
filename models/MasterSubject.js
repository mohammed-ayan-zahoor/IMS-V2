import mongoose from 'mongoose';
const { Schema } = mongoose;

const MasterSubjectSchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    description: {
        type: String,
        maxlength: 1000
    },
    deletedAt: {
        type: Date,
        default: null,
        index: true
    }
}, { timestamps: true });

// Code unique per institute
MasterSubjectSchema.index(
    { institute: 1, code: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null } }
);

// Force recompilation in dev to pick up schema changes
if (process.env.NODE_ENV === 'development') {
    if (mongoose.models.MasterSubject) {
        delete mongoose.models.MasterSubject;
    }
}

export default mongoose.models.MasterSubject || mongoose.model('MasterSubject', MasterSubjectSchema);
