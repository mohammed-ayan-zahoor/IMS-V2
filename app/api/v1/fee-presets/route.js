import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import FeePreset from "@/models/FeePreset";
import { getInstituteScope } from "@/middleware/instituteScope";
import { createAuditLog } from "@/services/auditService";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) return NextResponse.json({ error: "Missing institute context" }, { status: 400 });

        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get("courseId");
        const category = searchParams.get("category");

        await connectDB();
        const query = {
            institute: scope.instituteId,
            deletedAt: null
        };

        if (courseId) {
            query.course = courseId;
        }
        if (category) {
            query.category = category;
        }

        const presets = await FeePreset.find(query)
            .populate('subjects', 'name code')
            .sort({ category: 1, name: 1 });
            
        return NextResponse.json({ presets });

    } catch (error) {
        console.error("API Error [FeePresets GET]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) return NextResponse.json({ error: "Missing institute context" }, { status: 400 });

        const body = await req.json();
        const { name, amount, courseId, description, subjects, category, complexity } = body;

        if (!name || !amount || !courseId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectDB();

        // Optional: Validate that subjects exist if provided
        if (subjects && Array.isArray(subjects) && subjects.length > 0) {
            const Subject = (await import("@/models/Subject")).default;
            const validSubjects = await Subject.find({
                _id: { $in: subjects },
                institute: scope.instituteId,
                deletedAt: null
            });
            if (validSubjects.length !== subjects.length) {
                return NextResponse.json({ error: "One or more invalid subject IDs provided" }, { status: 400 });
            }
        }

        const preset = await FeePreset.create({
            institute: scope.instituteId,
            course: courseId,
            name,
            amount: parseFloat(amount),
            description,
            subjects: subjects || [],
            category: category || 'general',
            complexity: complexity || 'standard'
        });

        await createAuditLog({
            actor: session.user.id,
            action: 'fee_preset.create',
            resource: { type: 'FeePreset', id: preset._id },
            institute: scope.instituteId,
            details: { name, amount, subjects, category }
        });

        return NextResponse.json({ preset });

    } catch (error) {
        console.error("API Error [FeePresets POST]:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
