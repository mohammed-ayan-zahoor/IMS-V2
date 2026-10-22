import mongoose from "mongoose";
const { Schema } = mongoose;

const KioskDeviceSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    institute: {
        type: Schema.Types.ObjectId,
        ref: "Institute",
        required: true,
        index: true
    },
    keyPrefix: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    keyHash: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    lastSeenAt: {
        type: Date,
        default: null
    },
    revokedAt: {
        type: Date,
        default: null
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    deviceInfo: {
        model: { type: String, trim: true },
        osVersion: { type: String, trim: true },
        appVersion: { type: String, trim: true }
    }
}, { timestamps: true });

delete mongoose.models.KioskDevice;

export default mongoose.models.KioskDevice || mongoose.model("KioskDevice", KioskDeviceSchema);
