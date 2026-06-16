import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import Timetable from "@/models/Timetable";

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

        // 1. Fetch all active batches where the student is enrolled
        const batches = await Batch.find({
            enrolledStudents: { 
                $elemMatch: { 
                    student: session.user.id, 
                    status: 'active' 
                } 
            },
            deletedAt: null
        })
        .populate('course', 'name code')
        .populate('instructor', 'profile')
        .lean();

        const batchIds = batches.map(b => b._id);

        // 2. Fetch detailed timetables for these batches
        const timetables = await Timetable.find({
            batch: { $in: batchIds },
            deletedAt: null
        })
        .populate('schedule.assignments.subject', 'name code')
        .populate('schedule.assignments.instructor', 'profile')
        .lean();

        // 3. Format into a weekly structure
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
                            weeklySchedule[day].push({
                                batchId: batch._id,
                                batchName: batch.name,
                                courseName: assignment.subject?.name || batch.course?.name,
                                courseCode: assignment.subject?.code || batch.course?.code,
                                instructor: assignment.instructor 
                                    ? `${assignment.instructor.profile?.firstName} ${assignment.instructor.profile?.lastName}`.trim() 
                                    : (batch.instructor ? `${batch.instructor.profile?.firstName} ${batch.instructor.profile?.lastName}`.trim() : 'N/A'),
                                originalStartTime: slot.startTime,
                                originalEndTime: slot.endTime,
                                startTime: assignment.startTimeOverride || slot.startTime,
                                endTime: assignment.endTimeOverride || slot.endTime,
                                startTimeOverride: assignment.startTimeOverride || null,
                                endTimeOverride: assignment.endTimeOverride || null,
                                slotName: slot.name,
                                type: slot.isBreak ? 'Break' : 'Lec',
                                isBreak: slot.isBreak
                            });
                        }
                    });

                    // Add breaks and empty slots if they aren't explicitly assigned
                    timetable.timeSlots.forEach(slot => {
                        const isRecess = slot.isBreak || (slot.name && (slot.name.toLowerCase().includes('recess') || slot.name.toLowerCase().includes('break')));
                        
                        const alreadyAdded = weeklySchedule[day].some(item => 
                            String(item.batchId) === String(batch._id) && item.originalStartTime === slot.startTime
                        );
                        if (!alreadyAdded) {
                            weeklySchedule[day].push({
                                batchId: batch._id,
                                batchName: batch.name,
                                courseName: slot.name,
                                courseCode: isRecess ? "BREAK" : "GAP",
                                instructor: "N/A",
                                originalStartTime: slot.startTime,
                                originalEndTime: slot.endTime,
                                startTime: slot.startTime,
                                endTime: slot.endTime,
                                startTimeOverride: null,
                                endTimeOverride: null,
                                slotName: slot.name,
                                type: isRecess ? 'Break' : 'Gap',
                                isBreak: !!isRecess
                            });
                        }
                    });
                });
            } else {
                // Fallback to basic batch schedule
                const { schedule } = batch;
                if (schedule && schedule.daysOfWeek && schedule.timeSlot) {
                    schedule.daysOfWeek.forEach(day => {
                        weeklySchedule[day].push({
                            batchId: batch._id,
                            batchName: batch.name,
                            courseName: batch.course?.name,
                            courseCode: batch.course?.code,
                            instructor: batch.instructor ? `${batch.instructor.profile?.firstName} ${batch.instructor.profile?.lastName}`.trim() : 'N/A',
                            originalStartTime: schedule.timeSlot.start,
                            originalEndTime: schedule.timeSlot.end,
                            startTime: schedule.timeSlot.start,
                            endTime: schedule.timeSlot.end,
                            startTimeOverride: null,
                            endTimeOverride: null,
                            slotName: `Time Slot`,
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
            studentName: session.user.name
        });

    } catch (error) {
        console.error("Student Timetable API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
