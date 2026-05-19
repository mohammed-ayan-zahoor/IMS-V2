const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/ims-v2';

async function run() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected successfully!");

        const collection = mongoose.connection.collection('subjects');
        
        console.log("Fetching indexes on 'subjects' collection...");
        const indexes = await collection.indexes();
        console.log("Current indexes:", indexes);

        const hasLegacyIndex = indexes.some(idx => idx.name === 'institute_1_code_1');
        
        if (hasLegacyIndex) {
            console.log("Legacy index 'institute_1_code_1' found. Dropping it...");
            await collection.dropIndex('institute_1_code_1');
            console.log("Legacy index dropped successfully!");
        } else {
            console.log("Legacy index 'institute_1_code_1' not found. Nothing to drop.");
        }

        console.log("Fetching updated indexes...");
        const updatedIndexes = await collection.indexes();
        console.log("Updated indexes:", updatedIndexes);

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }
}

run();
