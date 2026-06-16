import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import GradingScale from "@/models/GradingScale";
import { connectDB } from "@/lib/mongodb";

export async function GET(req) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        const query = { deletedAt: null };
        if (scope.instituteId) {
            query.institute = scope.instituteId;
        }

        const scales = await GradingScale.find(query).sort({ createdAt: -1 });
        return NextResponse.json({ gradingScales: scales });
    } catch (error) {
        console.error("API Error [GradingScales GET]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope || !scope.instituteId) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        const body = await req.json();
        
        // Basic validation
        if (!body.name || !body.ranges || !Array.isArray(body.ranges) || body.ranges.length === 0) {
            return NextResponse.json({ error: "Name and at least one range are required" }, { status: 400 });
        }

        const existing = await GradingScale.findOne({ 
            institute: scope.instituteId, 
            name: body.name, 
            deletedAt: null 
        });

        if (existing) {
            return NextResponse.json({ error: "Grading scale with this name already exists" }, { status: 400 });
        }

        const scale = await GradingScale.create({
            ...body,
            institute: scope.instituteId,
            createdBy: session.user.id
        });

        return NextResponse.json(scale, { status: 201 });
    } catch (error) {
        console.error("API Error [GradingScales POST]:", error);
        return NextResponse.json({ error: error.message || "Failed to create grading scale" }, { status: 400 });
    }
}
