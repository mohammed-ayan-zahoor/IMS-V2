import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getStockAuth } from "@/lib/stock/auth";
import Vendor from "@/models/Vendor";
import { createAuditLog } from "@/services/auditService";

export async function GET(req) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await connectDB();
        const vendors = await Vendor.find({
            institute: auth.instituteId,
            isActive: true
        }).sort({ name: 1 }).lean();

        return NextResponse.json({ vendors });
    } catch (error) {
        console.error("Failed to fetch vendors:", error);
        return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const auth = await getStockAuth(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const body = await req.json();
        const { name, contactPerson, phone, email, gstin, address } = body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: "Vendor name is required" }, { status: 400 });
        }

        await connectDB();
        const vendor = await Vendor.create({
            institute: auth.instituteId,
            name: name.trim(),
            contactPerson: contactPerson?.trim(),
            phone: phone?.trim(),
            email: email?.trim()?.toLowerCase(),
            gstin: gstin?.trim()?.toUpperCase(),
            address: address?.trim(),
            createdBy: auth.userId
        });

        try {
            await createAuditLog({
                actor: auth.userId,
                action: 'vendor.create',
                resource: { type: 'Vendor', id: vendor._id },
                institute: auth.instituteId,
                details: { name: vendor.name, gstin: vendor.gstin }
            });
        } catch (auditErr) {
            console.error('Vendor audit log failed:', auditErr);
        }

        return NextResponse.json({ vendor }, { status: 201 });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ error: "A vendor with this name already exists" }, { status: 400 });
        }
        console.error("Failed to create vendor:", error);
        return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 });
    }
}
