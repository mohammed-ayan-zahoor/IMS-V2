import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import CourseBundle from '@/models/CourseBundle';
import Course from '@/models/Course';

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        await connectDB();

        const bundle = await CourseBundle.findOne({
            _id: id,
            deletedAt: null
        }).populate('courses', 'name code fees duration').lean();

        if (!bundle) {
            return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
        }

        return NextResponse.json({ bundle });
    } catch (error) {
        console.error('Error fetching bundle:', error);
        return NextResponse.json({ error: 'Failed to fetch bundle' }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        await connectDB();

        const bundle = await CourseBundle.findOne({
            _id: id,
            deletedAt: null
        });

        if (!bundle) {
            return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
        }

        const updates = {};
        if (body.title !== undefined) updates.title = body.title.trim();
        if (body.code !== undefined) updates.code = body.code.trim().toUpperCase();
        if (body.description !== undefined) updates.description = body.description.trim();
        if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);
        if (body.bundlePrice !== undefined) updates.bundlePrice = Number(body.bundlePrice);

        if (body.courses !== undefined) {
            if (!Array.isArray(body.courses) || body.courses.length < 2) {
                return NextResponse.json({ error: 'A bundle must contain at least 2 courses' }, { status: 400 });
            }
            updates.courses = body.courses;

            // Recalculate original price
            const courseDocs = await Course.find({
                _id: { $in: body.courses },
                institute: bundle.institute,
                deletedAt: null
            }).select('fees').lean();

            updates.originalPrice = courseDocs.reduce((sum, c) => sum + (c.fees?.amount || 0), 0);
        }

        const updated = await CourseBundle.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true }
        ).populate('courses', 'name code fees duration').lean();

        return NextResponse.json({ bundle: updated });
    } catch (error) {
        console.error('Error updating bundle:', error);
        return NextResponse.json({ error: 'Failed to update bundle' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        await connectDB();

        const bundle = await CourseBundle.findOneAndUpdate(
            { _id: id, deletedAt: null },
            { $set: { deletedAt: new Date(), isActive: false } },
            { new: true }
        );

        if (!bundle) {
            return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Bundle deleted successfully' });
    } catch (error) {
        console.error('Error deleting bundle:', error);
        return NextResponse.json({ error: 'Failed to delete bundle' }, { status: 500 });
    }
}
