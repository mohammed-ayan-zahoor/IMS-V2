const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/ims-v2';

async function run() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected successfully!");

        const collections = ['subjects', 'mastersubjects'];

        for (const colName of collections) {
            console.log(`\n=== Indexes for collection: ${colName} ===`);
            const col = mongoose.connection.collection(colName);
            const indexes = await col.indexes();
            console.log(JSON.stringify(indexes, null, 2));
        }

    } catch (err) {
        console.error("Failed:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
}

run();
