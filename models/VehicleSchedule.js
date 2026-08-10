import mongoose from 'mongoose';
const { Schema } = mongoose;

const VehicleScheduleSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    driver: { type: Schema.Types.ObjectId, ref: 'Driver', required: true, index: true },
    route: { type: Schema.Types.ObjectId, ref: 'TransportRoute', required: true, index: true },
    shift: { type: String, enum: ['pickup', 'drop'], required: true },
    weekdays: { type: [Number], default: [1, 2, 3, 4, 5, 6] }, // 1-6 (Mon-Sat)
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

VehicleScheduleSchema.index({ vehicle: 1, route: 1, shift: 1 }, { unique: true });
VehicleScheduleSchema.index({ institute: 1, shift: 1 });

export default mongoose.models.VehicleSchedule || mongoose.model('VehicleSchedule', VehicleScheduleSchema);
