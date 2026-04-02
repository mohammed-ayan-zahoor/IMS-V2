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
        console.log("Docs found:", fees.length);
        fees.forEach(f => {
            console.log("ID:", f._id);
            console.log("Status:", f.status);
            console.log("Total:", f.totalAmount);
            console.log("Paid:", f.paidAmount);
            console.log("Installments length:", f.installments ? f.installments.length : 0);
            if (f.installments) {
                f.installments.forEach(i => console.log(` - Inst status: ${i.status}, amt: ${i.amount}`));
            }
        });
        await mongoose.disconnect();
    } catch (e) {
        console.log("Error:", e);
    }
};
run();
