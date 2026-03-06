import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Institute from '../models/Institute.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function migrate() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in .env.local");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Get all active users who have an institute field
        const users = await User.find({
            institute: { $exists: true, $ne: null },
            deletedAt: null
        });

        console.log(`Found ${users.length} users with institute associations. Creating memberships...`);

        let createdCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            // Check if membership already exists
            const existing = await Membership.findOne({
                user: user._id,
                institute: user.institute
            });

            if (!existing) {
                await Membership.create({
                    user: user._id,
                    institute: user.institute,
                    role: user.role,
                    isActive: true,
                    status: 'active'
                });
                createdCount++;
            } else {
                skippedCount++;
            }
        }

        console.log(`\nMigration Summary:`);
        console.log(`- Created: ${createdCount}`);
        console.log(`- Skipped: ${skippedCount} (already exists)`);
        console.log(`\n🎉 Membership migration completed successfully!`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

migrate();