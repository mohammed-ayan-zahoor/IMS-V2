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

        // Helper function to execute creation logic (with or without session)
        const createInstituteLogic = async (dbSession = null, manualRollback = false) => {
            const opts = dbSession ? { session: dbSession } : {};

            // 2. Create Institute
            const [institute] = await Institute.create([{
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
            }], opts);

            try {
                // Check if email already exists within this institute
                // Check if email already exists globally (assuming email is unique login identifier)
                const existingUser = await User.findOne({
                    email: body.adminEmail.toLowerCase()
                }).setOptions(opts);

                if (existingUser) {
                    throw new Error("Admin email already exists");
                }

                // 3. Create Admin User for this Institute
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(body.adminPassword, salt);

                const [adminUser] = await User.create([{
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
                }], opts);

                // 4. Audit Log
                await AuditLog.create([{
                    actor: session.user.id,
                    action: 'institute.create',
                    resource: { type: 'Institute', id: institute._id },
                    institute: institute._id,
                    details: { name: institute.name, code: institute.code }
                }], opts);

                return institute;

            } catch (innerError) {
                if (manualRollback) {
                    console.error("Sequential Execution Failed. Rolling back:", institute._id);
                    try {
                        await User.deleteMany({ institute: institute._id });
                        await Institute.findByIdAndDelete(institute._id);
                    } catch (rollbackError) {
                        console.error("Rollback failed:", rollbackError);
                    }
                }
                throw innerError;
            }
        };

        // Transaction Execution Strategy
        let institute;
        const dbSession = await mongoose.startSession();
        try {
            dbSession.startTransaction();
            institute = await createInstituteLogic(dbSession, false); // No manual rollback in transaction
            await dbSession.commitTransaction();
        } catch (error) {
            await dbSession.abortTransaction();
            // Check for Standalone MongoDB error (Code 20: IllegalOperation)
            // or if the error message explicitly mentions transaction numbers support
            if (error.code === 20 || error.message?.includes("Transaction numbers")) {
                console.warn("MongoDB Transactions not supported (Standalone mode). Falling back to sequential execution.");
                // Retry without a session (non-transactional) but WITH manual rollback
                try {
                    institute = await createInstituteLogic(null, true);
                } catch (retryError) {
                    // Handle duplicate key error manually during retry if needed, or just let it bubble
                    if (retryError.code === 11000) {
                        return NextResponse.json({ error: "Institute Code or User Email already exists" }, { status: 400 });
                    }
                    console.error("Final Create Error (Sequential):", retryError);
                    throw retryError;
                }
            } else {
                // Re-throw other errors (like validation or duplicate key in transaction)
                if (error.code === 11000) {
                    return NextResponse.json({ error: "Institute Code or User Email already exists" }, { status: 400 });
                }
                throw error;
            }
        } finally {
            dbSession.endSession();
        }

        return NextResponse.json({ success: true, institute });

    } catch (error) {
        console.error("Create Institute Error:", error);
        // Hide internal error details from client
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
