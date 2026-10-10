import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Institute from "@/models/Institute";
import Session from "@/models/Session";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "student") {
            return NextResponse.json({ error: "Student access only" }, { status: 403 });
        }

        const studentId = session.user.id;
        const instituteId = session.user.institute?.id;

        if (!instituteId) {
            return NextResponse.json({ error: "Institute context missing" }, { status: 400 });
        }

        await connectDB();

        const [student, institute] = await Promise.all([
            User.findById(studentId).select('accessSubscription enrollmentNumber profile activeSession'),
            Institute.findById(instituteId).select('name subscription settings')
        ]);

        if (!student || !institute) {
            return NextResponse.json({ error: "Student or Institute not found" }, { status: 404 });
        }

        const paywallConfig = institute.settings?.studentPaywall;
        const isPaywallEnabled = paywallConfig?.enabled ?? false;

        // Resolve institute cycle end date
        let instituteCycleEnd = institute.subscription?.endDate;
        if (!instituteCycleEnd) {
            const activeSession = await Session.findOne({ instituteId, isActive: true });
            instituteCycleEnd = activeSession?.endDate;
        }

        const sub = student.accessSubscription;
        const isExempted = sub?.status === "EXEMPTED";
        const hasActiveDate = sub?.expiresAt && new Date(sub.expiresAt) > new Date();
        const isActive = isExempted || (sub?.status === "ACTIVE" && hasActiveDate);

        // A student needs payment ONLY if paywall is enabled, they are not exempted, and subscription is not active
        const needsPayment = isPaywallEnabled && !isActive;

        let daysRemaining = 0;
        if (sub?.expiresAt) {
            daysRemaining = Math.max(0, Math.ceil((new Date(sub.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)));
        }

        const basePrice = paywallConfig?.basePrice || 25;
        const gstPercent = paywallConfig?.gstPercent || 18;
        const gatewayFeePercent = paywallConfig?.gatewayFeePercent || 2;
        const gstAmount = Math.round((basePrice * (gstPercent / 100)) * 100) / 100;
        const gatewayFee = Math.round((basePrice * (gatewayFeePercent / 100)) * 100) / 100;
        const totalAmount = paywallConfig?.totalAmount || Math.round(basePrice + gstAmount + gatewayFee);

        return NextResponse.json({
            success: true,
            isPaywallEnabled,
            needsPayment,
            subscriptionStatus: isExempted ? "EXEMPTED" : (isActive ? "ACTIVE" : (sub?.expiresAt ? "EXPIRED" : "UNPAID")),
            expiresAt: sub?.expiresAt ? sub.expiresAt.toISOString() : null,
            instituteCycleEnd: instituteCycleEnd ? instituteCycleEnd.toISOString() : null,
            daysRemaining,
            isExempted,
            pricing: {
                basePrice,
                gstPercent,
                gstAmount,
                gatewayFeePercent,
                gatewayFee,
                totalAmount,
                totalAmountPaise: totalAmount * 100,
                currency: "INR"
            },
            title: paywallConfig?.title || "ERP Portal & Smart ID Card Annual Access",
            description: paywallConfig?.description || "Digital access to student portal, notices, attendance, and exam results."
        });

    } catch (error) {
        console.error("GET /api/v1/student/subscription/status error:", error);
        return NextResponse.json({ error: "Failed to retrieve subscription status" }, { status: 500 });
    }
}
