import mongoose from 'mongoose';
const { Schema } = mongoose;

const DriverSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    altPhone: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    licenseExpiry: { type: Date },
    address: { type: String, trim: true },
    photo: { type: String }, // URL
    assignedVehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' }, // Current assignment
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, index: true }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

DriverSchema.index({ institute: 1, deletedAt: 1 });

export default mongoose.models.Driver || mongoose.model('Driver', DriverSchema);
