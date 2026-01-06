import mongoose from 'mongoose';
const { Schema } = mongoose;

const EnquirySchema = new Schema({
    institute: {
        type: Schema.Types.ObjectId,
        ref: 'Institute',
        required: true,
        index: true
    },
    studentName: { type: String, required: true, trim: true },
    fatherName: { type: String, trim: true },
    contactNumber: {
        type: String,
        required: true,
        trim: true,
        match: [/^\d{10}$/, 'Invalid contact number']
    },
    standard: { type: String, trim: true }, // Grade/Class
    course: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    address: { type: String, trim: true },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Rejected'],
        default: 'Pending'
    },
    enquiryDate: { type: Date, default: Date.now },
    expectedConfirmationDate: { type: Date },
    followUpDate: { type: Date },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

EnquirySchema.index({ studentName: 'text', contactNumber: 'text' });

export default mongoose.models.Enquiry || mongoose.model('Enquiry', EnquirySchema);
