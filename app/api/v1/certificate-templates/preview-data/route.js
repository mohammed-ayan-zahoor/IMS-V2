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
 * Each call returns a different random student.
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !["admin", "super_admin"].includes(session.user.role)) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);
        
        const query = { role: "student", deletedAt: null };
        
        if (scope?.instituteId) {
            try {
                query.institute = new mongoose.Types.ObjectId(scope.instituteId);
            } catch (e) {
                console.warn("Invalid instituteId in scope:", scope.instituteId);
            }
        } else if (!scope?.isSuperAdmin) {
            return Response.json({ error: "Institute scope not verified" }, { status: 401 });
        }

        // Get a random student
        let count = await User.countDocuments(query);
        let student;

        if (count === 0) {
            console.log("No students found with query:", JSON.stringify(query));
            // If super admin and no students in scoped institute, try finding ANY student as fallback for preview
            if (scope?.isSuperAdmin) {
                const fallbackCount = await User.countDocuments({ role: "student", deletedAt: null });
                if (fallbackCount > 0) {
                    const randomIndex = Math.floor(Math.random() * fallbackCount);
                    student = await User.findOne({ role: "student", deletedAt: null }).skip(randomIndex).lean();
                }
            }
            if (!student) return Response.json({ error: "No students found" }, { status: 404 });
        } else {
            const randomIndex = Math.floor(Math.random() * count);
            student = await User.findOne(query).skip(randomIndex).lean();
        }

        if (!student) return Response.json({ error: "Student not found" }, { status: 404 });
        
        const instituteId = student.institute || scope?.instituteId;
        
        // Find the student's batch
        const studentBatch = await Batch.findOne({
            'enrolledStudents.student': student._id,
            deletedAt: null
        });

        const { getHydratedContext } = await import("@/services/certificateService");
        const context = await getHydratedContext(student._id, instituteId, {
            batchId: studentBatch?._id
        });

        return Response.json({
            success: true,
            data: context,
            studentName: context.student.fullName
        });
    } catch (error) {
        console.error("Preview Data Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
