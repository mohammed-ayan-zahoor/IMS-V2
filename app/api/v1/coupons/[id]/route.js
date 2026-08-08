import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Coupon from '@/models/Coupon';

export async function PATCH(req, { params }) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();
    const body = await req.json();

    const allowedFields = ['isActive', 'validUntil', 'notes', 'discountedPricePerSeat', 'gstType', 'maxUses', 'topUpsAtCouponPrice'];
    const update = {};
    allowedFields.forEach(f => { if (body[f] !== undefined) update[f] = body[f]; });

    const coupon = await Coupon.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!coupon) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ coupon });
}

export async function DELETE(req, { params }) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();
    const coupon = await Coupon.findById(id);
    if (!coupon) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (coupon.usedCount > 0) {
        return NextResponse.json({ error: 'Cannot delete a coupon that has been used. Deactivate it instead.' }, { status: 400 });
    }

    await coupon.deleteOne();
    return NextResponse.json({ success: true });
}
