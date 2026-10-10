import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Institute from "@/models/Institute";
import User from "@/models/User";
import Session from "@/models/Session";
import StudentAccessTransaction from "@/models/StudentAccessTransaction";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized: Please log in" }, { status: 401 });
        }

        if (session.user.role !== "student") {
            return NextResponse.json({ error: "Forbidden: Student access only" }, { status: 403 });
        }

        const studentId = session.user.id;
        const instituteId = session.user.institute?.id;

        if (!instituteId) {
            return NextResponse.json({ error: "Institute context missing" }, { status: 400 });
        }

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return NextResponse.json({ error: "Payment gateway credentials are not configured on the server" }, { status: 500 });
        }

        await connectDB();

        const [student, institute] = await Promise.all([
            User.findById(studentId),
            Institute.findById(instituteId)
        ]);

        if (!student || !institute) {
            return NextResponse.json({ error: "Student or Institute not found" }, { status: 404 });
        }

        const paywallConfig = institute.settings?.studentPaywall;
        if (!paywallConfig?.enabled) {
            return NextResponse.json({ error: "Digital student paywall is not enabled for your institute" }, { status: 400 });
        }

        // Check if student is explicitly exempted by school
        if (student.accessSubscription?.status === "EXEMPTED") {
            return NextResponse.json({
                error: "Your account is exempted from paywall by school administration",
                isExempted: true
            }, { status: 400 });
        }

        // 1. Determine target expiry date: Aligned to Institute's official cycle end date
        let targetExpiryDate = institute.subscription?.endDate;

        // Fallback: If institute.subscription.endDate is missing, check active academic session
        if (!targetExpiryDate) {
            const activeSession = await Session.findOne({ instituteId, isActive: true });
            targetExpiryDate = activeSession?.endDate;
        }

        if (!targetExpiryDate) {
            return NextResponse.json({
                error: "Institute academic cycle expiry date is not configured. Please contact the school administrator."
            }, { status: 400 });
        }

        // 2. Check if student already has active subscription that expires in the future
        if (student.accessSubscription?.status === "ACTIVE" && student.accessSubscription?.expiresAt) {
            const expiresAt = new Date(student.accessSubscription.expiresAt);
            const now = new Date();
            if (expiresAt > now) {
                const diffDays = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
                if (diffDays > 15) {
                    return NextResponse.json({
                        error: `Your subscription is already active until ${expiresAt.toLocaleDateString('en-IN')}`,
                        isActive: true,
                        expiresAt: expiresAt.toISOString()
                    }, { status: 400 });
                }
            }
        }

        // 3. Pricing breakdown: ₹25 + 18% GST (₹4.50) + 2% PG fee (₹0.50) = ₹30.00
        const basePrice = paywallConfig.basePrice || 25;
        const gstPercent = paywallConfig.gstPercent || 18;
        const gatewayFeePercent = paywallConfig.gatewayFeePercent || 2;

        const gstAmount = Math.round((basePrice * (gstPercent / 100)) * 100) / 100;
        const gatewayFee = Math.round((basePrice * (gatewayFeePercent / 100)) * 100) / 100;
        const totalAmount = paywallConfig.totalAmount || Math.round((basePrice + gstAmount + gatewayFee));

        const amountInPaise = Math.round(totalAmount * 100);

        // 4. Create Razorpay Order
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const receiptId = `sub_${studentId.toString().slice(-6)}_${Date.now().toString().slice(-6)}`;

        const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${auth}`
            },
            body: JSON.stringify({
                amount: amountInPaise,
                currency: "INR",
                receipt: receiptId,
                notes: {
                    studentId: studentId.toString(),
                    instituteId: instituteId.toString(),
                    enrollmentNumber: student.enrollmentNumber || "",
                    studentName: `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim(),
                    type: "STUDENT_DIRECT_PAYWALL",
                    validUntil: targetExpiryDate.toISOString()
                }
            })
        });

        if (!rzpResponse.ok) {
            const errBody = await rzpResponse.json().catch(() => ({}));
            console.error("Razorpay order creation failed:", errBody);
            return NextResponse.json({ error: errBody.error?.description || "Failed to initiate payment gateway" }, { status: 400 });
        }

        const rzpOrder = await rzpResponse.json();

        // 5. Create pending StudentAccessTransaction record
        await StudentAccessTransaction.create({
            student: student._id,
            institute: institute._id,
            academicSession: student.activeSession,
            razorpayOrderId: rzpOrder.id,
            status: "created",
            baseAmount: basePrice,
            gstAmount: gstAmount,
            gatewayFee: gatewayFee,
            totalAmount: totalAmount,
            currency: "INR",
            validFrom: new Date(),
            validUntil: targetExpiryDate,
            metadata: {
                studentName: `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim(),
                enrollmentNumber: student.enrollmentNumber || "",
                instituteName: institute.name
            }
        });

        return NextResponse.json({
            success: true,
            orderId: rzpOrder.id,
            amount: amountInPaise,
            amountRupees: totalAmount,
            currency: "INR",
            keyId: keyId,
            instituteName: institute.name,
            title: paywallConfig.title || "ERP Portal & Smart ID Card Access",
            validUntil: targetExpiryDate.toISOString(),
            breakdown: {
                basePrice: basePrice,
                gstAmount: gstAmount,
                gatewayFee: gatewayFee,
                totalAmount: totalAmount
            },
            prefill: {
                name: `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim(),
                email: student.email,
                contact: student.profile?.phone || student.fatherPhone || ""
            }
        });

    } catch (error) {
        console.error("POST /api/v1/student/subscription/create-order error:", error);
        return NextResponse.json({ error: "Internal server error occurred" }, { status: 500 });
    }
}
