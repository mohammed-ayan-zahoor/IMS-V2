const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const ExamSubmissionSchema = new mongoose.Schema({
    attemptNumber: { type: Number, default: 1 }
}, { strict: false });

const ExamSubmission = mongoose.models.ExamSubmission || mongoose.model('ExamSubmission', ExamSubmissionSchema);

async function migrateAttempts() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // 1. Backfill attemptNumber
        console.log('Backfilling attemptNumber for legacy submissions...');
        const result = await ExamSubmission.updateMany(
            { attemptNumber: { $exists: false } }, // Or check for null
            { $set: { attemptNumber: 1 } }
        );
        console.log(`Backfilled ${result.modifiedCount} documents.`);

        // 2. Manage Indexes
        console.log('Migrating indexes...');
        const indexes = await ExamSubmission.collection.indexes();
        const oldIndexName = 'exam_1_student_1'; // Standard name, verify if custom name used

        const oldIndexExists = indexes.some(idx => idx.name === oldIndexName);

        if (oldIndexExists) {
            console.log(`Dropping old unique index: ${oldIndexName}...`);
            await ExamSubmission.collection.dropIndex(oldIndexName);
            console.log('Dropped old index.');
        } else {
            console.log(`Old index '${oldIndexName}' not found. Checking for other candidates...`);
            // Optional: iterate and find index with matching key definition { exam: 1, student: 1 }
            const candidate = indexes.find(idx => {
                const keys = Object.keys(idx.key);
                return keys.length === 2 && keys[0] === 'exam' && keys[1] === 'student';
            });
            if (candidate) {
                console.log(`Found candidate index '${candidate.name}'. Dropping...`);
                await ExamSubmission.collection.dropIndex(candidate.name);
                console.log('Dropped candidate index.');
            }
        }

        // 3. Create new index (Mongoose likely handles this on restart, but manual creation ensures state)
        console.log('Creating new unique index: { exam: 1, student: 1, attemptNumber: 1 } ...');
        await ExamSubmission.collection.createIndex(
            { exam: 1, student: 1, attemptNumber: 1 },
            { unique: true, name: 'exam_1_student_1_attempt_1' } // Explicit name
        );
        console.log('New index created.');

        console.log('Migration complete.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
        process.exit();
    }
}

migrateAttempts();
