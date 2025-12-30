import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";

export async function GET(req) {
    try {
        await connectDB();

        const batches = await Batch.find({ deletedAt: null });
        const results = [];

        for (const batch of batches) {
            const originalCount = batch.enrolledStudents.length;

            // Deduplicate based on student ID string
            const uniqueEnrollments = [];
            const seenIds = new Set();

            // Iterate in reverse to keep the LATEST enrollment if distinct, or just keep first?
            // Usually we want to keep the one that has valid status.
            // Let's just keep the first one we see as 'active' or just the first one.

            for (const enrollment of batch.enrolledStudents) {
                const sId = enrollment.student.toString();
                if (!seenIds.has(sId)) {
                    seenIds.add(sId);
                    uniqueEnrollments.push(enrollment);
                }
            }

            if (uniqueEnrollments.length < originalCount) {
                batch.enrolledStudents = uniqueEnrollments;
                await batch.save();
                results.push(`Fixed Batch ${batch.name}: Reduced from ${originalCount} to ${uniqueEnrollments.length}`);
            }
        }

        return NextResponse.json({ success: true, fixed: results });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
