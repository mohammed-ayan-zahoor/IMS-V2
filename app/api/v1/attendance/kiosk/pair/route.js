import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Institute from "@/models/Institute";
import Membership from "@/models/Membership";
import KioskDevice from "@/models/KioskDevice";
import { generateKioskKey } from "@/lib/attendance/kioskAuth";
import bcrypt from "bcryptjs";

export async function POST(req) {
    try {
        const body = await req.json();
        const { email, password, deviceName, instituteId } = body;

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

        // 2. Collect all institutes this user has admin access to
        const instituteMap = new Map();

        // Check primary institute on user
        if (user.institute) {
            const primaryInst = await Institute.findById(user.institute).select("name code");
            if (primaryInst && primaryInst.status !== 'deleted') {
                instituteMap.set(primaryInst._id.toString(), {
                    id: primaryInst._id.toString(),
                    name: primaryInst.name,
                    code: primaryInst.code || ""
                });
            }
        }

        // Check memberships
        const memberships = await Membership.find({
            user: user._id,
            isActive: true,
            role: { $in: ['admin', 'super_admin'] }
        }).populate({
            path: 'institute',
            select: 'name code status'
        });

        for (const m of memberships) {
            if (m.institute && m.institute._id && m.institute.status !== 'deleted') {
                instituteMap.set(m.institute._id.toString(), {
                    id: m.institute._id.toString(),
                    name: m.institute.name,
                    code: m.institute.code || ""
                });
            }
        }

        // If Super Admin, allow access to all active institutes
        if (user.role === 'super_admin' || user.isSuperAdmin) {
            const allInsts = await Institute.find({ status: { $ne: 'deleted' } }).select("name code").limit(50);
            for (const inst of allInsts) {
                instituteMap.set(inst._id.toString(), {
                    id: inst._id.toString(),
                    name: inst.name,
                    code: inst.code || ""
                });
            }
        }

        const availableInstitutes = Array.from(instituteMap.values());

        if (availableInstitutes.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No active institute found for this administrator account"
            }, { status: 403 });
        }

        // 3. Multi-Institute Switcher: If user has > 1 institute and hasn't picked one yet
        if (!instituteId && availableInstitutes.length > 1) {
            return NextResponse.json({
                success: true,
                requiresInstituteSelection: true,
                institutes: availableInstitutes,
                message: "Select an institute for this kiosk tablet"
            });
        }

        // 4. Resolve Target Institute
        const targetInstituteId = instituteId || availableInstitutes[0].id;
        const selectedInst = instituteMap.get(targetInstituteId.toString());

        if (!selectedInst) {
            return NextResponse.json({
                success: false,
                message: "Selected institute is invalid or unauthorized"
            }, { status: 403 });
        }

        const institute = await Institute.findById(targetInstituteId);

        // 5. Register Kiosk Device
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

        // 6. Count enrolled staff with face descriptors
        const enrolledStaffCount = await User.countDocuments({
            institute: institute._id,
            deletedAt: null,
            faceDescriptor: { $exists: true, $ne: [] }
        });

        return NextResponse.json({
            success: true,
            requiresInstituteSelection: false,
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
