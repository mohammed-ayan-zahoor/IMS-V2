import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import CourseBundle from '@/models/CourseBundle';
import Course from '@/models/Course';
import Institute from '@/models/Institute';
import mongoose from 'mongoose';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const instituteId = session.user.institute?.id || session.user.instituteId;
        if (!instituteId) {
            return NextResponse.json({ error: 'No institute associated with account' }, { status: 400 });
        }

        await connectDB();

        // Check if institute is VOCATIONAL (default to VOCATIONAL if type is unassigned)
        const inst = await Institute.findById(instituteId).select('type').lean();
        if (inst?.type && inst.type === 'SCHOOL') {
            return NextResponse.json({ error: 'Course Bundles are only available for Vocational Institutes' }, { status: 403 });
        }

        const bundles = await CourseBundle.find({
            institute: instituteId,
            deletedAt: null
        })
        .populate({
            path: 'courses',
            select: 'name code fees duration'
        })
        .sort({ createdAt: -1 })
        .lean();

        return NextResponse.json({ bundles });
    } catch (error) {
        console.error('Error fetching course bundles:', error);
        return NextResponse.json({ error: 'Failed to fetch course bundles' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const instituteId = session.user.institute?.id || session.user.instituteId;
        if (!instituteId) {
            return NextResponse.json({ error: 'No institute associated' }, { status: 400 });
        }

        await connectDB();

        const inst = await Institute.findById(instituteId).select('type').lean();
        if (inst?.type && inst.type === 'SCHOOL') {
            return NextResponse.json({ error: 'Course Bundles are only available for Vocational Institutes' }, { status: 403 });
        }

        const body = await req.json();
        const { title, code, description, courses, bundlePrice } = body;

        if (!title || !code || !Array.isArray(courses) || courses.length < 2 || bundlePrice === undefined) {
            return NextResponse.json({ error: 'Title, unique code, bundle price, and at least 2 courses are required' }, { status: 400 });
        }

        // Calculate original price from sum of course fees
        const courseDocs = await Course.find({
            _id: { $in: courses },
            institute: instituteId,
            deletedAt: null
        }).select('fees').lean();

        if (courseDocs.length !== courses.length) {
            return NextResponse.json({ error: 'One or more selected courses are invalid or deleted' }, { status: 400 });
        }

        const originalPrice = courseDocs.reduce((sum, c) => sum + (c.fees?.amount || 0), 0);

        // Check code uniqueness
        const existing = await CourseBundle.findOne({
            institute: instituteId,
            code: code.trim().toUpperCase(),
            deletedAt: null
        });

        if (existing) {
            return NextResponse.json({ error: 'A bundle with this code already exists' }, { status: 400 });
        }

        const newBundle = await CourseBundle.create({
            institute: instituteId,
            title: title.trim(),
            code: code.trim().toUpperCase(),
            description: description?.trim() || '',
            courses,
            bundlePrice: Number(bundlePrice),
            originalPrice,
            createdBy: session.user.id
        });

        const populated = await CourseBundle.findById(newBundle._id)
            .populate('courses', 'name code fees duration')
            .lean();

        return NextResponse.json({ bundle: populated }, { status: 201 });
    } catch (error) {
        console.error('Error creating course bundle:', error);
        if (error.code === 11000) {
            return NextResponse.json({ error: 'Bundle code must be unique per institute' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message || 'Failed to create course bundle' }, { status: 500 });
    }
}
