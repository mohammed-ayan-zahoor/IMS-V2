import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import FeeHead from "@/models/FeeHead";
import { getInstituteScope } from "@/middleware/instituteScope";
import { createAuditLog } from "@/services/auditService";

const DEFAULT_FEE_HEADS = [
    { name: "Tuition Fee", code: "TUITION", category: "tuition", isDefaultApplied: true, description: "Core academic instruction & curriculum fee" },
    { name: "Books & Study Material", code: "BOOKS", category: "books", isDefaultApplied: true, description: "Textbooks, workbooks, stationery kit & reading materials" },
    { name: "School Uniform Set", code: "UNIFORM", category: "uniform", isDefaultApplied: true, description: "Regular uniform set, sportswear & accessories" },
    { name: "Annual Activity & Development", code: "ACTIVITY", category: "activity", isDefaultApplied: true, description: "Sports, annual day, library & lab usage charges" }
];

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) return NextResponse.json({ error: "Missing institute context" }, { status: 400 });

        await connectDB();

        let heads = await FeeHead.find({
            institute: scope.instituteId,
            deletedAt: null
        }).sort({ createdAt: 1 });

        // Auto-seed default standard heads if institute has none yet
        if (heads.length === 0) {
            try {
                const seedDocs = DEFAULT_FEE_HEADS.map(h => ({
                    ...h,
                    institute: scope.instituteId,
                    createdBy: session.user.id
                }));
                heads = await FeeHead.insertMany(seedDocs);
            } catch (seedErr) {
                console.warn("[FeeHead GET] Auto-seed conflict (already created in parallel):", seedErr.message);
                heads = await FeeHead.find({
                    institute: scope.instituteId,
                    deletedAt: null
                }).sort({ createdAt: 1 });
            }
        }

        return NextResponse.json({ feeHeads: heads });
    } catch (error) {
        console.error("API Error [FeeHeads GET]:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) return NextResponse.json({ error: "Missing institute context" }, { status: 400 });

        const body = await req.json();
        const { name, code, category = "other", isDefaultApplied = true, description } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ error: "Fee head name is required" }, { status: 400 });
        }

        await connectDB();

        const cleanName = name.trim();
        const existing = await FeeHead.findOne({
            institute: scope.instituteId,
            name: { $regex: new RegExp(`^${cleanName}$`, "i") },
            deletedAt: null
        });

        if (existing) {
            return NextResponse.json({ error: `A fee head named "${cleanName}" already exists.` }, { status: 400 });
        }

        const cleanCode = (code || cleanName.replace(/[^A-Za-z0-9]/g, "").slice(0, 10)).toUpperCase();

        const feeHead = await FeeHead.create({
            institute: scope.instituteId,
            name: cleanName,
            code: cleanCode,
            category,
            isDefaultApplied: Boolean(isDefaultApplied),
            description: description?.trim() || "",
            createdBy: session.user.id
        });

        await createAuditLog({
            actor: session.user.id,
            action: 'feeHead.create',
            resource: { type: 'FeeHead', id: feeHead._id },
            institute: scope.instituteId,
            details: { name: cleanName, code: cleanCode, category }
        });

        return NextResponse.json({ feeHead }, { status: 201 });
    } catch (error) {
        console.error("API Error [FeeHeads POST]:", error);
        return NextResponse.json({ error: error.message || "Failed to create fee head" }, { status: 500 });
    }
}
