import mongoose from 'mongoose';
const { Schema } = mongoose;

const VendorSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    gstin: { type: String, trim: true, uppercase: true },
    address: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

VendorSchema.index({ institute: 1, name: 1 }, { unique: true });

export default mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);
