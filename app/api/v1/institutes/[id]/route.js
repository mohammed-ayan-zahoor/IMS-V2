import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Institute from "@/models/Institute";
import AuditLog from "@/models/AuditLog";
import mongoose from "mongoose";
// Helper to check Super Admin access
async function checkAccess() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "super_admin") {
        return { authorized: false };
    }
    return { authorized: true, session };
}

export async function GET(req, { params }) {
    try {
        const { authorized } = await checkAccess();
        if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        await connectDB();

        const institute = await Institute.findById(id);
        if (!institute) {
            return NextResponse.json({ error: "Institute not found" }, { status: 404 });
        }

        return NextResponse.json({ institute });
    } catch (error) {
        console.error("Get Institute Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const { authorized, session } = await checkAccess();
        if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const body = await req.json();
        await connectDB();

        // Allowed updates via this route: status, settings, etc.
        // For now, primarily used for Suspend/Activate
        const updateData = {};
        if (body.name) updateData.name = body.name;
        if (body.contactPhone) updateData.contactPhone = body.contactPhone;
        if (body.addressStr) updateData.addressStr = body.addressStr;

        if (body.plan !== undefined) {
            if (['free', 'basic', 'professional', 'enterprise', 'student_paywall'].includes(body.plan)) {
                updateData['subscription.plan'] = body.plan;
            }
        }
        if (body.endDate !== undefined) {
            updateData['subscription.endDate'] = body.endDate ? new Date(body.endDate) : null;
        }

        if (body.maxStudents !== undefined) {
            const User = mongoose.models.User || (await import("@/models/User")).default;
            const currentStudentCount = await User.countDocuments({ institute: id, role: 'student', deletedAt: null });
            const newLimit = Number(body.maxStudents);
            if (newLimit < currentStudentCount) {
                return NextResponse.json({ 
                    error: `Cannot set student limit to ${newLimit}. This organization already has ${currentStudentCount} active students.` 
                }, { status: 400 });
            }
            updateData['limits.maxStudents'] = newLimit;
        }

        // Support for Voice Reminders & Quota settings management
        if (body.voiceCallsQuota !== undefined) {
            updateData['usage.voiceCallsQuota'] = Number(body.voiceCallsQuota);
        }
        if (body.voiceCallsSent !== undefined) {
            updateData['usage.voiceCallsSent'] = Number(body.voiceCallsSent);
        }
        if (body.overdueVoiceReminderEnabled !== undefined) {
            updateData['notifications.overdueVoiceReminderEnabled'] = Boolean(body.overdueVoiceReminderEnabled);
        }
        if (body.dedicatedCallerId !== undefined) {
            updateData['notifications.dedicatedCallerId'] = body.dedicatedCallerId;
        }
        if (body.voiceCallProvider !== undefined) {
            if (['mock', 'exotel', 'twilio'].includes(body.voiceCallProvider)) {
                updateData['notifications.voiceCallProvider'] = body.voiceCallProvider;
            }
        }

        if (body.structure !== undefined) {
            if (['CLASS_BASED', 'SEMESTER_BASED'].includes(body.structure)) {
                updateData['settings.structure'] = body.structure;
            }
        }

        // ponytail: configurable student paywall fee settings update
        if (body.billingModel !== undefined || body.studentBasePrice !== undefined) {
            if (body.billingModel !== undefined) {
                updateData['settings.studentPaywall.enabled'] = body.billingModel === 'STUDENT_DIRECT_PAY';
            }
            if (body.studentBasePrice !== undefined) {
                const basePrice = Number(body.studentBasePrice) || 25;
                const gstAmount = Math.round((basePrice * 0.18) * 100) / 100;
                const gatewayFee = Math.round((basePrice * 0.02) * 100) / 100;
                const totalAmount = Number(body.studentTotalAmount) || Math.round((basePrice + gstAmount + gatewayFee) * 100) / 100;

                updateData['settings.studentPaywall.basePrice'] = basePrice;
                updateData['settings.studentPaywall.gstPercent'] = 18;
                updateData['settings.studentPaywall.gatewayFeePercent'] = 2;
                updateData['settings.studentPaywall.totalAmount'] = totalAmount;
            }
        }

        if (body.status) {
            if (['active', 'suspended', 'inactive'].includes(body.status)) {
                updateData.status = body.status;
                if (body.status === 'suspended' || body.status === 'inactive') {
                    updateData.isActive = false;
                } else if (body.status === 'active') {
                    updateData.isActive = true;
                }
            }
        }

        const institute = await Institute.findByIdAndUpdate(id, updateData, { new: true });

        if (!institute) {
            return NextResponse.json({ error: "Institute not found" }, { status: 404 });
        }

        // Clear dashboard cache for this institute
        try {
            const { clearDashboardCache } = await import("@/lib/dashboardCache");
            clearDashboardCache(id);
        } catch (e) {
            console.error("Failed to clear dashboard cache:", e);
        }

        // Audit Log
        await AuditLog.create({
            actor: session.user.id,
            action: 'institute.update',
            resource: { type: 'Institute', id: institute._id },
            institute: institute._id,
            details: {
                update: updateData,
                reason: body.reason || "Admin Action"
            }
        });

        return NextResponse.json({ success: true, institute });
    } catch (error) {
        console.error("Update Institute Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { authorized, session } = await checkAccess();
        if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        await connectDB();

        // Soft Delete
        const institute = await Institute.findByIdAndUpdate(id, {
            deletedAt: new Date(),
            isActive: false,
            status: 'inactive'
        }, { new: true });

        if (!institute) {
            return NextResponse.json({ error: "Institute not found" }, { status: 404 });
        }

        // Cascade Soft Delete Users
        const User = mongoose.model('User');
        await User.updateMany(
            { institute: institute._id, deletedAt: null },
            {
                deletedAt: new Date(),
                deletedBy: session.user.id,
                isActive: false
            }
        );

        // Audit Log
        await AuditLog.create({
            actor: session.user.id,
            action: 'institute.delete', // Make sure this is in enum (we added it!)
            resource: { type: 'Institute', id: institute._id },
            institute: institute._id,
            details: {
                type: 'soft-delete'
            }
        });

        return NextResponse.json({ success: true, message: "Institute deleted successfully" });
    } catch (error) {
        console.error("Delete Institute Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
