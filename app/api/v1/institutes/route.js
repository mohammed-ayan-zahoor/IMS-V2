import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import Institute from "@/models/Institute";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import bcrypt from "bcryptjs";
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "super_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const status = searchParams.get("status");

        const query = {};
        if (search) {
            const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const escapedSearch = escapeRegex(search); // Escape special regex characters
            query.$or = [
                { name: { $regex: escapedSearch, $options: "i" } },
                { code: { $regex: escapedSearch, $options: "i" } }
            ];
        }

        if (status) query.status = status;

        const institutes = await Institute.find(query).sort({ createdAt: -1 });
        return NextResponse.json({ institutes });
    } catch (error) {
        console.error("Get Institutes Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "super_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();

        // 1. Validation
        if (!body.name || !body.code || !body.adminEmail || !body.adminPassword) {
            return NextResponse.json({ error: "Missing required fields (Name, Code, Admin Email, Admin Password)" }, { status: 400 });
        }

        // Check duplicates
        const existingCode = await Institute.findOne({ code: body.code.toUpperCase() });
        if (existingCode) {
            return NextResponse.json({ error: "Institute Code already exists" }, { status: 400 });
        }

        const sessionDb = await mongoose.startSession();
        let institute, adminUser;

        try {
            sessionDb.startTransaction();

            // 2. Create Institute
            institute = await Institute.create([{
                name: body.name,
                code: body.code.toUpperCase(),
                contactEmail: body.contactEmail || body.adminEmail, // Default to admin email if not provided
                address: body.address,
                status: 'active',
                subscription: {
                    plan: 'free', // Default plan
                    startDate: new Date(),
                    isActive: true
                },
                createdBy: session.user.id
            }], { session: sessionDb });

            institute = institute[0]; // create returns array

            // Check if email already exists within this institute (redundant but safe)
            const existingUser = await User.findOne({
                email: body.adminEmail.toLowerCase(),
                institute: institute._id
            }).session(sessionDb);
            if (existingUser) {
                throw new Error("Admin email already exists for this institute");
            }

            // 3. Create Admin User for this Institute
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(body.adminPassword, salt);

            // Check if user email already exists globally? 
            // Our logic allows same email in different institutes, BUT it might be confusing for login if they use same email.
            // The login requires institute code, so duplicates are technically fine.
            // However, globally unique emails are better for strict uniqueness.
            // Let's allow duplicates but scoped to institute (which we enforced in User model).

            adminUser = await User.create([{
                email: body.adminEmail.toLowerCase(),
                passwordHash: hashedPassword,
                role: 'admin',
                profile: {
                    firstName: body.adminName || 'Admin',
                    lastName: body.adminLastName || 'User',
                    phone: body.contactPhone
                },
                institute: institute._id,
                isActive: true
            }], { session: sessionDb });

            // 4. Audit Log
            await AuditLog.create([{
                actor: session.user.id,
                action: 'institute.create',
                resource: { type: 'Institute', id: institute._id },
                institute: institute._id, // Self-reference? Or Super Admin Log?
                // Super Admin doesn't necessarily belong to this new institute. 
                // So we might leave institute null or use Default.
                // But wait, the schema requires institute.
                // Super Admin's institute ID (Default) should probably be logged?
                // Let's use the new institute ID to track actions related to it.
                details: { name: institute.name, code: institute.code }
            }], { session: sessionDb });

            await sessionDb.commitTransaction();

        } catch (err) {
            await sessionDb.abortTransaction();
            // Handle MongoDB duplicate key error for institute code (TOCTOU race)
            if (err.code === 11000 && (err.keyPattern?.code || err.message?.includes("code"))) {
                return NextResponse.json({ error: "Institute Code already exists" }, { status: 400 });
            }
            throw err;
        } finally {
            sessionDb.endSession();
        }

        return NextResponse.json({ success: true, institute });

    } catch (error) {
        console.error("Create Institute Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
