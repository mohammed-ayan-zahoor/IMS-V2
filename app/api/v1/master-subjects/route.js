import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { MasterSubjectService } from "@/services/masterSubjectService";

export async function GET(req) {
    try {
        const scope = await getInstituteScope(req);
        if (!scope || !scope.instituteId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const subjects = await MasterSubjectService.getMasterSubjects(scope.instituteId);
        return NextResponse.json({ subjects });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const scope = await getInstituteScope(req);
        const body = await req.json();
        const subject = await MasterSubjectService.createMasterSubject(
            { ...body, institute: scope.instituteId },
            session.user.id,
            req
        );
        return NextResponse.json({ subject }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
