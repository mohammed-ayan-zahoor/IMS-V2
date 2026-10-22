import fs from 'fs';
import dotenv from 'dotenv';

if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
}
if (fs.existsSync('.env')) {
    dotenv.config({ path: '.env' });
}

import { connectDB } from '../lib/mongodb.js';
import KioskDevice from '../models/KioskDevice.js';
import Institute from '../models/Institute.js';
import { generateKioskKey } from '../lib/attendance/kioskAuth.js';

async function main() {
    await connectDB();

    const deviceName = process.argv[2] || "Front Gate Tablet";
    const customInstituteId = process.argv[3];
    
    // Find institute: by custom ID, or first active institute
    let institute = null;
    if (customInstituteId) {
        institute = await Institute.findById(customInstituteId);
    }
    if (!institute) {
        institute = await Institute.findOne({ status: { $ne: 'deleted' } });
    }
    if (!institute) {
        institute = await Institute.findOne({});
    }

    if (!institute) {
        console.error("❌ No institute found in database.");
        process.exit(1);
    }

    const { fullKey, keyPrefix, keyHash } = generateKioskKey();

    const kiosk = await KioskDevice.create({
        name: deviceName,
        institute: institute._id,
        keyPrefix,
        keyHash,
        status: 'ACTIVE',
        lastSeenAt: null
    });

    console.log("\n=======================================================");
    console.log("       🎉 NEW KIOSK DEVICE KEY GENERATED");
    console.log("=======================================================");
    console.log(`Institute:   ${institute.name} (${institute._id})`);
    console.log(`Device Name: ${kiosk.name}`);
    console.log(`Device ID:   ${kiosk._id}`);
    console.log("-------------------------------------------------------");
    console.log(`🔑 KIOSK KEY: ${fullKey}`);
    console.log("-------------------------------------------------------");
    console.log("⚠️  Copy and paste this key into the mobile app setup screen.");
    console.log("This key is hashed in the database and cannot be recovered if lost.\n");

    process.exit(0);
}

main().catch(err => {
    console.error("Error creating kiosk key:", err);
    process.exit(1);
});
