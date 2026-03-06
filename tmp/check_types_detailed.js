import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;

async function checkTypesDetailed() {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to DB");

    const userId = "69a68df60e2531d5827beb5f";
    const aqsInstId = "695759b1c5edb496f99be1a5";

    const membership = await mongoose.connection.db.collection('memberships').findOne({
        user: new mongoose.Types.ObjectId(userId),
        institute: aqsInstId
    });

    if (membership) {
        console.log("AQS Membership Found");
        console.log("User Type:", typeof membership.user, membership.user instanceof mongoose.Types.ObjectId ? "ObjectId" : "Other");
        console.log("Institute Type:", typeof membership.institute, membership.institute instanceof mongoose.Types.ObjectId ? "ObjectId" : "Other");
    } else {
        // Try searching with ObjectId
        const membership2 = await mongoose.connection.db.collection('memberships').findOne({
            user: new mongoose.Types.ObjectId(userId),
            institute: new mongoose.Types.ObjectId(aqsInstId)
        });
        if (membership2) {
            console.log("AQS Membership Found (via ObjectId search)");
            console.log("User Type:", typeof membership2.user, membership2.user instanceof mongoose.Types.ObjectId ? "ObjectId" : "Other");
            console.log("Institute Type:", typeof membership2.institute, membership2.institute instanceof mongoose.Types.ObjectId ? "ObjectId" : "Other");
        } else {
            console.log("AQS Membership NOT found with either search.");
        }
    }

    await mongoose.disconnect();
}

checkTypesDetailed().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});