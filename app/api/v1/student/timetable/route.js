import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import Timetable from "@/models/Timetable";
import Subject from "@/models/Subject";
import Course from "@/models/Course";
import User from "@/models/User";
import mongoose from "mongoose";

/**
 * @route   GET /api/v1/student/timetable
 * @desc    Fetch student's weekly class schedule across all enrolled batches
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        const studentObjId = new mongoose.Types.ObjectId(session.user.id);
        const instituteId = session.user.institute?.id ? new mongoose.Types.ObjectId(session.user.institute.id) : null;

        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);

        const batchQuery = {
            institute: instituteId,
            enrolledStudents: { 
                $elemMatch: { 
                    student: studentObjId, 
                    status: { $in: ['active', 'completed'] }
                } 
            },
            deletedAt: null
        };

        const batchIdParam = searchParams.get("batchId");
        if (batchIdParam && batchIdParam !== "all") {
            try {
                batchQuery._id = new mongoose.Types.ObjectId(batchIdParam);
            } catch {
                // Ignore invalid ObjectId format
            }
        }

        // 1. Fetch all active batches where the student is enrolled
        const batches = await Batch.find(batchQuery)
            .populate('course', 'name code')
            .populate('instructor', 'profile name')
            .lean();

        const batchIds = batches.map(b => b._id);

        // 2. Fetch detailed timetables for these batches (latest first)
        const timetables = await Timetable.find({
            batch: { $in: batchIds },
            deletedAt: null
        })
        .sort({ updatedAt: -1, createdAt: -1 })
        .populate('schedule.assignments.subject', 'name code subjectType')
        .populate('schedule.assignments.instructor', 'profile name')
        .lean();

        // 3. Format into a weekly structure (0=Sun, 1=Mon, ..., 6=Sat)
        const weeklySchedule = {
            0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
        };

        batches.forEach(batch => {
            const timetable = timetables.find(t => String(t.batch) === String(batch._id));

            if (timetable) {
                // Use detailed timetable
                timetable.schedule.forEach(daySchedule => {
                    const day = daySchedule.dayOfWeek;
                    daySchedule.assignments.forEach(assignment => {
                        const slot = timetable.timeSlots.find(s => String(s._id) === String(assignment.timeSlotId));
                        if (slot) {
                            const instructorName = assignment.instructor
                                ? (assignment.instructor.profile ? `${assignment.instructor.profile.firstName || ''} ${assignment.instructor.profile.lastName || ''}`.trim() : (assignment.instructor.name || "Faculty"))
                                : (batch.instructor?.profile ? `${batch.instructor.profile.firstName || ''} ${batch.instructor.profile.lastName || ''}`.trim() : (batch.instructor?.name || "Faculty In-Charge"));

                            const isLab = slot.name?.toLowerCase().includes('lab') || assignment.subject?.subjectType === 'LAB';

                            weeklySchedule[day].push({
                                batchId: batch._id,
                                batchName: batch.name,
                                courseName: assignment.subject?.name || batch.course?.name || "Academic Class",
                                courseCode: assignment.subject?.code || batch.course?.code || "LEC",
                                subjectType: assignment.subject?.subjectType || (isLab ? 'LAB' : 'THEORY'),
                                instructor: instructorName || "Faculty In-Charge",
                                originalStartTime: slot.startTime,
                                originalEndTime: slot.endTime,
                                startTime: assignment.startTimeOverride || slot.startTime,
                                endTime: assignment.endTimeOverride || slot.endTime,
                                startTimeOverride: assignment.startTimeOverride || null,
                                endTimeOverride: assignment.endTimeOverride || null,
                                slotName: slot.name,
                                type: slot.isBreak ? 'Break' : (isLab ? 'Lab' : 'Lec'),
                                isBreak: !!slot.isBreak
                            });
                        }
                    });

                    // Add breaks if day has active scheduled classes
                    if (daySchedule.assignments.length > 0) {
                        timetable.timeSlots.forEach(slot => {
                            const isRecess = slot.isBreak || (slot.name && (slot.name.toLowerCase().includes('recess') || slot.name.toLowerCase().includes('break')));
                            if (isRecess) {
                                const alreadyAdded = weeklySchedule[day].some(item => 
                                    String(item.batchId) === String(batch._id) && item.originalStartTime === slot.startTime
                                );
                                if (!alreadyAdded) {
                                    weeklySchedule[day].push({
                                        batchId: batch._id,
                                        batchName: batch.name,
                                        courseName: slot.name || "Recess & Interval",
                                        courseCode: "BREAK",
                                        instructor: "N/A",
                                        originalStartTime: slot.startTime,
                                        originalEndTime: slot.endTime,
                                        startTime: slot.startTime,
                                        endTime: slot.endTime,
                                        startTimeOverride: null,
                                        endTimeOverride: null,
                                        slotName: slot.name,
                                        type: 'Break',
                                        isBreak: true
                                    });
                                }
                            }
                        });
                    }
                });
            } else {
                // Fallback to basic batch schedule if present
                const { schedule } = batch;
                if (schedule && schedule.daysOfWeek && schedule.daysOfWeek.length > 0 && schedule.timeSlot) {
                    schedule.daysOfWeek.forEach(day => {
                        weeklySchedule[day].push({
                            batchId: batch._id,
                            batchName: batch.name,
                            courseName: batch.course?.name || "Academic Session",
                            courseCode: batch.course?.code || "LEC",
                            instructor: batch.instructor?.profile ? `${batch.instructor.profile.firstName || ''} ${batch.instructor.profile.lastName || ''}`.trim() : (batch.instructor?.name || "Faculty In-Charge"),
                            originalStartTime: schedule.timeSlot.start,
                            originalEndTime: schedule.timeSlot.end,
                            startTime: schedule.timeSlot.start,
                            endTime: schedule.timeSlot.end,
                            startTimeOverride: null,
                            endTimeOverride: null,
                            slotName: schedule.description || `Lecture Session`,
                            type: 'Lec',
                            isBreak: false
                        });
                    });
                }
            }
        });

        // 4. Sort each day by start time
        Object.keys(weeklySchedule).forEach(day => {
            weeklySchedule[day].sort((a, b) => {
                return a.startTime.localeCompare(b.startTime);
            });
        });

        return NextResponse.json({
            timetable: weeklySchedule,
            batches: batches.map(b => ({
                _id: String(b._id),
                name: b.name,
                courseName: b.course?.name || b.name,
                courseCode: b.course?.code || ""
            })),
            studentName: session.user.name
        });

    } catch (error) {
        console.error("Student Timetable API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

