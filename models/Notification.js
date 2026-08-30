import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
    {
        institute: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Institute",
            required: true,
            index: true
        },
        recipientRole: {
            type: String,
            enum: ["super_admin", "admin", "instructor", "staff", "student"],
            default: "admin"
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        message: {
            type: String,
            required: true,
            trim: true
        },
        type: {
            type: String,
            enum: ["LEAVE_REQUEST", "ADMISSION", "ENQUIRY", "COMPLAINT", "SYSTEM", "NOTICE", "ATTENDANCE", "FEE_DUE", "FEE_PAYMENT", "TIMELINE", "CHAT"],
            default: "SYSTEM"
        },
        link: {
            type: String,
            default: ""
        },
        read: {
            type: Boolean,
            default: false
        },
        metadata: {
            type: Object,
            default: {}
        }
    },
    { timestamps: true }
);

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
