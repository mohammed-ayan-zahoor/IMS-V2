const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' }); // Load env vars

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

const MaterialSchema = new mongoose.Schema({
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
    // ... other fields irrelevant for this migration
}, { strict: false }); // Strict false to allow accessing 'batch' even if removed from code

const Material = mongoose.models.Material || mongoose.model('Material', MaterialSchema);

async function migrate() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const cursor = Material.find({ batch: { $exists: true } }).cursor();

        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            if (doc.batch) {
                // Initialize batches if not exists
                if (!doc.batches) doc.batches = [];

                // Add old batch to batches if not already present
                const batchIdStr = doc.batch.toString();
                const exists = doc.batches.some(b => b.toString() === batchIdStr);

                if (!exists) {
                    doc.batches.push(doc.batch);
                }

                // Unset the old field
                // Using updateOne to explicitly unset
                await Material.updateOne(
                    { _id: doc._id },
                    {
                        $set: { batches: doc.batches },
                        $unset: { batch: "" }
                    }
                );
                console.log(`Migrated Material ${doc._id}`);
            }
        }

        console.log('Migration complete');
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
