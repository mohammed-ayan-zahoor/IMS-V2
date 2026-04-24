import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import IDCardTemplate from "@/models/IDCardTemplate";
import User from "@/models/User";
import Institute from "@/models/Institute";
import { renderIDCardFront, renderIDCardBack } from "@/services/idCardService";

export const runtime = "nodejs";

export async function POST(req) {
    try {
        await connectDB();

        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { templateId, studentIds } = body;

        if (!templateId || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json(
                { error: "TemplateId and studentIds array are required" },
                { status: 400 }
            );
        }

        // Fetch template
        const template = await IDCardTemplate.findById(templateId);
        if (!template) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            );
        }

        // Fetch students
        const students = await User.find({ _id: { $in: studentIds } });

        if (students.length === 0) {
            return NextResponse.json(
                { error: "No students found" },
                { status: 404 }
            );
        }

        // Fetch institute
        const institute = await Institute.findOne().lean();

        // Render common back image
        const backCanvas = await renderIDCardBack(Object.values(students)[0], template, institute);
        const commonBackImage = backCanvas.toDataURL("image/png");

        const studentCards = [];

        for (let i = 0; i < students.length; i++) {
            const student = students[i];

            try {
                console.log(`[IDCardGeneration] Rendering card for student: ${student._id}`);

                // Render front
                const frontCanvas = await renderIDCardFront(student, template);
                const frontImage = frontCanvas.toDataURL("image/png");

                studentCards.push({
                    studentId: student._id,
                    name: `${student.profile?.firstName || ""} ${student.profile?.lastName || ""}`.trim(),
                    rollNumber: student.enrollmentNumber,
                    frontImage: frontImage
                });

            } catch (cardError) {
                console.error(`[IDCardGeneration] Error rendering card for ${student._id}:`, cardError);
                // Continue with next student
            }
        }

        return NextResponse.json({
            success: true,
            commonBackImage,
            studentCards
        });

    } catch (error) {
        console.error("[IDCardGeneration] Error:", error);
        return NextResponse.json(
            { error: "Failed to generate ID cards", details: error.message },
            { status: 500 }
        );
    }
}
