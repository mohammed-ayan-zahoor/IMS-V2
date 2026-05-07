import mongoose from 'mongoose';
const { Schema } = mongoose;

const StopSchema = new Schema({
    name: { type: String, required: true, trim: true },
    pickupTime: { 
        type: String, 
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    dropTime: { 
        type: String, 
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    order: { type: Number, default: 0 }
}, { _id: true });

const TransportRouteSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    stops: [StopSchema],
    distance: { type: Number, min: 0 }, // In km
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, index: true }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

TransportRouteSchema.index({ institute: 1, deletedAt: 1 });
TransportRouteSchema.index(
    { institute: 1, name: 1 }, 
    { unique: true, partialFilterExpression: { deletedAt: null } }
);

export default mongoose.models.TransportRoute || mongoose.model('TransportRoute', TransportRouteSchema);
