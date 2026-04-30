import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { MasterSubjectService } from "@/services/masterSubjectService";

export async function PATCH(req, { params: paramsPromise }) {
    try {
        const params = await paramsPromise;
        const session = await getServerSession(authOptions);
        const scope = await getInstituteScope(req);
        const body = await req.json();
        const subject = await MasterSubjectService.updateMasterSubject(
            params.id,
            body,
            session.user.id,
            scope,
            req
        );
        return NextResponse.json({ subject });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req, { params: paramsPromise }) {
    try {
        const params = await paramsPromise;
        const session = await getServerSession(authOptions);
        const scope = await getInstituteScope(req);
        await MasterSubjectService.deleteMasterSubject(params.id, session.user.id, scope, req);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
