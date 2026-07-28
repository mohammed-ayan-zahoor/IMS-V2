import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function run() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in .env.local");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find users with missing deletedAt
        const usersToFix = await User.find({ deletedAt: { $exists: false } });
        console.log(`Found ${usersToFix.length} users with missing 'deletedAt' field.`);

        if (usersToFix.length > 0) {
            const result = await User.updateMany(
                { deletedAt: { $exists: false } },
                { $set: { deletedAt: null } }
            );
            console.log(`Successfully updated ${result.modifiedCount} user documents to set 'deletedAt: null'.`);
        } else {
            console.log('No user documents need repair.');
        }

    } catch (error) {
        console.error('❌ Repair failed:', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

run();
