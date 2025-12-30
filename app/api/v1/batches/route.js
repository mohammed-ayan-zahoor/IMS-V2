// C:\Users\Charge-entry18\Desktop\Projects\ims-v2\app\api\v1\batches\route.js
import { NextResponse } from "next/server";
import { BatchService } from "@/services/courseService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const batches = await BatchService.getBatches();
    return NextResponse.json(batches);
}

export async function POST(req) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === "student") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const batch = await BatchService.createBatch(body, session.user.id);
    return NextResponse.json(batch, { status: 201 });
}
