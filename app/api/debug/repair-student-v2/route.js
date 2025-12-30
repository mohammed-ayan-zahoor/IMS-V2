import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import mongoose from "mongoose";

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        await connectDB();
        const email = "mohammedayan76766@gmail.com";

        // Ensure we are using the freshly compiled model
        // We rely on the fact that this is a new file

        const student = await User.findOne({ email, deletedAt: null });

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        const logs = [];

        // Fix Enrollment ID
        if (!student.enrollmentNumber) {
            const CounterModel = mongoose.models.Counter || mongoose.model("Counter", new mongoose.Schema({ _id: String, seq: Number }));
            const year = new Date().getFullYear();
            const counter = await CounterModel.findByIdAndUpdate(
                `student_enrollment_${year}`,
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );

            student.enrollmentNumber = `STU${year}${String(counter.seq).padStart(4, '0')}`;
            logs.push(`Generated Enrollment ID: ${student.enrollmentNumber}`);

            // This save logic triggers the pre-save hook.
            // If the hook is fixed (async/await no next), this works.
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
                isActive: student.isActive, // Check virtual
                fullName: student.fullName
            }
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 200 });
    }
}
