import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import rateLimit, { resetRateLimit, getRateLimitStatus } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        const role = session?.user?.role?.toLowerCase();

        if (!session?.user || role !== "student") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is currently blocked from previous failed attempts
        const rateLimitKey = `change-password:${session.user.id}`;
        const limitStatus = getRateLimitStatus(rateLimitKey);
        if (limitStatus && limitStatus.blockedUntil > Date.now()) {
            const waitMins = Math.max(1, Math.ceil((limitStatus.blockedUntil - Date.now()) / 60000));
            return NextResponse.json({
                error: `Too many failed password attempts. Account locked for ${waitMins} minute(s).`
            }, { status: 429 });
        }

        const body = await req.json().catch(() => ({}));
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (typeof newPassword !== 'string' || newPassword.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
        }

        if (currentPassword === newPassword) {
            return NextResponse.json({ error: "New password must be different from your current password" }, { status: 400 });
        }

        await connectDB();

        // Find user with passwordHash
        const user = await User.findById(session.user.id).select("+passwordHash");

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Guard: check if passwordHash exists
        if (!user.passwordHash) {
            return NextResponse.json({ error: "No password set for this account. Please contact school administration." }, { status: 400 });
        }

        // Verify current password (consistent with auth.js - untrimmed)
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);

        if (!isMatch) {
            // Count ONLY failed attempts towards rate limit
            try {
                await rateLimit(rateLimitKey, {
                    points: 1,
                    maxPoints: 5,      // 5 failed attempts allowed
                    duration: 900,     // 15-minute window
                    blockDuration: 900 // Lock for 15 minutes after 5 fails
                });
            } catch (limitErr) {
                const waitMins = Math.max(1, Math.ceil((limitErr.resetIn || 900) / 60));
                return NextResponse.json({
                    error: `Too many failed attempts. Account locked for ${waitMins} minute(s).`
                }, { status: 429 });
            }

            return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
        }

        // Success: Reset failure count immediately
        resetRateLimit(rateLimitKey);

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Safe DB update: avoids full-document re-validation while updating password & clearing reset tokens
        await User.findByIdAndUpdate(user._id, {
            $set: {
                passwordHash: hashedPassword,
                passwordChangeRequested: false,
                passwordResetToken: null,
                passwordResetExpires: null,
                passwordChangedAt: new Date()
            }
        });

        // Audit Log (safe async)
        const instId = session.user.instituteId || session.user.institute?.id || session.user.institute?._id || user.institute;
        AuditLog.create({
            action: "user.password_change",
            actor: user._id,
            resource: {
                type: "User",
                id: user._id
            },
            institute: instId || undefined,
            status: "success",
            details: {
                method: "mobile_or_web_student"
            }
        }).catch(err => console.warn("[AuditLog] Failed to record password change:", err.message));

        return NextResponse.json({ success: true, message: "Password updated successfully" });

    } catch (error) {
        console.error("Password Change Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
