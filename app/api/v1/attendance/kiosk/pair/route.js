import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Institute from "@/models/Institute";
import KioskDevice from "@/models/KioskDevice";
import { generateKioskKey } from "@/lib/attendance/kioskAuth";
import bcrypt from "bcryptjs";

export async function POST(req) {
    try {
        const body = await req.json();
        const { email, password, deviceName } = body;

        if (!email || !password) {
            return NextResponse.json({
                success: false,
                message: "Email and password are required"
            }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        await connectDB();

        // 1. Authenticate Admin User
        const user = await User.findOne({
            email: normalizedEmail,
            deletedAt: null
        }).select("+passwordHash");

        if (!user || !user.passwordHash) {
            return NextResponse.json({
                success: false,
                message: "Invalid email or password"
            }, { status: 401 });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return NextResponse.json({
                success: false,
                message: "Invalid email or password"
            }, { status: 401 });
        }

        // 2. Verify Admin Privileges
        const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.isSuperAdmin;
        if (!isAdmin) {
            return NextResponse.json({
                success: false,
                message: "Only institute administrators can pair attendance kiosks"
            }, { status: 403 });
        }

        // 3. Resolve Institute
        const instituteId = user.institute;
        if (!instituteId) {
            return NextResponse.json({
                success: false,
                message: "No institute linked to this administrator account"
            }, { status: 400 });
        }

        const institute = await Institute.findById(instituteId);
        if (!institute) {
            return NextResponse.json({
                success: false,
                message: "Institute record not found"
            }, { status: 404 });
        }

        // 4. Register Kiosk Device
        const { fullKey, keyPrefix, keyHash } = generateKioskKey();
        const kioskName = (deviceName && deviceName.trim().length > 0) ? deviceName.trim() : "Front Gate Tablet";

        const kioskDevice = await KioskDevice.create({
            name: kioskName,
            institute: institute._id,
            keyPrefix,
            keyHash,
            status: 'ACTIVE',
            createdBy: user._id,
            lastSeenAt: new Date()
        });

        // 5. Count enrolled staff with face descriptors
        const enrolledStaffCount = await User.countDocuments({
            institute: institute._id,
            deletedAt: null,
            faceDescriptor: { $exists: true, $ne: [] }
        });

        return NextResponse.json({
            success: true,
            kioskKey: fullKey,
            instituteName: institute.name,
            kioskName: kioskDevice.name,
            enrolledStaffCount,
            message: `Tablet successfully paired with ${institute.name}`
        });

    } catch (error) {
        console.error("Kiosk pairing error:", error);
        return NextResponse.json({
            success: false,
            message: error.message || "Failed to pair kiosk tablet"
        }, { status: 500 });
    }
}
