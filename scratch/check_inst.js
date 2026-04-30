import mongoose from 'mongoose';
import { connectDB } from './lib/mongodb.js';
import Institute from './models/Institute.js';

async function check() {
    await connectDB();
    const inst = await Institute.findOne();
    console.log("Current Institute Data:", JSON.stringify(inst, null, 2));
    process.exit(0);
}

check();
