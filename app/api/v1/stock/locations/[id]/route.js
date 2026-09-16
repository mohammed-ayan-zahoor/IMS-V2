import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getStockAuth } from "@/lib/stock/auth";
import StockLocation from "@/models/StockLocation";
import mongoose from "mongoose";

export async function PATCH(req, { params }) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid location ID" }, { status: 400 });
        }

        const body = await req.json();
        await connectDB();

        const location = await StockLocation.findOne({
            _id: id,
            institute: auth.instituteId
        });

        if (!location) {
            return NextResponse.json({ error: "Location not found" }, { status: 404 });
        }

        if (body.name !== undefined) {
            if (!body.name || !body.name.trim()) {
                return NextResponse.json({ error: "Location name cannot be empty" }, { status: 400 });
            }
            location.name = body.name.trim();
        }

        if (body.code !== undefined) {
            location.code = body.code ? body.code.trim().toUpperCase() : undefined;
        }

        if (body.inCharge !== undefined) {
            location.inCharge = body.inCharge || undefined;
        }

        if (typeof body.isActive === 'boolean') {
            location.isActive = body.isActive;
        }

        await location.save();
        return NextResponse.json({ location });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A location with this name or code already exists" }, { status: 400 });
        }
        console.error("Failed to update stock location:", error);
        return NextResponse.json({ error: "Failed to update stock location" }, { status: 500 });
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
            return NextResponse.json({ error: "Invalid location ID" }, { status: 400 });
        }

        await connectDB();
        const location = await StockLocation.findOne({
            _id: id,
            institute: auth.instituteId
        });

        if (!location) {
            return NextResponse.json({ error: "Location not found" }, { status: 404 });
        }

        location.isActive = false;
        await location.save();

        return NextResponse.json({ message: "Location deactivated successfully" });
    } catch (error) {
        console.error("Failed to delete stock location:", error);
        return NextResponse.json({ error: "Failed to delete stock location" }, { status: 500 });
    }
}
