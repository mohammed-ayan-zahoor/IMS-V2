import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Counter from "@/models/Counter"; // Ensure Counter is loaded

export async function GET(req) {
    try {
        await connectDB();
        const email = "mohammedayan76766@gmail.com";

        // Find ALL users with this email (including deleted)
        // We expect one active and maybe one deleted (if hard delete didn't work previously, but I ran hard delete logic)
        // Actually, I ran hard delete logic on the DELETE endpoint. 
        // If the user used the UI to create a new one, there should be a new record.

        const users = await User.find({ email }).sort({ createdAt: -1 }); // Newest first

        const userDebug = users.map(u => ({
            _id: u._id,
            email: u.email,
            enrollmentNumber: u.enrollmentNumber,
            role: u.role,
            deletedAt: u.deletedAt,
            isActiveVirtual: u.isActive, // Access virtual directly
            toJSON: u.toJSON() // See what toJSON returns
        }));

        const year = new Date().getFullYear();
        const counter = await Counter.findById(`student_enrollment_${year}`);

        return NextResponse.json({
            users: userDebug,
            counter: counter
        });
    } catch (error) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
