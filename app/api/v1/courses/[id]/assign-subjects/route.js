import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { SubjectService } from "@/services/subjectService";

export async function POST(req, { params: paramsPromise }) {
    try {
        const params = await paramsPromise;
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const scope = await getInstituteScope(req);
        const body = await req.json(); // { librarySubjectIds: [...] }
        
        const subjects = await SubjectService.assignFromLibrary(
            params.id,
            body.librarySubjectIds,
            scope.instituteId,
            session.user.id,
            req
        );
        
        return NextResponse.json({ subjects });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
