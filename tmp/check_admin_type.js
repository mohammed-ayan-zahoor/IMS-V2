import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;

async function checkAdminType() {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to DB");

    const admin = await mongoose.connection.db.collection('users').findOne({ email: 'ayan.22@gmail.com' });
    if (admin) {
        console.log("Admin Institute Type:", typeof admin.institute, admin.institute instanceof mongoose.Types.ObjectId ? "ObjectId" : "Native/Other");
        console.log("Admin Institute Value:", admin.institute);
    }

    await mongoose.disconnect();
}

checkAdminType();
