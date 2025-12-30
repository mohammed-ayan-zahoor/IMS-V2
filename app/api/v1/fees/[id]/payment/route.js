import { NextResponse } from "next/server";
import { FeeService } from "@/services/feeService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params; // Fee ID
        const body = await req.json();
        const { installmentId, ...paymentDetails } = body;

        const fee = await FeeService.recordPayment(id, installmentId, paymentDetails, session.user.id);
        return NextResponse.json(fee);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
