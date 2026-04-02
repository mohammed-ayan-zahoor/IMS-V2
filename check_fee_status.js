import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const fees = await mongoose.connection.collection("fees").find({ 
            "totalAmount": 500, 
            "paidAmount": 500 
        }).toArray();
        console.log("Found fees:", fees.map(f => ({ _id: f._id, status: f.status, total: f.totalAmount, paid: f.paidAmount })));
        await mongoose.disconnect();
    } catch (e) {
        console.log("Error:", e);
    }
};
run();
