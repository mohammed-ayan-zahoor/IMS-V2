import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import KioskDevice from "@/models/KioskDevice";
import { generateKioskKey } from "@/lib/attendance/kioskAuth";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const instituteId = session.user.institute?.id || session.user.institute;
        await connectDB();

        const devices = await KioskDevice.find({
            institute: instituteId,
            revokedAt: null
        })
        .select("-keyHash")
        .sort({ createdAt: -1 });

        return NextResponse.json({ devices });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const instituteId = session.user.institute?.id || session.user.institute;
        const body = await req.json();
        const { name, deviceInfo } = body;

        if (!name || typeof name !== "string") {
            return NextResponse.json({ error: "Device name is required" }, { status: 400 });
        }

        await connectDB();

        const { fullKey, keyPrefix, keyHash } = generateKioskKey();

        const device = await KioskDevice.create({
            name: name.trim(),
            institute: instituteId,
            keyPrefix,
            keyHash,
            createdBy: session.user.id,
            deviceInfo: deviceInfo || {}
        });

        // Return fullKey ONCE so admin can configure the tablet
        return NextResponse.json({
            message: "Kiosk device registered successfully. Copy the key now; it will not be displayed again.",
            device: {
                id: device._id,
                name: device.name,
                keyPrefix: device.keyPrefix,
                createdAt: device.createdAt
            },
            kioskKey: fullKey
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const instituteId = session.user.institute?.id || session.user.institute;
        const { searchParams } = new URL(req.url);
        const deviceId = searchParams.get("id");

        if (!deviceId) {
            return NextResponse.json({ error: "Device ID is required" }, { status: 400 });
        }

        await connectDB();

        const device = await KioskDevice.findOneAndUpdate(
            { _id: deviceId, institute: instituteId },
            { $set: { isActive: false, revokedAt: new Date() } },
            { new: true }
        );

        if (!device) {
            return NextResponse.json({ error: "Device not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Kiosk device revoked successfully" });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
