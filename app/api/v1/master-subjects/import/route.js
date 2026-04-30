import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { MasterSubjectService } from "@/services/masterSubjectService";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const scope = await getInstituteScope(req);
        const body = await req.json(); // { subjects: [...], overwrite: boolean }
        
        const result = await MasterSubjectService.importMasterSubjects(
            scope.instituteId,
            body.subjects,
            session.user.id,
            body.overwrite || false,
            req
        );
        
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
