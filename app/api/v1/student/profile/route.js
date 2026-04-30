import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { createAuditLog } from "@/services/auditService";

/**
 * @route   PATCH /api/v1/student/profile
 * @desc    Update student's bio and social links
 */
export async function PATCH(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { bio, socialLinks, phone } = body;

        await connectDB();

        // Update restricted to safe fields
        const updateData = {};
        if (bio !== undefined) updateData["profile.bio"] = bio;
        if (phone !== undefined) updateData["profile.phone"] = phone;
        if (socialLinks) {
            if (socialLinks.linkedin !== undefined) updateData["profile.socialLinks.linkedin"] = socialLinks.linkedin;
            if (socialLinks.github !== undefined) updateData["profile.socialLinks.github"] = socialLinks.github;
            if (socialLinks.portfolio !== undefined) updateData["profile.socialLinks.portfolio"] = socialLinks.portfolio;
        }

        const user = await User.findByIdAndUpdate(
            session.user.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Audit Log
        await createAuditLog({
            actor: session.user.id,
            action: 'student.profile_update',
            resource: { type: 'User', id: session.user.id },
            institute: user.institute,
            details: { updatedFields: Object.keys(updateData) }
        });

        return NextResponse.json({
            message: "Profile updated successfully",
            profile: user.profile
        });

    } catch (error) {
        console.error("Profile Update API Error:", error);
        return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
    }
}

/**
 * @route   POST /api/v1/student/profile/avatar
 * @desc    Update student's avatar URL (Cloudinary link)
 */
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { avatarUrl } = await req.json();

        if (!avatarUrl) {
            return NextResponse.json({ error: "Avatar URL is required" }, { status: 400 });
        }

        await connectDB();

        const user = await User.findByIdAndUpdate(
            session.user.id,
            { $set: { "profile.avatar": avatarUrl } },
            { new: true }
        );

        return NextResponse.json({
            message: "Avatar updated successfully",
            avatar: user.profile.avatar
        });

    } catch (error) {
        console.error("Avatar Update API Error:", error);
        return NextResponse.json({ error: "Failed to update avatar" }, { status: 500 });
    }
}
