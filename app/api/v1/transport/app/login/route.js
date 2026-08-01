import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Driver from "@/models/Driver";
import User from "@/models/User";
import Institute from "@/models/Institute";
import Vehicle from "@/models/Vehicle";
import TransportRoute from "@/models/TransportRoute";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";

export async function POST(req) {
    try {
        await connectDB();
        const body = await req.json();
        const type = body.type || (body.phone ? "driver" : "parent");

        // ── 1. DRIVER LOGIN FLOW ────────────────────────────────────────────────
        if (type === "driver") {
            const { phone, pin, instituteCode } = body;

            if (!phone || !pin) {
                return NextResponse.json(
                    { error: "Phone number and PIN are required" },
                    { status: 400 }
                );
            }

            let institute = null;
            if (instituteCode) {
                institute = await Institute.findOne({
                    code: instituteCode.toUpperCase().trim(),
                    status: "active",
                    isActive: true
                });
                if (!institute) {
                    return NextResponse.json(
                        { error: "Invalid institute code" },
                        { status: 404 }
                    );
                }
            }

            // Find driver by phone (and institute if code provided)
            const query = { phone: phone.trim(), deletedAt: null };
            if (institute) query.institute = institute._id;

            const driver = await Driver.findOne(query)
                .select("+pinHash")
                .populate({
                    path: "assignedVehicle",
                    populate: { path: "route" }
                });

            if (!driver) {
                return NextResponse.json(
                    { error: "Driver profile not found" },
                    { status: 404 }
                );
            }

            // Validate PIN (bcrypt check if pinHash exists, or simple string check)
            let isPinValid = false;
            if (driver.pinHash) {
                isPinValid = await bcrypt.compare(String(pin), driver.pinHash);
            } else {
                // If no pinHash set yet, fallback to matching last 4 digits of phone or "1234"
                isPinValid = String(pin) === "1234" || String(pin) === driver.phone.slice(-4);
            }

            if (!isPinValid) {
                return NextResponse.json(
                    { error: "Invalid PIN" },
                    { status: 401 }
                );
            }

            const vehicle = driver.assignedVehicle;
            const route = vehicle?.route;

            const tokenPayload = {
                id: driver._id.toString(),
                role: "driver",
                driverId: driver._id.toString(),
                instituteId: driver.institute.toString(),
                vehicleId: vehicle?._id?.toString() || null,
                routeId: route?._id?.toString() || null
            };

            const token = signToken(tokenPayload);

            return NextResponse.json({
                role: "driver",
                token,
                driver: {
                    _id: driver._id,
                    name: driver.name,
                    phone: driver.phone,
                    institute: driver.institute,
                    vehicle: vehicle ? {
                        _id: vehicle._id,
                        registrationNumber: vehicle.registrationNumber,
                        type: vehicle.type
                    } : null,
                    route: route ? {
                        _id: route._id,
                        name: route.name,
                        stops: route.stops || []
                    } : null
                }
            });
        }

        // ── 2. PARENT LOGIN FLOW ────────────────────────────────────────────────
        if (type === "parent") {
            const { email, password } = body;

            if (!email || !password) {
                return NextResponse.json(
                    { error: "Email and password are required" },
                    { status: 400 }
                );
            }

            const user = await User.findOne({
                email: email.toLowerCase().trim(),
                deletedAt: null
            }).select("+passwordHash");

            if (!user) {
                return NextResponse.json(
                    { error: "Invalid email or password" },
                    { status: 401 }
                );
            }

            const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
            if (!isPasswordValid) {
                return NextResponse.json(
                    { error: "Invalid email or password" },
                    { status: 401 }
                );
            }

            // Find all students linked to this parent (by fatherPhone/motherPhone or guardian or self)
            let students = [];
            if (user.role === "student") {
                students = [user];
            } else {
                const userPhone = user.profile?.phone || "";
                students = await User.find({
                    institute: user.institute,
                    role: "student",
                    deletedAt: null,
                    $or: [
                        { fatherPhone: userPhone },
                        { motherPhone: userPhone },
                        { "guardianDetails.phone": userPhone },
                        { _id: user._id }
                    ]
                }).lean();
            }

            const studentIds = students.map(s => s._id.toString());

            const tokenPayload = {
                id: user._id.toString(),
                role: "parent",
                userId: user._id.toString(),
                instituteId: user.institute?.toString() || null,
                studentIds
            };

            const token = signToken(tokenPayload);

            return NextResponse.json({
                role: "parent",
                token,
                students: students.map(s => ({
                    _id: s._id,
                    name: `${s.profile?.firstName || ''} ${s.profile?.lastName || ''}`.trim(),
                    photo: s.profile?.avatar || null,
                    enrollmentNumber: s.enrollmentNumber,
                    transport: s.transport || {}
                }))
            });
        }

        return NextResponse.json({ error: "Invalid auth type" }, { status: 400 });

    } catch (error) {
        console.error("POST /api/v1/transport/app/login error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
