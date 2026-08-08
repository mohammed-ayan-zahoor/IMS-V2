import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Coupon from '@/models/Coupon';
import { sendCouponEmail } from '@/lib/email';

export async function GET(req) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ coupons });
}

export async function POST(req) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();

    const required = ['discountedPricePerSeat', 'lockedToEmail', 'validUntil'];
    for (const f of required) {
        if (!body[f]) return NextResponse.json({ error: `Missing required field: ${f}` }, { status: 400 });
    }

    const lockedToEmail = body.lockedToEmail.toLowerCase().trim();

    // Auto-generate code if not provided
    const code = body.code
        ? body.code.toUpperCase().trim()
        : generateCouponCode(lockedToEmail);

    const existing = await Coupon.findOne({ code });
    if (existing) {
        return NextResponse.json({ error: 'Coupon code already exists. Choose a different code.' }, { status: 409 });
    }

    const coupon = await Coupon.create({
        code,
        discountedPricePerSeat: Number(body.discountedPricePerSeat),
        gstType: body.gstType || 'inclusive',
        lockedToEmail,
        maxUses: Number(body.maxUses) || 1,
        validUntil: new Date(body.validUntil),
        topUpsAtCouponPrice: body.topUpsAtCouponPrice !== false,
        mouSubmissionId: body.mouSubmissionId || null,
        notes: body.notes || '',
        isActive: true,
        createdBy: session.user.id
    });

    // Optionally email the coupon to the recipient
    if (body.sendEmail !== false) {
        await sendCouponEmail({
            to: lockedToEmail,
            schoolName: body.notes || lockedToEmail,
            couponCode: coupon.code,
            pricePerSeat: coupon.discountedPricePerSeat,
            validUntil: coupon.validUntil
        });
    }

    return NextResponse.json({ coupon }, { status: 201 });
}

function generateCouponCode(email) {
    const domain = email.split('@')[1]?.split('.')[0]?.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'MOU';
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${domain.substring(0, 6)}-${suffix}`;
}
