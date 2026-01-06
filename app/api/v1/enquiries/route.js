import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Enquiry from '@/models/Enquiry';
import Course from '@/models/Course';
import { getInstituteScope } from '@/middleware/instituteScope';
import { createAuditLog } from '@/services/auditService';

// GET: List Enquiries (Scoped to Institute) with Pagination
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope.instituteId && !scope.isSuperAdmin) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100); // Max limit 100
        const skip = (page - 1) * limit;

        const query = {};
        if (scope.instituteId) {
            query.institute = scope.instituteId;
        }

        const [enquiries, total] = await Promise.all([
            Enquiry.find(query)
                .populate('course', 'name code')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Enquiry.countDocuments(query)
        ]);

        return NextResponse.json({
            enquiries,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Enquiry List Error:", error.message);
        return NextResponse.json({ error: "Failed to fetch enquiries" }, { status: 500 });
    }
}

// POST: Create New Enquiry
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        let { studentName, fatherName, contactNumber, course, standard, address, expectedConfirmationDate, followUpDate, notes } = body;

        // Sanitization & Validation
        studentName = studentName?.trim();
        fatherName = fatherName?.trim();
        contactNumber = contactNumber?.trim();
        notes = notes?.trim();

        // 1. Name Validation (Letters, spaces, hyphens only, max 50 chars)
        const nameRegex = /^[a-zA-Z\s\-]{2,50}$/;
        if (!studentName || !nameRegex.test(studentName)) {
            return NextResponse.json({ error: "Invalid student name (Letters only, 2-50 chars)" }, { status: 400 });
        }
        if (fatherName && !nameRegex.test(fatherName)) {
            return NextResponse.json({ error: "Invalid father's name" }, { status: 400 });
        }

        // 2. Contact Validation (10-15 digits)
        const phoneRegex = /^\d{10,15}$/;
        if (!contactNumber || !phoneRegex.test(contactNumber)) {
            return NextResponse.json({ error: "Invalid contact number (10-15 digits)" }, { status: 400 });
        }

        // 3. Course ID Validation
        if (!course || !/^[0-9a-fA-F]{24}$/.test(course)) {
            return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
        }

        // 4. Date Validation
        const isValidDate = (d) => d && !isNaN(new Date(d).getTime());
        if (expectedConfirmationDate && !isValidDate(expectedConfirmationDate)) {
            return NextResponse.json({ error: "Invalid expected confirmation date" }, { status: 400 });
        }
        if (followUpDate && !isValidDate(followUpDate)) {
            return NextResponse.json({ error: "Invalid follow-up date" }, { status: 400 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);

        if (!scope.instituteId) {
            return NextResponse.json({ error: "Institute context required" }, { status: 400 });
        }

        // Validate Course Existence & Scope
        const courseExists = await Course.findOne({ _id: course, institute: scope.instituteId });
        if (!courseExists) {
            return NextResponse.json({ error: "Invalid course for this institute" }, { status: 400 });
        }

        const newEnquiry = await Enquiry.create({
            institute: scope.instituteId,
            studentName,
            fatherName,
            contactNumber,
            course,
            standard: standard?.trim().substring(0, 20), // Truncate standard
            address: address?.trim().substring(0, 200), // Truncate address
            expectedConfirmationDate: expectedConfirmationDate ? new Date(expectedConfirmationDate) : null,
            followUpDate: followUpDate ? new Date(followUpDate) : null,
            notes: notes?.substring(0, 500), // Truncate notes
            createdBy: session.user.id
        });

        // Audit Log
        await createAuditLog({
            actor: session.user.id,
            action: 'enquiry.create',
            resource: { type: 'Enquiry', id: newEnquiry._id },
            institute: scope.instituteId,
            details: { studentName, contactNumber }
        });

        return NextResponse.json({ success: true, enquiry: newEnquiry }, { status: 201 });

    } catch (error) {
        console.error("Enquiry Create Error:", error?.message || String(error));
        return NextResponse.json({ error: "Failed to create enquiry" }, { status: 500 });
    }
}
