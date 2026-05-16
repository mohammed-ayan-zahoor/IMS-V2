import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getInstituteScope } from "@/middleware/instituteScope";
import Timetable from "@/models/Timetable";
import Batch from "@/models/Batch";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "instructor", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        const { id: batchId } = await params;
        await connectDB();

        const timetable = await Timetable.findOne({ 
            batch: batchId,
            institute: scope.instituteId,
            deletedAt: null
        })
        .populate('schedule.assignments.subject', 'name code')
        .populate('schedule.assignments.instructor', 'profile');

        return NextResponse.json({ timetable });
    } catch (error) {
        console.error("Timetable GET Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "instructor", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized or missing context" }, { status: 401 });
        }

        const { id: batchId } = await params;
        const body = await req.json();
        const { timeSlots, schedule } = body;

        await connectDB();

        // Convert temporary frontend IDs to valid Mongo ObjectIds
        const idMap = new Map();

        const validTimeSlots = (timeSlots || []).map(ts => {
            const tempId = ts._id || ts.id;
            let validId;

            if (mongoose.Types.ObjectId.isValid(tempId) && (String(tempId).length === 12 || String(tempId).length === 24)) {
                validId = new mongoose.Types.ObjectId(tempId);
            } else {
                validId = new mongoose.Types.ObjectId();
                if (tempId) {
                    idMap.set(tempId, validId);
                }
            }

            return {
                ...ts,
                _id: validId
            };
        });

        const validSchedule = (schedule || []).map(day => {
            return {
                ...day,
                assignments: (day.assignments || []).map(ass => {
                    let tsId = ass.timeSlotId;
                    if (idMap.has(tsId)) {
                        tsId = idMap.get(tsId);
                    } else if (mongoose.Types.ObjectId.isValid(tsId) && (String(tsId).length === 12 || String(tsId).length === 24)) {
                        tsId = new mongoose.Types.ObjectId(tsId);
                    } else {
                        // Fallback (prevents CastError but might be orphaned)
                        tsId = new mongoose.Types.ObjectId();
                    }

                    return {
                        ...ass,
                        timeSlotId: tsId,
                        subject: ass.subject || null,
                        instructor: ass.instructor || null,
                        startTimeOverride: ass.startTimeOverride || undefined,
                        endTimeOverride: ass.endTimeOverride || undefined
                    };
                })
            };
        });

        await connectDB();

        // Verify batch ownership
        const batch = await Batch.findOne({ 
            _id: batchId, 
            institute: scope.instituteId,
            deletedAt: null 
        });

        if (!batch) {
            return NextResponse.json({ error: "Batch not found or unauthorized" }, { status: 404 });
        }

        // Upsert Timetable
        const timetable = await Timetable.findOneAndUpdate(
            { batch: batchId, institute: scope.instituteId, deletedAt: null },
            {
                $set: {
                    timeSlots: validTimeSlots,
                    schedule: validSchedule,
                    session: batch.session,
                    createdBy: session.user.id
                }
            },
            { new: true, upsert: true, runValidators: true }
        );

        return NextResponse.json({ timetable });
    } catch (error) {
        console.error("Timetable POST Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
