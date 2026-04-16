import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import bcrypt from "bcryptjs";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== "student") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
        }

        await connectDB();

        // Find user and include passwordHash
        const user = await User.findById(session.user.id).select("+passwordHash");

        if (!user) {
            console.error("Change Password: User not found", session.user.id);
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Verify current password
        const trimmedPassword = currentPassword.trim();
        const isMatch = await bcrypt.compare(trimmedPassword, user.passwordHash);
        
        if (process.env.NODE_ENV === 'development') {
            console.log("Change Password Debug Deep:", {
                userId: session.user.id,
                email: user.email,
                role: user.role,
                inputLen: trimmedPassword?.length,
                hashPrefix: user.passwordHash?.substring(0, 10),
                hashSuffix: user.passwordHash?.substring(user.passwordHash.length - 10),
                isMatch
            });
        }

        if (!isMatch) {
            return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        user.passwordHash = hashedPassword;
        await user.save();

        // Audit Log
        await AuditLog.create({
            action: "user.password_change",
            actor: user._id,
            resource: {
                type: "User",
                id: user._id
            },
            institute: session.user.institute?.id,
            status: "success",
            details: {
                method: "settings_panel"
            }
        });

        return NextResponse.json({ success: true, message: "Password updated successfully" });

    } catch (error) {
        console.error("Password Change Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
