import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        const { id: studentId } = await params;
        const body = await req.json().catch(() => ({}));
        const { exempt = true, reason = "School Sponsored / RTE Admission" } = body;

        await connectDB();

        const student = await User.findById(studentId);
        if (!student || student.role !== "student") {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        // Verify institute scope and platform exemption policy
        if (session.user.role !== "super_admin") {
            const adminInstId = session.user.institute?.id;
            if (student.institute?.toString() !== adminInstId?.toString()) {
                return NextResponse.json({ error: "Unauthorized for this institute" }, { status: 403 });
            }

            if (exempt) {
                const Institute = (await import("@/models/Institute")).default;
                const inst = await Institute.findById(student.institute).select('settings.studentPaywall');
                if (inst?.settings?.studentPaywall?.allowExemptions === false) {
                    return NextResponse.json({ error: "Exemptions are disabled by platform policy for this organization" }, { status: 403 });
                }
            }
        }

        if (exempt) {
            student.accessSubscription = {
                ...(student.accessSubscription || {}),
                status: "EXEMPTED",
                exemptionReason: reason,
                exemptedBy: session.user.id,
                paidAt: new Date()
            };
        } else {
            student.accessSubscription = {
                ...(student.accessSubscription || {}),
                status: "UNPAID",
                exemptionReason: null,
                exemptedBy: null
            };
        }

        await student.save();

        return NextResponse.json({
            success: true,
            message: exempt ? "Student exempted from paywall successfully" : "Exemption removed",
            accessSubscription: student.accessSubscription
        });

    } catch (error) {
        console.error("POST exempt-subscription error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
