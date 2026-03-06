import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import Membership from "@/models/Membership";
import Institute from "@/models/Institute";

export async function POST(req) {
    try {
        await connectDB();
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { instituteId } = body;

        if (!instituteId) {
            return NextResponse.json({ error: "Institute ID required" }, { status: 400 });
        }

        let targetInstitute = null;
        let membershipRole = null;

        if (session.user.role === 'super_admin') {
            // Super Admin can switch to any active institute
            targetInstitute = await Institute.findOne({
                _id: new mongoose.Types.ObjectId(instituteId),
                status: 'active',
                isActive: true
            });
            console.log("=> Switch Index: Super Admin mode", { targetFound: !!targetInstitute });
        } else {
            // Regular user must have a membership
            const safeUserId = new mongoose.Types.ObjectId(session.user.id);
            const safeInstId = new mongoose.Types.ObjectId(instituteId);

            let membership = await Membership.findOne({
                user: safeUserId,
                institute: safeInstId,
                isActive: true
            }).populate('institute');

            if (!membership) {
                return NextResponse.json({
                    error: "No membership found for this institute"
                }, { status: 403 });
            }
            // Fallback if populate failed or institute is a string/object mismatch
            if (!membership.institute || typeof membership.institute.status === 'undefined') {
                const instId = membership.institute?._id || membership.institute || safeInstId;
                membership.institute = await Institute.findById(instId);
            }

            if (!membership.institute) {
                return NextResponse.json({ error: "Institute details not found" }, { status: 404 });
            }

            if (membership.institute.status !== 'active' || !membership.institute.isActive) {
                return NextResponse.json({
                    error: "Institute is not active",
                    debug: {
                        status: membership.institute.status,
                        isActive: membership.institute.isActive,
                        instituteId: membership.institute._id
                    }
                }, { status: 403 });
            }

            targetInstitute = membership.institute;
            membershipRole = membership.role;
        }

        if (!targetInstitute) {
            return NextResponse.json({ error: "Institute not found or inaccessible" }, { status: 404 });
        }

        // Return the clean institute object for the session update
        const activeInstitute = {
            id: targetInstitute._id.toString(),
            name: targetInstitute.name,
            code: targetInstitute.code,
            logo: targetInstitute.branding?.logo || null
        };

        const activeRole = session.user.role === 'super_admin' ? 'super_admin' : (membershipRole || session.user.role);
        return NextResponse.json({ activeInstitute, activeRole });

    } catch (error) {
        console.error("Switch Institute Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
