import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Coupon from '@/models/Coupon';
import OnboardingOrder from '@/models/OnboardingOrder';
import User from '@/models/User';

// ── Pricing constants ─────────────────────────────────────────────────────────
const PUBLIC_PRICE_PER_SEAT = 100;    // ₹100 base
const PUBLIC_GST_RATE = 0.18;         // 18%

export async function POST(req) {
    try {
        const body = await req.json();

        // ── Validate required fields ───────────────────────────────────────────
        const required = ['instituteName', 'city', 'contactName', 'email', 'phone', 'seats'];
        for (const field of required) {
            if (!body[field]) {
                return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
            }
        }

        const seats = parseInt(body.seats);
        if (isNaN(seats) || seats < 1) {
            return NextResponse.json({ error: 'seats must be a positive integer' }, { status: 400 });
        }

        const email = body.email.toLowerCase().trim();

        await connectDB();

        // ── Check if email already exists as a user ────────────────────────────
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ error: 'An account with this email already exists. Please contact support.' }, { status: 409 });
        }

        // ── Resolve pricing ────────────────────────────────────────────────────
        let pricePerSeat = PUBLIC_PRICE_PER_SEAT;
        let gstType = 'exclusive'; // public customers pay +18% GST
        let couponDoc = null;
        let couponId = null;

        if (body.couponCode) {
            couponDoc = await Coupon.findOne({
                code: body.couponCode.toUpperCase().trim(),
                isActive: true
            });

            // Re-validate coupon server-side (never trust client)
            const couponError = validateCoupon(couponDoc, email);
            if (couponError) {
                return NextResponse.json({ error: couponError }, { status: 400 });
            }

            pricePerSeat = couponDoc.discountedPricePerSeat;
            gstType = couponDoc.gstType;
            couponId = couponDoc._id;
        }

        // ── Calculate amount ───────────────────────────────────────────────────
        const baseAmount = seats * pricePerSeat; // in rupees
        let totalAmountRupees;
        if (gstType === 'exclusive') {
            totalAmountRupees = baseAmount + (baseAmount * PUBLIC_GST_RATE);
        } else {
            totalAmountRupees = baseAmount; // GST already inside
        }
        const totalAmountPaise = Math.round(totalAmountRupees * 100);

        // ── Create Razorpay order ──────────────────────────────────────────────
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return NextResponse.json({ error: 'Payment gateway not configured.' }, { status: 500 });
        }

        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const receipt = `onb_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${auth}`
            },
            body: JSON.stringify({
                amount: totalAmountPaise,
                currency: 'INR',
                receipt
            })
        });

        if (!rzpRes.ok) {
            const err = await rzpRes.json().catch(() => ({}));
            return NextResponse.json({ error: err.error?.description || 'Failed to create payment order.' }, { status: 400 });
        }

        const rzpOrder = await rzpRes.json();

        // ── Store OnboardingOrder ──────────────────────────────────────────────
        await OnboardingOrder.create({
            razorpayOrderId: rzpOrder.id,
            instituteName: body.instituteName.trim(),
            city: body.city.trim(),
            state: body.state?.trim() || '',
            contactName: body.contactName.trim(),
            designation: body.designation?.trim() || 'Principal',
            email,
            phone: body.phone?.trim() || '',
            seats,
            udiseCode: body.udiseCode?.trim() || '',
            instituteType: body.instituteType || 'VOCATIONAL',
            pricePerSeat,
            gstType,
            totalAmountPaise,
            couponCode: couponDoc ? couponDoc.code : null,
            couponId,
            status: 'pending'
        });

        return NextResponse.json({
            orderId: rzpOrder.id,
            amount: totalAmountPaise,
            keyId,
            currency: 'INR'
        });

    } catch (err) {
        console.error('onboarding/create-order error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// ── Coupon validation (pure function, reusable) ───────────────────────────────
function validateCoupon(coupon, email) {
    if (!coupon) return 'Invalid coupon code.';
    if (!coupon.isActive) return 'This coupon is no longer active.';
    if (coupon.validUntil < new Date()) return 'This coupon has expired.';
    if (coupon.usedCount >= coupon.maxUses) return 'This coupon has already been used.';
    if (coupon.lockedToEmail && coupon.lockedToEmail !== email.toLowerCase().trim()) {
        return 'This coupon is not valid for your email address.';
    }
    return null; // null = valid
}
