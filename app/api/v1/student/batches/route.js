import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const batches = await Batch.find({
            enrolledStudents: {
                $elemMatch: {
                    student: session.user.id,
                    status: "active"
                }
            },
            deletedAt: null
        })
            .populate("course", "name code")
            .select("name schedule instructor"); // Select entire schedule object

        return NextResponse.json({ batches });

    } catch (error) {
        console.error("Fetch Student Batches Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
