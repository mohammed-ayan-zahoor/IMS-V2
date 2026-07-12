const mongoose = require('mongoose');
const crypto = require('crypto');
// Load .env.local first
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

const getMasterKey = () => {
    const key = process.env.DATABASE_ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error('DATABASE_ENCRYPTION_KEY must be a 64-character hex string (256-bit) in environment variables.');
    }
    return Buffer.from(key, 'hex');
};

function encrypt(plainText) {
    if (!plainText) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

async function migrate() {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        console.error("Error: MONGODB_URI environment variable is not defined.");
        process.exit(1);
    }

    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected successfully.");

        const db = mongoose.connection.db;

        // 1. Process Users collection
        console.log("\n--- Processing Users (Students) ---");
        const userCol = db.collection('users');
        const userCursor = userCol.find({
            role: 'student',
            $or: [
                { aadharNumber: { $exists: true, $ne: null, $ne: "" } },
                { apaarId: { $exists: true, $ne: null, $ne: "" } },
                { penNumber: { $exists: true, $ne: null, $ne: "" } },
                { fatherAadhar: { $exists: true, $ne: null, $ne: "" } },
                { motherAadhar: { $exists: true, $ne: null, $ne: "" } }
            ]
        });

        let userCount = 0;
        let userUpdated = 0;

        while (await userCursor.hasNext()) {
            const user = await userCursor.next();
            userCount++;
            
            const updates = {};
            const fieldsToEncrypt = ['aadharNumber', 'apaarId', 'penNumber', 'fatherAadhar', 'motherAadhar'];
            
            for (const field of fieldsToEncrypt) {
                const val = user[field];
                if (val && typeof val === 'string' && !val.startsWith('enc:')) {
                    updates[field] = encrypt(val);
                }
            }

            if (Object.keys(updates).length > 0) {
                await userCol.updateOne({ _id: user._id }, { $set: updates });
                userUpdated++;
            }
        }
        console.log(`Scanned ${userCount} users. Encrypted and updated ${userUpdated} profiles.`);

        // 2. Process AdmissionApplications collection
        console.log("\n--- Processing Admission Applications ---");
        const appCol = db.collection('admissionapplications');
        const appCursor = appCol.find({
            $or: [
                { studentAadhar: { $exists: true, $ne: null, $ne: "" } },
                { fatherAadhar: { $exists: true, $ne: null, $ne: "" } },
                { motherAadhar: { $exists: true, $ne: null, $ne: "" } }
            ]
        });

        let appCount = 0;
        let appUpdated = 0;

        while (await appCursor.hasNext()) {
            const app = await appCursor.next();
            appCount++;

            const updates = {};
            const fieldsToEncrypt = [
                { source: 'studentAadhar', target: 'studentAadhar' },
                { source: 'fatherAadhar', target: 'fatherAadhar' },
                { source: 'motherAadhar', target: 'motherAadhar' }
            ];

            for (const field of fieldsToEncrypt) {
                const val = app[field.source];
                if (val && typeof val === 'string' && !val.startsWith('enc:')) {
                    updates[field.target] = encrypt(val);
                }
            }

            if (Object.keys(updates).length > 0) {
                await appCol.updateOne({ _id: app._id }, { $set: updates });
                appUpdated++;
            }
        }
        console.log(`Scanned ${appCount} applications. Encrypted and updated ${appUpdated} records.`);

        console.log("\nPII Encryption Migration completed successfully!");
        process.exit(0);

    } catch (err) {
        console.error("Migration failed with error:", err);
        process.exit(1);
    }
}

migrate();
