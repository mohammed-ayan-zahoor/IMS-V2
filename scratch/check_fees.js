import { connectDB } from "./lib/mongodb.js";
import TransportFee from "./models/TransportFee.js";
import mongoose from "mongoose";

async function check() {
    await connectDB();
    const User = (await import("./models/User.js")).default;
    const TransportFee = (await import("./models/TransportFee.js")).default;

    const student = await User.findOne({ 
        "profile.firstName": "Aman", 
        "profile.lastName": "Mukhtar Shaikh" 
    });

    if (!student) {
        console.log("Student not found!");
        process.exit(1);
    }

    console.log("Found Student:", { _id: student._id, name: student.profile.firstName });

    const fees = await TransportFee.find({ student: student._id });
    console.log("Transport Fees for Student:", JSON.stringify(fees, null, 2));
    process.exit(0);
}

check();
