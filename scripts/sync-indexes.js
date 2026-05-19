const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/ims-v2';

// Import Subject schema to register the model
const ChapterSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 }
});

const SubjectSchema = new mongoose.Schema({
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
    masterSubject: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterSubject', index: true },
    description: { type: String, maxlength: 1000 },
    syllabus: [new mongoose.Schema({ title: String })],
    deletedAt: { type: Date, default: null, index: true }
}, { timestamps: true });

SubjectSchema.index(
    { course: 1, masterSubject: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null, masterSubject: { $exists: true } } }
);

SubjectSchema.index(
    { course: 1, code: 1 },
    { unique: true, partialFilterExpression: { deletedAt: null } }
);

const Subject = mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);

async function run() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected successfully!");

        console.log("Syncing indexes for Subject model...");
        await Subject.syncIndexes();
        console.log("Subject indexes synced successfully!");

        const collection = mongoose.connection.collection('subjects');
        const indexes = await collection.indexes();
        console.log("Active indexes now:", indexes);

    } catch (err) {
        console.error("Index sync failed:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
}

run();
