import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { markStudentCompleted } from '@/services/completionService';
// POST /api/v1/students/[id]/mark-complete
export async function POST(req, { params }) {
    try {
        await connectDB();
        //  Auth check
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }
        const user = session.user;
        //  Role check
        if (!['admin', 'instructor'].includes(user.role)) {
            return NextResponse.json(
                { success: false, message: 'Forbidden: insufficient permissions' },
                { status: 403 }
            );
        }
        const studentId = params.id;
        //  Get student to validate
        const student = await User.findById(studentId);
        if (!student) {
            return NextResponse.json(
                { success: false, message: 'Student not found' },
                { status: 404 }
            );
        }
        //  Institution check (verify field name matches your model)
        if (String(student.institute) !== String(user.institute)) {
            return NextResponse.json(
                { success: false, message: 'Forbidden: different institution' },
                { status: 403 }
            );
        }
        //  Status check
        if (student.status && student.status !== 'ACTIVE') {
            return NextResponse.json(
                { 
                    success: false, 
                    message: `Cannot mark complete: student status is ${student.status}` 
                },
                { status: 400 }
            );
        }
        //  Request body validation
        const body = await req.json();
        const { reason } = body;
        // Validate reason if provided
        if (reason) {
            if (typeof reason !== 'string') {
                return NextResponse.json(
                    { success: false, message: 'Reason must be a string' },
                    { status: 422 }
                );
            }
            if (reason.trim().length > 500) {
                return NextResponse.json(
                    { success: false, message: 'Reason cannot exceed 500 characters' },
                    { status: 422 }
                );
            }
        }
        //  Call service
        const result = await markStudentCompleted(studentId, user.id, reason, req);
        
        if (!result.success) {
            return NextResponse.json(result, { status: result.code || 400 });
        }

        return NextResponse.json(
            {
                success: true,
                student: result.student,
                message: result.message
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Mark Complete API Error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}