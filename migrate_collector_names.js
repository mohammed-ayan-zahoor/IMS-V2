
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const { connectDB } = require('./lib/mongodb');
const Fee = require('./models/Fee').default || require('./models/Fee');
const Collector = require('./models/Collector').default || require('./models/Collector');

// Simple script to migrate collectedBy from ID to Name
// Usage: node migrate_collector_names.js [--dry-run]
async function migrateCollectors() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run') || args.includes('dryRun');

    try {
        console.log(`Starting Migration: Collector IDs -> Names...${dryRun ? " [DRY RUN]" : ""}`);
        if (dryRun) console.log("DRY RUN ENABLED: No changes will be written to the database.");

        await connectDB();

        // 1. Fetch all collectors to build a lookup map
        const collectors = await Collector.find({}, { _id: 1, name: 1 });
        const collectorMap = {}; // ID -> Name
        collectors.forEach(c => {
            collectorMap[c._id.toString()] = c.name;
        });
        console.log(`Loaded ${Object.keys(collectorMap).length} collectors.`);

        // 2. Find fees with installments
        const query = { "installments.0": { $exists: true } };
        const totalDocs = await Fee.countDocuments(query);
        console.log(`Found ${totalDocs} fee records to check.`);

        let updatedCount = 0;
        let processedCount = 0;

        for await (const fee of Fee.find(query).cursor()) {
            processedCount++;
            if (processedCount % 100 === 0) console.log(`Processed ${processedCount}/${totalDocs}...`);
            let modified = false;

            fee.installments.forEach(inst => {
                const val = inst.collectedBy;
                // Strict check: ObjectId instance OR 24-char hex string
                const isLikelyId = val && (val instanceof mongoose.Types.ObjectId || /^[0-9a-fA-F]{24}$/.test(val.toString()));

                if (isLikelyId) {
                    const name = collectorMap[val.toString()];
                    // Idempotency: Update only if map exists and value is not already the name
                    if (name && val !== name) {
                        console.log(`[Fee ${fee._id}] ${dryRun ? 'WOULD MIGRATE' : 'MIGRATING'} installment ${inst._id}: ${val} -> ${name}`);
                        inst.collectedBy = name;
                        modified = true;
                    }
                }
            });

            if (modified) {
                if (!dryRun) {
                    // Mark installments as modified since it's a mixed type/array often
                    fee.markModified('installments');
                    await fee.save();
                }
                updatedCount++;
            }
        }

        console.log(`Migration Complete. ${dryRun ? 'Potential updates found:' : 'Updated'} ${updatedCount} fee records.`);
        process.exit(0);

    } catch (error) {
        console.error("Migration Failed:", error);
        process.exit(1);
    }
}

migrateCollectors();
