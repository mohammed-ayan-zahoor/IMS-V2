import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import OnboardingOrder from '@/models/OnboardingOrder';
import Institute from '@/models/Institute';
import User from '@/models/User';
import Membership from '@/models/Membership';
import Coupon from '@/models/Coupon';
import AuditLog from '@/models/AuditLog';
import { sendWelcomeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    try {
        // ── 1. Read RAW body for HMAC verification ─────────────────────────────
        const rawBody = await req.text();
        const signature = req.headers.get('x-razorpay-signature');
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error('[Webhook] RAZORPAY_WEBHOOK_SECRET not set in environment');
            return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
        }

        // ── 2. Verify HMAC signature ───────────────────────────────────────────
        const expectedSig = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('hex');

        if (expectedSig !== signature) {
            console.warn('[Webhook] Signature mismatch — possible forged request');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        const event = JSON.parse(rawBody);

        // ── 3. Only handle payment.captured ───────────────────────────────────
        if (event.event !== 'payment.captured') {
            return NextResponse.json({ received: true });
        }

        const payment = event.payload?.payment?.entity;
        const orderId = payment?.order_id;
        const paymentId = payment?.id;

        if (!orderId || !paymentId) {
            return NextResponse.json({ error: 'Missing order or payment ID' }, { status: 400 });
        }

        await connectDB();

        // ── 4. Find the OnboardingOrder ────────────────────────────────────────
        const order = await OnboardingOrder.findOne({ razorpayOrderId: orderId });

        if (!order) {
            console.error('[Webhook] OnboardingOrder not found for orderId:', orderId);
            return NextResponse.json({ received: true, note: 'Order not found' });
        }

        // ── 5. Idempotency check — do not provision twice ──────────────────────
        if (order.status === 'provisioned') {
            console.log('[Webhook] Already provisioned for orderId:', orderId);
            return NextResponse.json({ received: true, note: 'Already provisioned' });
        }

        // Mark as paid immediately
        order.status = 'paid';
        order.razorpayPaymentId = paymentId;
        order.webhookPayload = event;
        await order.save();

        // ── 6. Generate unique institute code ──────────────────────────────────
        let code = generateInstituteCode(order.instituteName);
        let attempt = 0;
        while (await Institute.exists({ code })) {
            attempt++;
            code = generateInstituteCode(order.instituteName) + attempt;
        }

        // ── 7. Provision Institute ─────────────────────────────────────────────
        const institute = await Institute.create({
            name: order.instituteName,
            code,
            type: order.instituteType || 'VOCATIONAL',
            contactEmail: order.email,
            contactPhone: order.phone,
            address: {
                city: order.city,
                state: order.state
            },
            status: 'active',
            subscription: {
                plan: 'basic',
                startDate: new Date(),
                isActive: true
            },
            limits: {
                maxStudents: order.seats
            },
            onboardingMeta: {
                pricePerSeat: order.pricePerSeat,
                gstType: order.gstType,
                couponCode: order.couponCode,
                topUpsAtCouponPrice: order.couponCode ? true : false,
                paidAt: new Date(),
                razorpayOrderId: orderId,
                razorpayPaymentId: paymentId
            }
        });

        // ── 8. Generate temporary password ─────────────────────────────────────
        const tempPassword = generateTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 12);

        // ── 9. Create Admin User ───────────────────────────────────────────────
        const adminUser = await User.create({
            email: order.email,
            passwordHash,
            role: 'admin',
            profile: {
                firstName: order.contactName.split(' ')[0] || order.contactName,
                lastName: order.contactName.split(' ').slice(1).join(' ') || '',
                phone: order.phone
            },
            institute: institute._id,
            isActive: true
        });

        // ── 10. Create Membership ──────────────────────────────────────────────
        await Membership.create({
            user: adminUser._id,
            institute: institute._id,
            role: 'admin',
            isActive: true
        });

        // ── 11. Mark coupon as used (atomic increment) ─────────────────────────
        if (order.couponId) {
            await Coupon.findByIdAndUpdate(order.couponId, { $inc: { usedCount: 1 } });
        }

        // ── 12. Audit log ──────────────────────────────────────────────────────
        await AuditLog.create({
            actor: adminUser._id,
            action: 'institute.self_onboard',
            resource: { type: 'Institute', id: institute._id },
            institute: institute._id,
            details: {
                razorpayOrderId: orderId,
                razorpayPaymentId: paymentId,
                seats: order.seats,
                couponCode: order.couponCode || null
            }
        });

        // ── 13. Update OnboardingOrder as fully provisioned ────────────────────
        order.status = 'provisioned';
        order.instituteId = institute._id;
        await order.save();

        // ── 14. Send welcome email ─────────────────────────────────────────────
        const loginUrl = `${process.env.NEXTAUTH_URL || 'https://imsportal.3ftech.in'}/login`;
        await sendWelcomeEmail({
            to: order.email,
            contactName: order.contactName,
            instituteName: order.instituteName,
            instituteCode: code,
            loginUrl,
            tempPassword
        });

        console.log('[Webhook] Provisioned institute:', code, '| temp password:', tempPassword, '| email:', order.email);

        return NextResponse.json({ received: true, provisioned: true });

    } catch (err) {
        console.error('[Webhook] CRITICAL ERROR:', err);
        return NextResponse.json({ received: true, error: 'Provisioning error — logged for review' });
    }
}

function generateInstituteCode(name) {
    const words = name.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/);
    let code = words.map(w => w.charAt(0)).join('').substring(0, 6);
    if (code.length < 3) code = name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
    return code + '-' + Math.floor(100 + Math.random() * 900);
}

function generateTempPassword() {
    const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefghjkmnpqrstwxyz23456789!@#';
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
