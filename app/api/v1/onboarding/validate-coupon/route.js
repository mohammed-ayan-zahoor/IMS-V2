import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Coupon from '@/models/Coupon';

export async function POST(req) {
    try {
        const body = await req.json();
        const { code, email } = body;

        if (!code || !email) {
            return NextResponse.json({ valid: false, error: 'Code and email are required.' }, { status: 400 });
        }

        await connectDB();

        const coupon = await Coupon.findOne({
            code: code.toUpperCase().trim(),
            isActive: true
        });

        if (!coupon) {
            return NextResponse.json({ valid: false, error: 'Invalid coupon code.' });
        }

        if (coupon.validUntil < new Date()) {
            return NextResponse.json({ valid: false, error: 'This coupon has expired.' });
        }

        if (coupon.usedCount >= coupon.maxUses) {
            return NextResponse.json({ valid: false, error: 'This coupon has already been used.' });
        }

        if (coupon.lockedToEmail && coupon.lockedToEmail !== email.toLowerCase().trim()) {
            return NextResponse.json({ valid: false, error: 'This coupon is not valid for your email address.' });
        }

        // Return pricing info (do NOT return the coupon _id or internal fields)
        return NextResponse.json({
            valid: true,
            discountedPricePerSeat: coupon.discountedPricePerSeat,
            gstType: coupon.gstType,
            topUpsAtCouponPrice: coupon.topUpsAtCouponPrice
        });

    } catch (err) {
        console.error('validate-coupon error:', err);
        return NextResponse.json({ valid: false, error: 'Server error. Please try again.' }, { status: 500 });
    }
}
