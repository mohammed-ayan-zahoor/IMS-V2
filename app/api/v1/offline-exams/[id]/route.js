import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import OfflineExam from "@/models/OfflineExam";
import { connectDB } from "@/lib/mongodb";

export async function GET(req, { params }) {
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

        const query = { _id: params.id, deletedAt: null };
        if (scope.instituteId) {
            query.institute = scope.instituteId;
        }

        const exam = await OfflineExam.findOne(query)
            .populate('course', 'name code')
            .populate('session', 'name')
            .populate('batches', 'name')
            .populate('subjects.subject', 'name code')
            .populate('gradingScale', 'name ranges');

        if (!exam) {
            return NextResponse.json({ error: "Offline exam not found" }, { status: 404 });
        }

        return NextResponse.json(exam);
    } catch (error) {
        console.error("API Error [OfflineExam GET]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
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

        const query = { _id: params.id, institute: scope.instituteId, deletedAt: null };
        
        const exam = await OfflineExam.findOneAndUpdate(
            query,
            { $set: body },
            { new: true, runValidators: true }
        );

        if (!exam) {
            return NextResponse.json({ error: "Offline exam not found or access denied" }, { status: 404 });
        }

        return NextResponse.json(exam);
    } catch (error) {
        console.error("API Error [OfflineExam PATCH]:", error);
        return NextResponse.json({ error: error.message || "Failed to update offline exam" }, { status: 400 });
    }
}

export async function DELETE(req, { params }) {
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

        const query = { _id: params.id, institute: scope.instituteId, deletedAt: null };
        
        const exam = await OfflineExam.findOneAndUpdate(
            query,
            { $set: { deletedAt: new Date() } },
            { new: true }
        );

        if (!exam) {
            return NextResponse.json({ error: "Offline exam not found or access denied" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("API Error [OfflineExam DELETE]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
