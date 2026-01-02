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
                    course: courseId,
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

        if (courseId) query.course = courseId;
        if (batchId) {
            if (session.user.role === 'student') {
                // For students, ensure batchId is in their enrolled batches
                if (!courseId) {
                    // If no courseId was provided, batchIds from line 55 already restricts access
                    // Further narrow down to the specific batch if it's in their list
                    // We must use $eq to strictly match the requested batch, AND keep the $in check from line 55 implicitly
                    // actually line 55 sets query.batches = { $in: batchIds }. 
                    // We need to intersecting them.
                    // The simplest way is to overwrite query.batches but VALIDATE first.

                    // We need the list of batchIds from line 52 to be accessible here. 
                    // However, line 52 is inside the 'else' block of 'if (courseId)'. 
                    // So if courseId is NOT provided, we have batchIds calculated.
                    // If courseId IS provided, we haven't calculated batchIds yet (we did strict course check).

                    // Wait, logic at 24-57 handles "Global Visibility Scope".
                    // If courseId is passed -> we validated course enrollment.
                    // If not passed -> we got 'batchIds' and set query.batches = { $in: batchIds }.

                    // Now we are refining with a SPECIFIC batchId request.

                    // Case A: No CourseId
                    // batchIds variable is available locally? No, it's inside block 43-56.
                    // That block sets query.batches.
                    // If I overwrite query.batches = batchId, I lose the security restriction IF validation isn't done.
                    // But if I validate that `batchId` is in my allowed list, I can set it.

                    // To do this cleanly without re-querying, I should probably rely on the query structure construction.
                    // OR, using the user's provided snippet logic which queries DB if needed.

                    // Let's use the provided logic which is robust:

                    if (!courseId) {
                        // We are in the "Global" branch (lines 43-56 executed).
                        // 'query.batches' is already `{ $in: [...] }`.
                        // We want to intersect that with `batchId`.
                        // MongoDB doesn't support simple "intersection" in assignment easily without $and.
                        // But we can just use $and or simply check if batchId is valid for this user.

                        // Re-verifying enrollment for this specific batch is safest and follows the provided snippet's pattern.
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
                        // We verified course enrollment, but NOT batch enrollment (we might be in the course but not this batch).
                        const batchEnrollment = await Batch.findOne({
                            _id: batchId,
                            course: courseId,
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

        // Validate basic fields
        if (!body.title || !body.file?.url || !body.course) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
            course: body.course,
            batches: body.batches, // Array of IDs
            visibleToStudents: !!body.visibleToStudents,
            tags: Array.isArray(body.tags) ? body.tags : []
        };

        const material = await Material.create({
            ...safeBody,
            uploadedBy: session.user.id,
            institute: session.user.institute?.id
        });

        // Audit Log
        await AuditLog.create({
            actor: session.user.id,
            action: 'material.upload',
            resource: { type: 'Material', id: material._id },
            details: {
                title: material.title,
                course: material.course,
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
