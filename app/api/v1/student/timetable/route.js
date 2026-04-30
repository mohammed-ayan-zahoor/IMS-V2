import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";

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

        // 2. Format into a weekly timetable structure
        // Days: 0 (Sun) to 6 (Sat)
        const weeklySchedule = {
            0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
        };

        batches.forEach(batch => {
            const { schedule } = batch;
            if (schedule && schedule.daysOfWeek && schedule.timeSlot) {
                schedule.daysOfWeek.forEach(day => {
                    weeklySchedule[day].push({
                        batchId: batch._id,
                        batchName: batch.name,
                        courseName: batch.course?.name,
                        courseCode: batch.course?.code,
                        instructor: batch.instructor ? `${batch.instructor.profile?.firstName} ${batch.instructor.profile?.lastName}`.trim() : 'N/A',
                        startTime: schedule.timeSlot.start,
                        endTime: schedule.timeSlot.end,
                        type: 'Lec' // Default type
                    });
                });
            }
        });

        // 3. Sort each day by start time
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
