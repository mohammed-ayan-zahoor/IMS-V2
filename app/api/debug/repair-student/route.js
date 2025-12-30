import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Counter from "@/models/Counter"; // Ensure Counter is loaded
import mongoose from "mongoose";

export async function GET(req) {
    try {
        await connectDB();
        const email = "mohammedayan76766@gmail.com";

        // Find active user
        const student = await User.findOne({ email, deletedAt: null });

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        const logs = [];

        // Create Counter model defensively if not exists (though import should handle it)
        const CounterModel = mongoose.models.Counter || mongoose.model("Counter", new mongoose.Schema({ _id: String, seq: Number }));

        if (!student.enrollmentNumber) {
            const year = new Date().getFullYear();
            const counter = await CounterModel.findByIdAndUpdate(
                `student_enrollment_${year}`,
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );

            student.enrollmentNumber = `STU${year}${String(counter.seq).padStart(4, '0')}`;
            logs.push(`Generated Enrollment ID: ${student.enrollmentNumber}`);

            // We need to bypass the 'isNew' check in pre-save, so we just save.
            // But wait, pre-save hook only runs if isNew... correct. 
            // So manually setting it here and saving is perfectly fine.
            await student.save();
        } else {
            logs.push(`Enrollment ID exists: ${student.enrollmentNumber}`);
        }

        return NextResponse.json({
            success: true,
            logs,
            student: {
                id: student._id,
                enrollmentNumber: student.enrollmentNumber,
                isActive: student.isActive // Check virtual
            }
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 200 });
    }
}
