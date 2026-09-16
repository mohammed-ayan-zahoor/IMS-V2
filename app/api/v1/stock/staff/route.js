import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getStockAuth } from "@/lib/stock/auth";
import User from "@/models/User";

export async function GET(req) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await connectDB();
        const users = await User.find({
            institute: auth.instituteId,
            role: { $in: ['staff', 'instructor', 'admin'] },
            deletedAt: null
        })
            .select('name email role')
            .sort({ name: 1 })
            .lean();

        return NextResponse.json({ users });
    } catch (error) {
        console.error("Failed to fetch staff for stock:", error);
        return NextResponse.json({ error: "Failed to fetch staff list" }, { status: 500 });
    }
}
