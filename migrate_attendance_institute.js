import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const run = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        console.log("Connecting to:", uri.replace(/\/\/.*@/, "//***@"));
        await mongoose.connect(uri);
        console.log("Connected to MongoDB.\n");

        const attendanceCollection = mongoose.connection.collection("attendances");
        const batchCollection = mongoose.connection.collection("batches");

        const orphaned = await attendanceCollection.find({
            $or: [
                { institute: { $exists: false } },
                { institute: null }
            ]
        }).toArray();

        console.log(`Found ${orphaned.length} attendance documents missing 'institute'.\n`);

        if (orphaned.length === 0) {
            console.log("Nothing to migrate. All attendance documents already have an institute.");
            await mongoose.disconnect();
            return;
        }

        const batchIds = [...new Set(orphaned.map(a => a.batch?.toString()).filter(Boolean))];
        const batches = await batchCollection.find({
            _id: { $in: batchIds.map(id => new mongoose.Types.ObjectId(id)) }
        }).toArray();

        const batchInstituteMap = {};
        for (const batch of batches) {
            batchInstituteMap[batch._id.toString()] = batch.institute;
        }
        console.log(`Loaded ${batches.length} batch-to-institute mappings.\n`);

        let updated = 0;
        let skipped = 0;
        let errors = 0;

        for (const attendance of orphaned) {
            const batchId = attendance.batch?.toString();
            const institute = batchInstituteMap[batchId];

            if (!institute) {
                console.warn(`  SKIP: Attendance ${attendance._id} — batch ${batchId} has no institute mapping.`);
                skipped++;
                continue;
            }

            try {
                await attendanceCollection.updateOne(
                    { _id: attendance._id },
                    { $set: { institute: institute } }
                );
                updated++;
            } catch (err) {
                console.error(`  ERROR: Attendance ${attendance._id} — ${err.message}`);
                errors++;
            }
        }

        console.log("\n--- Migration Summary ---");
        console.log(`  Total orphaned: ${orphaned.length}`);
        console.log(`  Updated:        ${updated}`);
        console.log(`  Skipped:        ${skipped}`);
        console.log(`  Errors:         ${errors}`);
        console.log("-------------------------\n");

        await mongoose.disconnect();
        console.log("Done. Disconnected from MongoDB.");

    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

run();
