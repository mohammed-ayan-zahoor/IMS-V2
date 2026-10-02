import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Membership from '@/models/Membership';
import User from '@/models/User';
import { getInstituteScope } from '@/middleware/instituteScope';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 404 });
        }

        if (scope.user.role !== 'admin' && scope.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const memberships = await Membership.find({
            institute: scope.instituteId,
            isActive: true,
            role: { $in: ['admin', 'staff', 'super_admin'] }
        }).populate({
            path: 'user',
            select: 'name email role profile avatar'
        });

        let currentMaster = null;
        const eligibleUsers = [];

        for (const m of memberships) {
            if (!m.user) continue;
            const userData = {
                id: m.user._id.toString(),
                name: m.user.name || `${m.user.profile?.firstName || ''} ${m.user.profile?.lastName || ''}`.trim() || m.user.email,
                email: m.user.email,
                role: m.role,
                avatar: m.user.profile?.avatar || m.user.avatar || null,
                isMasterAdmin: !!m.isMasterAdmin
            };
            if (m.isMasterAdmin) {
                currentMaster = userData;
            }
            eligibleUsers.push(userData);
        }

        return NextResponse.json({
            masterAdmin: currentMaster,
            eligibleUsers
        });
    } catch (error) {
        console.error("GET /api/v1/admin/master error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope?.instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 404 });
        }

        if (scope.user.role !== 'admin' && scope.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { userId } = body;

        // Reset existing master admin for this institute
        await Membership.updateMany(
            { institute: scope.instituteId, isMasterAdmin: true },
            { $set: { isMasterAdmin: false } }
        );

        if (userId) {
            const targetMembership = await Membership.findOne({
                institute: scope.instituteId,
                user: userId,
                isActive: true
            });

            if (!targetMembership) {
                return NextResponse.json({ error: "User is not an active member of this institute" }, { status: 404 });
            }

            targetMembership.isMasterAdmin = true;
            await targetMembership.save();
        }

        return NextResponse.json({ success: true, masterAdminId: userId || null });
    } catch (error) {
        console.error("POST /api/v1/admin/master error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
