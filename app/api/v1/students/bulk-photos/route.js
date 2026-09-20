import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import mongoose from "mongoose";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { updates } = body;

        if (!Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json({ error: "No photo updates provided" }, { status: 400 });
        }

        await connectDB();

        const instituteId = session.user.institute?.id;
        let updatedCount = 0;

        const bulkOperations = [];

        for (const item of updates) {
            if (!item.avatarUrl) continue;

            const filter = { role: "student" };

            if (session.user.role !== "super_admin" && instituteId) {
                filter.institute = instituteId;
            }

            // Match by studentId, or fallback to enrollmentNumber / admissionNo
            if (item.studentId && mongoose.Types.ObjectId.isValid(item.studentId)) {
                filter._id = item.studentId;
            } else if (item.admissionNo || item.enrollmentNumber) {
                filter.enrollmentNumber = (item.admissionNo || item.enrollmentNumber).toUpperCase();
            } else {
                continue;
            }

            const docEntry = {
                name: "Profile Photo",
                url: item.avatarUrl,
                publicId: item.publicId || "bulk_photo",
                category: "Photo",
                uploadedAt: new Date()
            };

            bulkOperations.push({
                updateOne: {
                    filter,
                    update: {
                        $set: {
                            "profile.avatar": item.avatarUrl
                        },
                        $push: {
                            documents: docEntry
                        }
                    }
                }
            });
        }

        if (bulkOperations.length > 0) {
            const bulkResult = await User.bulkWrite(bulkOperations);
            updatedCount = bulkResult.modifiedCount || 0;
        }

        // Create Audit Log
        if (updatedCount > 0) {
            try {
                await AuditLog.create({
                    actor: session.user.id,
                    action: "student.bulk_photo_update",
                    resource: { type: "User", id: session.user.id },
                    institute: instituteId || null,
                    details: {
                        updatedCount,
                        timestamp: new Date()
                    }
                });
            } catch (auditErr) {
                console.warn("[BULK_PHOTOS] Audit log creation failed:", auditErr);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully updated ${updatedCount} student photos`,
            updatedCount
        });

    } catch (error) {
        console.error("Bulk Photo Update API Error:", error);
        return NextResponse.json({ error: "Failed to update student photos", details: error.message }, { status: 500 });
    }
}
