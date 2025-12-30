import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";

export async function GET(req) {
    try {
        await connectDB();

        // Find all batches, populate students
        const batches = await Batch.find({ deletedAt: null }).populate('enrolledStudents.student');

        const results = batches.map(b => {
            // Check raw array
            const rawCount = b.enrolledStudents ? b.enrolledStudents.length : 0;
            // Check active count manually
            const activeCountManual = b.enrolledStudents ? b.enrolledStudents.filter(s => s.status === 'active').length : 0;
            // Check virtual
            const virtualCount = b.activeEnrollmentCount;

            return {
                id: b._id,
                name: b.name,
                rawLength: rawCount,
                manualActive: activeCountManual,
                virtualOutput: virtualCount,
                toJSONOutput: JSON.parse(JSON.stringify(b)).activeEnrollmentCount,
                students: b.enrolledStudents.map(e => ({
                    id: e.student?._id,
                    name: e.student?.profile?.firstName,
                    status: e.status
                }))
            };
        });

        return NextResponse.json({ success: true, count: batches.length, data: results });
    } catch (error) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
