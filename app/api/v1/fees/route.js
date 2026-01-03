import { NextResponse } from "next/server";
import { FeeService } from "@/services/feeService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);

        const filters = {
            batch: searchParams.get('batch'),
            status: searchParams.get('status'),
            student: searchParams.get('student')
        };

        // Enforce Institute Scope
        if (session.user.role === 'admin') {
            if (!session.user.institute?.id) {
                return NextResponse.json({ error: "Admin has no institute context" }, { status: 403 });
            }
            filters.institute = session.user.institute.id;
        } else if (session.user.role === 'student') {
            filters.student = session.user.id;
            if (session.user.institute?.id) {
                filters.institute = session.user.institute.id;
            }
        } else if (session.user.role === 'super_admin') {
            if (session.user.institute?.id) {
                filters.institute = session.user.institute.id;
            }
        } else {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const fees = await FeeService.getFees(filters);
        return NextResponse.json(fees);
    } catch (error) {
        console.error("Fee API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const fee = await FeeService.createFeeStructure(body, session.user.id);
        return NextResponse.json(fee, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
