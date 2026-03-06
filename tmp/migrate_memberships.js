import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error("MONGODB_URI is not set. Aborting.");
    process.exit(1);
}

async function migrate() {
    await mongoose.connect(MONGO_URI); console.log("Connected to DB");

    const users = await mongoose.connection.db.collection('users').find({
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
    }).toArray(); const defaultInstitute = await mongoose.connection.db.collection('institutes').findOne({ code: 'DEFAULT' });

    if (!defaultInstitute) {
        console.error("No DEFAULT institute found. Aborting.");
        process.exit(1);
    }

    console.log(`Using Default Institute: ${defaultInstitute.name} (${defaultInstitute._id})`);

    let migratedCount = 0;
    let membershipCount = 0;

    for (const user of users) {
        // Determine target institute
        let targetInstId = user.institute || defaultInstitute._id;

        // Skip super_admin if they don't need a specific membership or handled separately
        // But giving them one in Default doesn't hurt.

        const existingMembership = await mongoose.connection.db.collection('memberships').findOne({
            user: user._id,
            institute: targetInstId
        });

        if (!existingMembership) {
            await mongoose.connection.db.collection('memberships').insertOne({
                user: user._id,
                institute: targetInstId,
                role: user.role,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            membershipCount++;

            // Also update the user's institute field if it was missing
            if (!user.institute) {
                await mongoose.connection.db.collection('users').updateOne(
                    { _id: user._id },
                    { $set: { institute: targetInstId } }
                );
                migratedCount++;
            }
        }
    }

    console.log(`Migration Complete!`);
    console.log(`Created ${membershipCount} membership records.`);
    migrate()
        .catch((err) => {
            console.error("Migration failed:", err);
            process.exit(1);
        });
    await mongoose.disconnect();
}

migrate();
