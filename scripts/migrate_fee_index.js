import { connectDB } from '../lib/mongodb.js';
import mongoose from 'mongoose';
import Fee from '../models/Fee.js';

async function migrate() {
    try {
        console.log("Connecting to DB...");
        await connectDB();

        const collection = mongoose.connection.collection('fees');

        // 1. Drop existing indexes
        console.log("Dropping existing indexes...");
        try {
            await collection.dropIndex('institute_1_student_1_batch_1');
            console.log("Dropped index: institute_1_student_1_batch_1");
        } catch (e) {
            console.log("Index might not exist or already dropped:", e.message);
        }

        // 2. Re-sync indexes using Mongoose model definition
        console.log("Re-syncing indexes from Mongoose model...");
        await Fee.syncIndexes();

        console.log("Migration complete. Index should be partial now.");

    } catch (error) {
        console.error("Migration Error:", error);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log("DB Connection Closed");
        }
        process.exit(0);
    }
}

migrate();
