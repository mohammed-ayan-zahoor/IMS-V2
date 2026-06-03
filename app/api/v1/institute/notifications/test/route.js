import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { getInstituteScope } from '@/middleware/instituteScope';
import { NotificationService } from '@/services/notificationService.js';
import { createAuditLog } from '@/services/auditService';
import Institute from '@/models/Institute';

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);

        // Access protection: Only admin role or super_admin can configure/test credentials
        if (scope.user.role !== 'admin' && scope.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!scope.instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 404 });
        }

        const body = await req.json();
        const { to, message } = body;

        if (!to || !message) {
            return NextResponse.json({ error: "Recipient phone 'to' and 'message' are required." }, { status: 400 });
        }

        console.log(`[DIAGNOSTICS] Launching live message test to ${to} for Institute ${scope.instituteId}`);

        // Call the dynamic Multi-Tenant Notification Broker
        const testResult = await NotificationService.sendSMS(scope.instituteId, to, message);

        // Update lastTestedAt status in database
        await Institute.findByIdAndUpdate(scope.instituteId, {
            $set: { 'notifications.lastTestedAt': new Date() }
        });

        // Audit the action
        const actorId = session.user.id || 'unknown';
        await createAuditLog({
            actor: actorId,
            action: 'institute.notifications.test',
            resource: { type: 'Institute', id: scope.instituteId },
            institute: scope.instituteId,
            details: {
                recipient: to,
                provider: testResult.provider,
                success: true
            }
        });

        return NextResponse.json({
            success: true,
            message: `Test message successfully sent via provider: ${testResult.provider}!`,
            testResult
        });

    } catch (error) {
        console.error("POST /api/v1/institute/notifications/test error:", error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || "Failed to deliver test message." 
        }, { status: 500 });
    }
}
