import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import IDCardTemplate from "@/models/IDCardTemplate";
import User from "@/models/User";
import Institute from "@/models/Institute";
import { renderIDCardFront, renderIDCardBack } from "@/services/idCardService";
import { getInstituteScope } from "@/middleware/instituteScope";

export const runtime = "nodejs";

export async function POST(req) {
    try {
        await connectDB();

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) {
            return NextResponse.json({ error: "Missing institute context" }, { status: 400 });
        }

        const body = await req.json();
        const { templateId, studentIds } = body;

        if (!templateId || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json(
                { error: "TemplateId and studentIds array are required" },
                { status: 400 }
            );
        }

        // Fetch template - scoped to institute
        const template = await IDCardTemplate.findOne({ 
            _id: templateId, 
            institute: scope.instituteId 
        });
        if (!template) {
            return NextResponse.json(
                { error: "Template not found or access denied" },
                { status: 404 }
            );
        }

        // Fetch students - scoped to institute
        const students = await User.find({ 
            _id: { $in: studentIds },
            institute: scope.instituteId
        });

        if (students.length === 0) {
            return NextResponse.json(
                { error: "No students found for this institute" },
                { status: 404 }
            );
        }

        // Fetch institute info
        const institute = await Institute.findById(scope.instituteId).lean();
        if (!institute) {
            return NextResponse.json({ error: "Institute not found" }, { status: 404 });
        }
        const instituteId = scope.instituteId;

        const { getHydratedContext } = await import("@/services/certificateService");

        // 1. Prepare contexts for all students in parallel
        const hydratedContexts = await Promise.all(students.map(async (student) => {
            try {
                // Find batch for this student
                const Batch = (await import("@/models/Batch")).default;
                const studentBatch = await Batch.findOne({
                    'enrolledStudents.student': student._id,
                    deletedAt: null
                }).populate('course');

                const hydratedContext = await getHydratedContext(student._id, instituteId, {
                    batchId: studentBatch?._id
                });

                // Log what we're passing for debugging
                console.log(`[IDCardGeneration] Hydrated context for ${hydratedContext.student.fullName}:`, {
                    hasFullName: !!hydratedContext.student.fullName,
                    hasGrNumber: !!hydratedContext.student.grNumber,
                    hasEnrollment: !!hydratedContext.student.enrollmentNumber,
                    hasBatch: !!hydratedContext.batch?.name,
                    courseFields: Object.keys(hydratedContext.course || {})
                });

                return hydratedContext;
            } catch (e) {
                console.error(`Failed to hydrate student ${student._id}:`, e.message);
                return null;
            }
        }));

        // Render common back image using the first valid student's context
        const firstValidContext = hydratedContexts.find(c => !!c);
        if (!firstValidContext) throw new Error("No valid student data found for rendering");
        
        console.log(`[IDCardGeneration] Rendering back card with context from: ${firstValidContext.student.fullName}`);
        const backCanvas = await renderIDCardBack(firstValidContext, template, firstValidContext.institute);
        const commonBackImage = backCanvas.toDataURL("image/png");

        const studentCards = [];

        // 2. Render cards (could be parallel but canvas might be heavy)
        for (let i = 0; i < hydratedContexts.length; i++) {
            const context = hydratedContexts[i];
            if (!context) {
                console.warn(`[IDCardGeneration] Skipping invalid context at index ${i}`);
                continue;
            }

            try {
                console.log(`[IDCardGeneration] Rendering card for student: ${context.student.fullName}`);

                // Render front
                const frontCanvas = await renderIDCardFront(context, template);
                const frontImage = frontCanvas.toDataURL("image/png");

                studentCards.push({
                    studentId: context.student.grNumber || i,
                    name: context.student.fullName,
                    rollNumber: context.student.rollNo || context.student.enrollmentNumber,
                    frontImage: frontImage
                });

                console.log(`[IDCardGeneration] Successfully rendered: ${context.student.fullName}`);

            } catch (cardError) {
                console.error(`[IDCardGeneration] Error rendering card for ${context.student.fullName}:`, cardError);
            }
        }

        if (studentCards.length === 0) {
            return NextResponse.json(
                { error: "Failed to generate any ID cards. Check server logs for details." },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            commonBackImage,
            studentCards,
            message: `Successfully generated ${studentCards.length} ID cards`
        });

    } catch (error) {
        console.error("[IDCardGeneration] Error:", error);
        return NextResponse.json(
            { error: "Failed to generate ID cards", details: error.message },
            { status: 500 }
        );
    }
}
