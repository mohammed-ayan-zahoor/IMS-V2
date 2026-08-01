import mongoose from 'mongoose';
const { Schema } = mongoose;

const StudentStatusSchema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    stop: { type: String, trim: true },
    status: {
        type: String,
        enum: ['not_boarded', 'on_bus', 'alighted'],
        default: 'not_boarded'
    },
    boardedAt: { type: Date },
    alightedAt: { type: Date }
}, { _id: false });

const BusTripSessionSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    driver: { type: Schema.Types.ObjectId, ref: 'Driver', required: true, index: true },
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    route: { type: Schema.Types.ObjectId, ref: 'TransportRoute', required: true },
    tripType: { type: String, enum: ['pickup', 'drop'], required: true },
    status: {
        type: String,
        enum: ['active', 'completed'],
        default: 'active',
        index: true
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    lastLocation: {
        lat: { type: Number },
        lng: { type: Number },
        heading: { type: Number, default: 0 },
        speed: { type: Number, default: 0 },
        timestamp: { type: Date, default: Date.now }
    },
    studentsOnBoard: [StudentStatusSchema]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

BusTripSessionSchema.index({ institute: 1, status: 1 });
BusTripSessionSchema.index({ driver: 1, status: 1 });

export default mongoose.models.BusTripSession || mongoose.model('BusTripSession', BusTripSessionSchema);
