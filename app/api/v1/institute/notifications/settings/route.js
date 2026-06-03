import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Institute from '@/models/Institute';
import { getInstituteScope } from '@/middleware/instituteScope';
import { encryptSecret } from '@/lib/crypto.js';
import { createAuditLog } from '@/services/auditService';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope.instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 404 });
        }

        const institute = await Institute.findById(scope.instituteId).select('notifications');
        if (!institute) {
            return NextResponse.json({ error: "Institute not found" }, { status: 404 });
        }

        // Deep copy the notifications sub-document to mask the actual secrets before returning to UI
        const notifications = institute.notifications ? institute.notifications.toObject() : {
            smsProvider: 'mock',
            whatsappProvider: 'mock'
        };

        // Apply strict mask placeholders
        if (notifications.msg91AuthKey) {
            notifications.msg91AuthKey = 'msg91_••••••••••••';
        }
        if (notifications.twilioToken) {
            notifications.twilioToken = 'twilio_••••••••••••';
        }
        if (notifications.twilioSid) {
            notifications.twilioSid = 'sid_••••••••••••';
        }
        if (notifications.metaAccessToken) {
            notifications.metaAccessToken = 'meta_••••••••••••';
        }

        return NextResponse.json({ success: true, notifications });
    } catch (error) {
        console.error("GET /api/v1/institute/notifications/settings error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);

        // Access protection: Only admin role or super_admin can configure credentials
        if (scope.user.role !== 'admin' && scope.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!scope.instituteId) {
            return NextResponse.json({ error: "No institute context found" }, { status: 404 });
        }

        const body = await req.json();
        const institute = await Institute.findById(scope.instituteId);
        if (!institute) {
            return NextResponse.json({ error: "Institute not found" }, { status: 404 });
        }

        // Initialize empty notifications object if it doesn't exist
        if (!institute.notifications) {
            institute.notifications = {
                smsProvider: 'mock',
                whatsappProvider: 'mock'
            };
        }

        // 1. Dynamic SMS Provider update
        if (body.smsProvider) {
            institute.notifications.smsProvider = body.smsProvider;
        }

        // 2. Msg91 Secret Key Handling
        if (body.msg91AuthKey && body.msg91AuthKey !== 'msg91_••••••••••••') {
            institute.notifications.msg91AuthKey = encryptSecret(body.msg91AuthKey.trim());
        }
        if (body.msg91SenderId !== undefined) {
            institute.notifications.msg91SenderId = body.msg91SenderId.trim();
        }
        if (body.msg91TemplateId !== undefined) {
            institute.notifications.msg91TemplateId = body.msg91TemplateId.trim();
        }

        // 3. Twilio Secret Key Handling
        if (body.twilioSid && body.twilioSid !== 'sid_••••••••••••') {
            institute.notifications.twilioSid = encryptSecret(body.twilioSid.trim());
        }
        if (body.twilioToken && body.twilioToken !== 'twilio_••••••••••••') {
            institute.notifications.twilioToken = encryptSecret(body.twilioToken.trim());
        }
        if (body.twilioNumber !== undefined) {
            institute.notifications.twilioNumber = body.twilioNumber.trim();
        }

        // 4. WhatsApp Provider & Meta WhatsApp Handling
        if (body.whatsappProvider) {
            institute.notifications.whatsappProvider = body.whatsappProvider;
        }
        if (body.metaPhoneNumberId !== undefined) {
            institute.notifications.metaPhoneNumberId = body.metaPhoneNumberId.trim();
        }
        if (body.metaAccessToken && body.metaAccessToken !== 'meta_••••••••••••') {
            institute.notifications.metaAccessToken = encryptSecret(body.metaAccessToken.trim());
        }

        // Set timestamps
        institute.notifications.configuredAt = new Date();

        await institute.save();

        // Safe logging of setting updates without log exposures
        const actorId = session.user.id || 'unknown';
        await createAuditLog({
            actor: actorId,
            action: 'institute.notifications.update',
            resource: { type: 'Institute', id: scope.instituteId },
            institute: scope.instituteId,
            details: {
                smsProvider: body.smsProvider || institute.notifications.smsProvider,
                whatsappProvider: body.whatsappProvider || institute.notifications.whatsappProvider,
                updatedFields: Object.keys(body).filter(k => k !== 'msg91AuthKey' && k !== 'twilioToken' && k !== 'metaAccessToken')
            }
        });

        return NextResponse.json({
            success: true,
            message: "Notification configurations successfully saved and encrypted."
        });

    } catch (error) {
        console.error("POST /api/v1/institute/notifications/settings error:", error);
        return NextResponse.json({ error: "Failed to save configurations." }, { status: 500 });
    }
}
