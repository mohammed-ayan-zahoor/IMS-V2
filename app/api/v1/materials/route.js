import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Material from "@/models/Material";
import Batch from "@/models/Batch";
import AuditLog from "@/models/AuditLog";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get("courseId");
        const batchId = searchParams.get("batchId");
        const search = searchParams.get("search");

        const query = { deletedAt: null };

        // Multi-tenancy: Scope by Institute for non-Super Admins
        if (session.user.role !== 'super_admin') {
            if (!session.user.institute?.id) {
                return NextResponse.json({ error: "Institute context missing" }, { status: 403 });
            }
            query.institute = session.user.institute.id;
        }

        // Check permissions
        if (session.user.role === 'student') {
            query.visibleToStudents = true;

            // Verify student enrollment if courseId is provided
            if (courseId) {
                const enrollment = await Batch.findOne({
                    $or: [{ course: courseId }, { courseBundle: courseId }],
                    "enrolledStudents": {
                        $elemMatch: {
                            student: session.user.id,
                            status: "active"
                        }
                    }
                });

                if (!enrollment) {
                    return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 });
                }
            } else {
                // If checking globally, only show materials from their active batches
                const myBatches = await Batch.find({
                    "enrolledStudents": {
                        $elemMatch: {
                            student: session.user.id,
                            status: "active"
                        }
                    }
                }).select('_id');
                const batchIds = myBatches.map(b => b._id);
                // Matched materials must be linked to one of my batches
                // Note: Materials have `batches` array.
                query.batches = { $in: batchIds };
            }
        }

        // Apply Instructor isolation
        if (session.user.role === 'instructor') {
            const User = (await import("@/models/User")).default;
            const instructor = await User.findById(session.user.id).select('assignments');
            const assignedCourses = instructor?.assignments?.courses || [];
            const assignedBatches = instructor?.assignments?.batches || [];

            query.$or = [
                { course: { $in: assignedCourses } },
                { courses: { $in: assignedCourses } },
                { batches: { $in: assignedBatches } }
            ];
        }

        if (courseId) {
            query.$or = [
                { course: courseId },
                { courses: courseId },
                { courseBundle: courseId },
                { courseBundles: courseId }
            ];
        }
        if (batchId) {
            if (session.user.role === 'student') {
                // For students, ensure batchId is in their enrolled batches
                if (!courseId) {
                    // Re-verifying enrollment for this specific batch is safest
                    const batchEnrollment = await Batch.findOne({
                        _id: batchId,
                        "enrolledStudents": {
                            $elemMatch: {
                                student: session.user.id,
                                status: "active"
                            }
                        }
                    });

                    if (!batchEnrollment) {
                        return NextResponse.json({ error: "Not enrolled in this batch" }, { status: 403 });
                    }
                    query.batches = batchId;

                } else {
                    // Case B: CourseId Provided
                    const batchEnrollment = await Batch.findOne({
                        _id: batchId,
                        $or: [{ course: courseId }, { courseBundle: courseId }],
                        "enrolledStudents": {
                            $elemMatch: {
                                student: session.user.id,
                                status: "active"
                            }
                        }
                    });
                    if (!batchEnrollment) {
                        return NextResponse.json({ error: "Not enrolled in this batch" }, { status: 403 });
                    }
                    query.batches = batchId;
                }
            } else {
                // Non-students can filter by any batch
                query.batches = batchId;
            }
        }
        if (search) {
            query.$text = { $search: search };
        }

        const materials = await Material.find(query)
            .populate('course', 'name')
            .populate('courses', 'name')
            .populate('courseBundle', 'title')
            .populate('courseBundles', 'title')
            .populate('batches', 'name')
            .populate('uploadedBy', 'profile.firstName profile.lastName')
            .sort({ createdAt: -1 });

        return NextResponse.json({ materials });

    } catch (error) {
        console.error("Fetch Materials Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();

        // Validate basic fields - support both single course/bundle and multiple courses/bundles
        const courses = body.courses || (body.course ? [body.course] : []);
        const courseBundles = body.courseBundles || (body.courseBundle ? [body.courseBundle] : []);
        if (!body.title || !body.file?.url || (courses.length === 0 && courseBundles.length === 0)) {
            return NextResponse.json({ error: "Missing required fields: title, file.url, and at least one course or package" }, { status: 400 });
        }

        // Prevent mass assignment by picking allowed fields
        const safeBody = {
            title: body.title,
            description: body.description,
            type: body.type, // 'video', 'document', 'link'
            category: body.category,
            file: {
                url: body.file.url,
                fileId: body.file.fileId,
                type: body.file.type,
                size: body.file.size
            },
            courses: courses, // Array of course IDs
            course: courses[0] || null, // Keep first course for backwards compatibility
            courseBundles: courseBundles, // Array of bundle IDs
            courseBundle: courseBundles[0] || null, // Single bundle for backwards compatibility
            batches: body.batches || [], // Array of IDs
            visibleToStudents: !!body.visibleToStudents,
            tags: Array.isArray(body.tags) ? body.tags : [],
            allowSubmissions: !!body.allowSubmissions,
            dueDate: body.dueDate || null,
            totalMarks: body.totalMarks || null
        };

        // Determine Institute
        let instituteId = session.user.institute?.id;

        if (session.user.role !== 'super_admin') {
            if (!instituteId) {
                return NextResponse.json({ error: "Institute context missing for this user" }, { status: 403 });
            }
        } else {
            // For super_admin, rely on body or undefined (global)
            instituteId = body.institute || instituteId;
        }

        const material = await Material.create({
            ...safeBody,
            uploadedBy: session.user.id,
            institute: instituteId
        });

        // Audit Log
        await AuditLog.create({
            actor: session.user.id,
            action: 'material.upload',
            resource: { type: 'Material', id: material._id },
            details: {
                title: material.title,
                courses: material.courses,
                type: material.type,
                batches: material.batches
            },
            ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown'
        });

        return NextResponse.json({ success: true, material }, { status: 201 });

    } catch (error) {
        console.error("Create Material Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
