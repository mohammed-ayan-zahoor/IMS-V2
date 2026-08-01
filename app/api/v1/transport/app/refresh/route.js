import { NextResponse } from "next/server";
import { verifyToken, signToken } from "@/lib/jwt";

export async function POST(req) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader) {
            return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
        }

        const decoded = verifyToken(authHeader);
        if (!decoded) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }

        // Issue new token with fresh 30-day expiry
        const { exp, iat, ...payload } = decoded;
        const newToken = signToken(payload);

        return NextResponse.json({ token: newToken });
    } catch (error) {
        console.error("POST /api/v1/transport/app/refresh error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
