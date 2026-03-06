import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;

async function testQuery() {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to DB");

    const InstituteId = "695661f72a6a668929684a1c"; // Default Institute
    console.log(`Testing for Institute ID: ${InstituteId}`);

    const memberships = await mongoose.connection.db.collection('memberships').find({
        institute: new mongoose.Types.ObjectId(InstituteId),
        isActive: true
    }).toArray();

    console.log(`Found ${memberships.length} memberships`);
    const userIds = memberships.map(m => m.user);

    const query = {
        $or: [
            { _id: { $in: userIds } },
            { institute: new mongoose.Types.ObjectId(InstituteId) }
        ],
        deletedAt: null,
        role: 'student'
    };

    const students = await mongoose.connection.db.collection('users').find(query).toArray();
    console.log(`Found ${students.length} students with Hybrid Query (manual casting)`);

    const queryNoCast = {
        $or: [
            { _id: { $in: userIds.map(id => id.toString()) } },
            { institute: InstituteId }
        ],
        deletedAt: null,
        role: 'student'
    };
    const studentsNoCast = await mongoose.connection.db.collection('users').find(queryNoCast).toArray();
    console.log(`Found ${studentsNoCast.length} students with Hybrid Query (no casting)`);

    await mongoose.disconnect();
}

testQuery().catch(err => {
    console.error('Error running test query:', err);
    process.exit(1);
});