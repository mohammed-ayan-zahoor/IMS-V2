import mongoose from 'mongoose';
const { Schema } = mongoose;

const VehicleSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    registrationNumber: { type: String, required: true, trim: true, uppercase: true },
    type: { 
        type: String, 
        enum: ['Bus', 'Van', 'Auto', 'Car', 'Other'], 
        default: 'Bus' 
    },
    photo: { type: String },
    capacity: { type: Number, required: true, min: 1 },
    make: { type: String, trim: true },   // "Tata" / "Ashok Leyland"
    model: { type: String, trim: true },  // "Starbus"
    year: { type: Number },
    insuranceExpiry: { type: Date },
    fitnessExpiry: { type: Date },
    route: { type: Schema.Types.ObjectId, ref: 'TransportRoute' }, // Currently assigned route
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, index: true }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

VehicleSchema.index({ institute: 1, deletedAt: 1 });
VehicleSchema.index(
    { institute: 1, registrationNumber: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null } }
);
VehicleSchema.index({ route: 1, deletedAt: 1 });

export default mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
