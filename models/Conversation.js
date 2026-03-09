import mongoose from 'mongoose';
const { Schema } = mongoose;

const ConversationSchema = new Schema({
    institute: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    type: {
        type: String,
        enum: ['direct', 'batch'],
        required: true
    },
    participants: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }],
    batch: {
        type: Schema.Types.ObjectId,
        ref: 'Batch',
        index: true,
        // Only needed if type is 'batch'
        required: function () { return this.type === 'batch'; }
    },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    deletedAt: { type: Date, index: true, default: null }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for faster lookups
ConversationSchema.index({ type: 1, deletedAt: 1 });
ConversationSchema.index({ 'participants': 1, lastMessageAt: -1 });

export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
