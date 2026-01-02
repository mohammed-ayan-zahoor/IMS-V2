import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

// Define minimal schema for migration
const ExamSchema = new mongoose.Schema({
    batch: mongoose.Schema.Types.ObjectId,
    batches: [mongoose.Schema.Types.ObjectId]
}, { strict: false });

const Exam = mongoose.model('Exam', ExamSchema);

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        // Find documents that have 'batch' field but 'batches' is empty or missing
        const cursor = Exam.find({
            batch: { $exists: true, $ne: null },
            $or: [{ batches: { $exists: false } }, { batches: { $size: 0 } }]
        }).cursor();

        let processed = 0;
        let errors = 0;

        console.log('Starting migration...');

        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            try {
                if (doc.batch) {
                    // Backfill: Add existing batch to batches array
                    doc.batches = [doc.batch];

                    // Remove legacy field (Phase 1 can involve keeping it, but let's effectively migrate)
                    // If we want to keep it for compatibility, we can comment out the next line.
                    // doc.batch = undefined; 

                    // Using updateOne to be atomic and explicit
                    await Exam.updateOne(
                        { _id: doc._id },
                        {
                            $set: { batches: [doc.batch] },
                            $unset: { batch: "" }
                        }
                    );
                    processed++;
                    if (processed % 100 === 0) console.log(`Processed ${processed} documents...`);
                }
            } catch (err) {
                console.error(`Error processing doc ${doc._id}:`, err);
                errors++;
            }
        }

        console.log(`Migration complete.`);
        console.log(`Successfully processed: ${processed}`);
        console.log(`Errors: ${errors}`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
        process.exit();
    }
}

migrate();
