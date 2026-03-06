import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import Membership from '../models/Membership.js';

const MONGO_URI = process.env.MONGODB_URI;

async function testIdCasting() {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to DB");

    const userIdString = "69a68df60e2531d5827beb5f"; // test user ID    console.log(`Searching for String ID: ${userIdString}`);

    const membershipsStr = await Membership.find({ user: userIdString });
    console.log(`Found ${membershipsStr.length} memberships with String ID`);

    const membershipsObj = await Membership.find({ user: new mongoose.Types.ObjectId(userIdString) });
    console.log(`Found ${membershipsObj.length} memberships with ObjectId cast`);

    await mongoose.disconnect();
}

testIdCasting();
