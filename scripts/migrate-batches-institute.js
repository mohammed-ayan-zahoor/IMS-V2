require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

async function migrate() {
    let exitCode = 0;
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const batchesCollection = db.collection('batches');
        const usersCollection = db.collection('users');

        // Find batches without institute
        const batches = await batchesCollection.find({ institute: { $exists: false } }).toArray();
        console.log(`Found ${batches.length} batches without institute field.`);

        if (batches.length === 0) {
            console.log('No migration needed.');
            return;
        }

        let updatedCount = 0;
        let errorCount = 0;

        for (const batch of batches) {
            try {
                if (!batch.createdBy) {
                    console.warn(`Batch ${batch._id} has no createdBy field. Skipping.`);
                    errorCount++;
                    continue;
                }

                // Normalize createdBy to ObjectId for lookup
                let creatorId = batch.createdBy;
                if (typeof creatorId === 'string' && mongoose.Types.ObjectId.isValid(creatorId)) {
                    creatorId = new mongoose.Types.ObjectId(creatorId);
                }

                const creator = await usersCollection.findOne({ _id: creatorId });
                if (!creator || !creator.institute) {
                    console.warn(`Creator or Creator's Institute not found for Batch ${batch._id}. Skipping.`);
                    errorCount++;
                    continue;
                }

                await batchesCollection.updateOne(
                    { _id: batch._id },
                    { $set: { institute: creator.institute } }
                );
                updatedCount++;
            } catch (err) {
                console.error(`Failed to update Batch ${batch._id}:`, err);
                errorCount++;
            }
        }

        console.log(`Migration Complete. Updated: ${updatedCount}, Skipped/Errors: ${errorCount}`);
        if (errorCount > 0 && updatedCount === 0) exitCode = 1;

    } catch (error) {
        console.error('Migration Error:', error);
        exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
        process.exit(exitCode);
    }
}

migrate();
