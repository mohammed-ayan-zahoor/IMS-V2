import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const targetEmail = 'yogesh.borse2008@gmail.com';

async function run() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error('❌ MONGODB_URI is not set.');
            process.exit(1);
        }

        await mongoose.connect(uri);
        const db = mongoose.connection.db;

        console.log(`\n==================================================`);
        console.log(`🔍 DETAILED REPORT FOR: "${targetEmail}"`);
        console.log(`==================================================\n`);

        // 1. Check users collection
        const user = await db.collection('users').findOne({ email: new RegExp(`^${targetEmail}$`, 'i') });
        if (user) {
            console.log(`📌 USER ACCOUNT DETAILS (collection: users):`);
            console.log(`   - User ID: ${user._id}`);
            console.log(`   - Name: ${user.name || user.fullName || 'N/A'}`);
            console.log(`   - Role: ${user.role}`);
            console.log(`   - Institute ID: ${user.institute}`);

            if (user.institute) {
                const inst = await db.collection('institutes').findOne({ _id: new mongoose.Types.ObjectId(user.institute) });
                if (inst) {
                    console.log(`   - 🏫 Enrolled Institute Name: "${inst.name}"`);
                    console.log(`   - 🏫 Institute Code: "${inst.code}"`);
                    console.log(`   - 🏫 Institute City: "${inst.city || 'N/A'}"`);
                } else {
                    console.log(`   - ⚠️ Institute ID ${user.institute} not found in institutes collection.`);
                }
            } else {
                console.log(`   - ⚠️ User has no institute reference attached.`);
            }
            console.log('');
        }

        // 2. Check admissionapplications collection
        const app = await db.collection('admissionapplications').findOne({ email: new RegExp(`^${targetEmail}$`, 'i') });
        if (app) {
            console.log(`📌 ADMISSION APPLICATION DETAILS (collection: admissionapplications):`);
            console.log(`   - App ID: ${app._id}`);
            console.log(`   - Student Name: ${app.name || app.fullName || 'N/A'}`);
            console.log(`   - Status: ${app.status}`);
            console.log(`   - Institute ID: ${app.institute}`);

            if (app.institute) {
                const inst = await db.collection('institutes').findOne({ _id: new mongoose.Types.ObjectId(app.institute) });
                if (inst) {
                    console.log(`   - 🏫 Target Institute Name: "${inst.name}"`);
                    console.log(`   - 🏫 Institute Code: "${inst.code}"`);
                }
            }
            console.log('');
        }

        // 3. Check mousubmissions collection
        const mou = await db.collection('mousubmissions').findOne({ contactEmail: new RegExp(`^${targetEmail}$`, 'i') });
        if (mou) {
            console.log(`📌 MOU SUBMISSION DETAILS (collection: mousubmissions):`);
            console.log(`   - MOU ID: ${mou._id}`);
            console.log(`   - Ref ID: ${mou.refId}`);
            console.log(`   - School Name: "${mou.schoolName}"`);
            console.log(`   - City: "${mou.city}"`);
            console.log(`   - Principal Name: "${mou.principalName}"`);
            console.log(`   - Status: ${mou.status}`);
            console.log('');
        }

        console.log(`==================================================\n`);

    } catch (err) {
        console.error('❌ Error executing script:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

run();
