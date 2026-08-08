import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const searchEmail = process.argv[2] || 'yogesh.borse2008@gmail.com';
const targetEmail = searchEmail.trim().toLowerCase();

async function run() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error('❌ MONGODB_URI is not set in environment variables.');
            process.exit(1);
        }

        console.log(`🔎 Searching MongoDB for email: "${targetEmail}"...\n`);
        await mongoose.connect(uri);
        const db = mongoose.connection.db;

        // Get all collections in the database
        const collections = await db.listCollections().toArray();
        let foundAny = false;

        for (const colInfo of collections) {
            const collectionName = colInfo.name;
            const collection = db.collection(collectionName);

            // Search for documents where any field contains or equals targetEmail (case-insensitive regex)
            const regex = new RegExp(`^${targetEmail.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');
            
            // Search common email fields or perform a text/regex search
            const query = {
                $or: [
                    { email: regex },
                    { contactEmail: regex },
                    { adminEmail: regex },
                    { username: regex }
                ]
            };

            const matches = await collection.find(query).toArray();

            if (matches.length > 0) {
                foundAny = true;
                console.log(`✅ FOUND ${matches.length} match(es) in collection: [ ${collectionName} ]`);
                matches.forEach((doc, idx) => {
                    console.log(`   --- Document #${idx + 1} ---`);
                    console.log(`   ID: ${doc._id}`);
                    if (doc.name || doc.schoolName || doc.fullName) {
                        console.log(`   Name: ${doc.name || doc.schoolName || doc.fullName}`);
                    }
                    if (doc.role) console.log(`   Role: ${doc.role}`);
                    if (doc.institute) console.log(`   Institute ID: ${doc.institute}`);
                    if (doc.code) console.log(`   Institute Code: ${doc.code}`);
                    if (doc.email) console.log(`   email: ${doc.email}`);
                    if (doc.contactEmail) console.log(`   contactEmail: ${doc.contactEmail}`);
                    if (doc.adminEmail) console.log(`   adminEmail: ${doc.adminEmail}`);
                    if (doc.username) console.log(`   username: ${doc.username}`);
                    if (doc.createdAt) console.log(`   Created At: ${doc.createdAt}`);
                    console.log('');
                });
            }
        }

        if (!foundAny) {
            console.log(`❓ No records found for email "${targetEmail}" in any collection.`);
        }

    } catch (err) {
        console.error('❌ Error executing email search script:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

run();
