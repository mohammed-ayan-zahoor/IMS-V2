import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Institute from "@/models/Institute";
import Batch from "@/models/Batch";
import Course from "@/models/Course";
import { getInstituteScope } from "@/middleware/instituteScope";
import mongoose from "mongoose";

/**
 * Returns hydrated context for a random student for template preview.
 * Each call returns a random active student from the institute reliably without null cursor skips.
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !["admin", "super_admin"].includes(session.user.role)) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);
        
        // Build robust query for active students
        const instituteConditions = [];
        if (scope?.instituteId) {
            try {
                instituteConditions.push(new mongoose.Types.ObjectId(scope.instituteId));
            } catch (e) {
                console.warn("Invalid instituteId format:", scope.instituteId);
            }
            instituteConditions.push(String(scope.instituteId));
        }

        const studentQuery = {
            role: "student",
            $or: [
                { deletedAt: null },
                { deletedAt: { $exists: false } }
            ]
        };

        if (instituteConditions.length > 0) {
            studentQuery.institute = { $in: instituteConditions };
        } else if (!scope?.isSuperAdmin) {
            return Response.json({ error: "Institute scope not verified" }, { status: 401 });
        }

        // Fetch candidate students pool (up to 50) - guarantees non-null results
        let candidateStudents = await User.find(studentQuery)
            .select('_id institute profile name email')
            .sort({ _id: -1 })
            .limit(50)
            .lean();

        // If super admin and no students in scoped institute, fallback to ANY student for preview
        if ((!candidateStudents || candidateStudents.length === 0) && scope?.isSuperAdmin) {
            candidateStudents = await User.find({
                role: "student",
                $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
            })
            .select('_id institute profile name email')
            .limit(50)
            .lean();
        }

        if (!candidateStudents || candidateStudents.length === 0) {
            return Response.json({ error: "No students found for preview" }, { status: 404 });
        }

        // Pick a random student from candidates
        const randomIdx = Math.floor(Math.random() * candidateStudents.length);
        const student = candidateStudents[randomIdx];
        
        const instituteId = student.institute || scope?.instituteId;
        
        // Find the student's batch
        const studentBatch = await Batch.findOne({
            'enrolledStudents.student': student._id,
            deletedAt: null
        }).sort({ updatedAt: -1 });

        const { getHydratedContext } = await import("@/services/certificateService");
        const context = await getHydratedContext(student._id, instituteId, {
            batchId: studentBatch?._id
        });

        return Response.json({
            success: true,
            data: context,
            studentName: context.student.fullName || context.student.firstName || "Student"
        });
    } catch (error) {
        console.error("Preview Data Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
