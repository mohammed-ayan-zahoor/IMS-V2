import mongoose from 'mongoose';
const { Schema } = mongoose;

const MessageSchema = new Schema({
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    // For file attachments later
    attachment: {
        url: String,
        type: { type: String, enum: ['image', 'document', 'video', 'audio'] },
        name: String
    },
    // For replying to specific messages
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
    deletedAt: { type: Date, index: true, default: null }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index to query messages for a specific conversation efficiently, sorted by time
MessageSchema.index({ conversationId: 1, createdAt: 1 });

if (mongoose.models.Message) {
    delete mongoose.models.Message;
}

export default mongoose.model('Message', MessageSchema);
