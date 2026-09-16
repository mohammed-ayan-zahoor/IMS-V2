import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getStockAuth } from "@/lib/stock/auth";
import Vendor from "@/models/Vendor";
import mongoose from "mongoose";

export async function PATCH(req, { params }) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 });
        }

        const body = await req.json();
        await connectDB();

        const vendor = await Vendor.findOne({
            _id: id,
            institute: auth.instituteId
        });

        if (!vendor) {
            return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
        }

        if (body.name !== undefined) {
            if (!body.name || !body.name.trim()) {
                return NextResponse.json({ error: "Vendor name cannot be empty" }, { status: 400 });
            }
            vendor.name = body.name.trim();
        }

        if (body.contactPerson !== undefined) vendor.contactPerson = body.contactPerson?.trim();
        if (body.phone !== undefined) vendor.phone = body.phone?.trim();
        if (body.email !== undefined) vendor.email = body.email?.trim()?.toLowerCase();
        if (body.gstin !== undefined) vendor.gstin = body.gstin?.trim()?.toUpperCase();
        if (body.address !== undefined) vendor.address = body.address?.trim();
        if (typeof body.isActive === 'boolean') vendor.isActive = body.isActive;

        await vendor.save();
        return NextResponse.json({ vendor });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A vendor with this name already exists" }, { status: 400 });
        }
        console.error("Failed to update vendor:", error);
        return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
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
            return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 });
        }

        await connectDB();
        const vendor = await Vendor.findOne({
            _id: id,
            institute: auth.instituteId
        });

        if (!vendor) {
            return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
        }

        vendor.isActive = false;
        await vendor.save();

        return NextResponse.json({ message: "Vendor deactivated successfully" });
    } catch (error) {
        console.error("Failed to delete vendor:", error);
        return NextResponse.json({ error: "Failed to delete vendor" }, { status: 500 });
    }
}
