import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Membership from "@/models/Membership";
import Designation from "@/models/Designation";
import { createAuditLog } from "@/services/auditService";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const roleFilter = searchParams.get('role'); // 'all', 'instructor', 'admin', 'staff'
        const designationFilter = searchParams.get('designation');
        const search = searchParams.get('search')?.trim();

        await connectDB();

        const query = {
            institute: instituteId,
            role: { $in: ['admin', 'instructor', 'staff'] },
            deletedAt: null
        };

        if (roleFilter && roleFilter !== 'all') {
            query.role = roleFilter;
        }

        if (designationFilter && mongoose.Types.ObjectId.isValid(designationFilter)) {
            query['hrDetails.designation'] = designationFilter;
        }

        if (search) {
            query.$or = [
                { 'profile.firstName': { $regex: search, $options: 'i' } },
                { 'profile.lastName': { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { 'profile.phone': { $regex: search, $options: 'i' } },
                { enrollmentNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const staffMembers = await User.find(query)
            .populate('hrDetails.designation', 'name')
            .populate('hrDetails.earnings.component', 'name type')
            .populate('hrDetails.deductions.component', 'name type')
            .select('-passwordHash -faceDescriptor')
            .sort({ 'profile.firstName': 1, createdAt: -1 });

        // Calculate role counts
        const allCounts = await User.aggregate([
            { $match: { institute: new mongoose.Types.ObjectId(instituteId), role: { $in: ['admin', 'instructor', 'staff'] }, deletedAt: null } },
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);

        const counts = { all: staffMembers.length, instructor: 0, admin: 0, staff: 0 };
        allCounts.forEach(c => {
            if (counts[c._id] !== undefined) counts[c._id] = c.count;
        });
        counts.all = (counts.instructor || 0) + (counts.admin || 0) + (counts.staff || 0);

        return NextResponse.json({ staffMembers, counts });
    } catch (error) {
        console.error("Failed to fetch staff members:", error);
        return NextResponse.json({ error: "Failed to fetch staff members" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        const body = await req.json();
        const {
            firstName,
            lastName,
            phone,
            email,
            password,
            role,
            designation,
            qualification,
            joiningDate,
            basicSalary,
            allowLogin = true,
            gender,
            bloodGroup,
            dob,
            address,
            panNumber,
            uanNumber,
            esiNumber,
            bankDetails
        } = body;

        if (!firstName || !firstName.trim()) {
            return NextResponse.json({ error: "First name is required" }, { status: 400 });
        }

        const assignedRole = role || 'staff';
        if (!['admin', 'instructor', 'staff'].includes(assignedRole)) {
            return NextResponse.json({ error: "Invalid role. Must be 'admin', 'instructor', or 'staff'" }, { status: 400 });
        }

        await connectDB();

        // Handle email and login
        let userEmail = email?.trim()?.toLowerCase();
        let userPassword = password;

        if (!allowLogin) {
            // Non-login staff (e.g., maids, sweepers, drivers)
            if (!userEmail) {
                const uniquePart = crypto.randomBytes(4).toString('hex');
                userEmail = `staff.${Date.now()}.${uniquePart}@ims.internal`;
            }
            if (!userPassword) {
                userPassword = crypto.randomBytes(32).toString('hex');
            }
        } else {
            // Login-enabled staff must provide email & password
            if (!userEmail) {
                return NextResponse.json({ error: "Email address is required for login-enabled staff" }, { status: 400 });
            }
            if (!userPassword || userPassword.length < 6) {
                return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
            }

            const existingUser = await User.findOne({ email: userEmail, deletedAt: null });
            if (existingUser) {
                return NextResponse.json({ error: "A user with this email address already exists" }, { status: 400 });
            }
        }

        const passwordHash = await bcrypt.hash(userPassword, 10);
        const empCode = `EMP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        const userPayload = {
            institute: instituteId,
            email: userEmail,
            passwordHash,
            role: assignedRole,
            allowLogin: !!allowLogin,
            enrollmentNumber: empCode,
            isActive: true,
            profile: {
                firstName: firstName.trim(),
                lastName: lastName?.trim() || "",
                phone: phone?.trim() || "",
                gender: gender || "",
                bloodGroup: bloodGroup || "",
                dateOfBirth: dob ? new Date(dob) : undefined,
                address: address ? {
                    street: address.street || "",
                    city: address.city || "",
                    state: address.state || "",
                    pincode: address.pincode || ""
                } : undefined
            },
            hrDetails: {
                designation: designation && mongoose.Types.ObjectId.isValid(designation) ? designation : undefined,
                qualification: qualification?.trim() || "",
                joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
                basicSalary: parseFloat(basicSalary) || 0,
                panNumber: panNumber?.trim() || "",
                uanNumber: uanNumber?.trim() || "",
                esiNumber: esiNumber?.trim() || "",
                bankDetails: bankDetails ? {
                    accountName: bankDetails.accountName?.trim() || "",
                    accountNumber: bankDetails.accountNumber?.trim() || "",
                    bankName: bankDetails.bankName?.trim() || "",
                    ifscCode: bankDetails.ifscCode?.trim() || "",
                    branch: bankDetails.branch?.trim() || ""
                } : undefined,
                earnings: [],
                deductions: []
            }
        };

        let user;
        const dbSession = await mongoose.startSession();
        try {
            dbSession.startTransaction();
            const [created] = await User.create([userPayload], { session: dbSession });
            user = created;
            await Membership.create([{
                user: user._id,
                institute: instituteId,
                role: assignedRole,
                isActive: true
            }], { session: dbSession });
            await dbSession.commitTransaction();
        } catch (trxErr) {
            try { await dbSession.abortTransaction(); } catch (e) {}
            // Standalone MongoDB fallback
            user = await User.create(userPayload);
            await Membership.create({
                user: user._id,
                institute: instituteId,
                role: assignedRole,
                isActive: true
            });
        } finally {
            dbSession.endSession();
        }

        try {
            await createAuditLog({
                actor: session.user.id,
                action: 'hr.staff.create',
                resource: { type: 'User', id: user._id },
                institute: instituteId,
                details: { name: `${user.profile?.firstName} ${user.profile?.lastName}`, role: user.role, allowLogin: user.allowLogin }
            });
        } catch (auditError) {
            console.error('Audit log failed:', auditError);
        }

        return NextResponse.json({ staffMember: user });
    } catch (error) {
        console.error("Failed to create staff member:", error);
        return NextResponse.json({ error: error.message || "Failed to create staff member" }, { status: 500 });
    }
}
