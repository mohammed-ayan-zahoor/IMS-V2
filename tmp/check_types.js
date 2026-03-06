import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;

async function checkTypes() {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to DB");

    const membership = await mongoose.connection.db.collection('memberships').findOne({});
    if (membership) {
        console.log("Membership User Type:", typeof membership.user, membership.user instanceof mongoose.Types.ObjectId ? "ObjectId" : "Native/Other");
        console.log("Membership Institute Type:", typeof membership.institute, membership.institute instanceof mongoose.Types.ObjectId ? "ObjectId" : "Native/Other");
    }

    const user = await mongoose.connection.db.collection('users').findOne({ role: 'student' });
    if (user) {
        console.log("\nUser Institute Type:", typeof user.institute, user.institute instanceof mongoose.Types.ObjectId ? "ObjectId" : "Native/Other");
    }

    await mongoose.disconnect();
}

checkTypes();
