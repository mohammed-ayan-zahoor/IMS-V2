import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getStockAuth } from "@/lib/stock/auth";
import StockCategory from "@/models/StockCategory";
import mongoose from "mongoose";

export async function PATCH(req, { params }) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
        }

        const body = await req.json();
        await connectDB();

        const category = await StockCategory.findOne({
            _id: id,
            institute: auth.instituteId
        });

        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }

        if (body.name !== undefined) {
            if (!body.name || !body.name.trim()) {
                return NextResponse.json({ error: "Category name cannot be empty" }, { status: 400 });
            }
            category.name = body.name.trim();
        }

        if (typeof body.isActive === 'boolean') {
            category.isActive = body.isActive;
        }

        await category.save();
        return NextResponse.json({ category });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A category with this name already exists" }, { status: 400 });
        }
        console.error("Failed to update stock category:", error);
        return NextResponse.json({ error: "Failed to update stock category" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
        }

        await connectDB();
        const category = await StockCategory.findOne({
            _id: id,
            institute: auth.instituteId
        });

        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }

        category.isActive = false;
        await category.save();

        return NextResponse.json({ message: "Category deactivated successfully" });
    } catch (error) {
        console.error("Failed to delete stock category:", error);
        return NextResponse.json({ error: "Failed to delete stock category" }, { status: 500 });
    }
}
