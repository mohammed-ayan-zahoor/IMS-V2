const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/ims-v2';

async function run() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected successfully!");

        const col = mongoose.connection.collection('mastersubjects');
        const docs = await col.find({}).toArray();
        console.log(`Found ${docs.length} master subjects:`);
        
        docs.forEach(doc => {
            console.log({
                _id: doc._id,
                name: doc.name,
                code: doc.code,
                institute: doc.institute,
                deletedAt: doc.deletedAt
            });
        });

    } catch (err) {
        console.error("Failed:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
}

run();
