const { connectDB } = require("../lib/mongodb");
const mongoose = require("mongoose");
const Notice = require("../models/Notice");

async function run() {
    await connectDB();
    console.log("Connected to MongoDB");
    const count = await Notice.countDocuments({});
    console.log("Total notices in DB:", count);
    const notices = await Notice.find({}).limit(5).lean();
    console.log("Sample notices:", JSON.stringify(notices, null, 2));
    mongoose.connection.close();
}

run().catch(console.error);
