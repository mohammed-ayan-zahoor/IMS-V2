import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getStockAuth } from "@/lib/stock/auth";
import StockCategory from "@/models/StockCategory";
import { createAuditLog } from "@/services/auditService";

export async function GET(req) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await connectDB();
        const categories = await StockCategory.find({
            institute: auth.instituteId,
            isActive: true
        }).sort({ name: 1 }).lean();

        return NextResponse.json({ categories });
    } catch (error) {
        console.error("Failed to fetch stock categories:", error);
        return NextResponse.json({ error: "Failed to fetch stock categories" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = await req.json();
        const { name } = body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: "Category name is required" }, { status: 400 });
        }

        await connectDB();
        const category = await StockCategory.create({
            institute: auth.instituteId,
            name: name.trim(),
            createdBy: auth.userId
        });

        try {
            await createAuditLog({
                actor: auth.userId,
                action: 'stock_category.create',
                resource: { type: 'StockCategory', id: category._id },
                institute: auth.instituteId,
                details: { name: category.name }
            });
        } catch (auditErr) {
            console.error('Stock category audit log failed:', auditErr);
        }

        return NextResponse.json({ category }, { status: 201 });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A category with this name already exists" }, { status: 400 });
        }
        console.error("Failed to create stock category:", error);
        return NextResponse.json({ error: "Failed to create stock category" }, { status: 500 });
    }
}
