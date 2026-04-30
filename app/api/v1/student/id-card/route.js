import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import IDCardTemplate from "@/models/IDCardTemplate";
import Batch from "@/models/Batch";

/**
 * @route   GET /api/v1/student/id-card
 * @desc    Fetch student data and default ID card template for digital rendering
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // 1. Fetch Student Data with Institute and Batch info
        const student = await User.findById(session.user.id)
            .populate('institute')
            .lean();

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        // 2. Find the default ID card template for the institute
        const template = await IDCardTemplate.findOne({ 
            institute: student.institute?._id, 
            isDefault: true 
        }).lean();

        // 3. Find active batch for course name
        const batch = await Batch.findOne({ 
            enrolledStudents: session.user.id,
            status: 'active'
        }).populate('course').lean();

        return NextResponse.json({
            student: {
                fullName: student.fullName,
                email: student.email,
                phone: student.phone,
                profilePicture: student.profilePicture,
                grNumber: student.grNumber,
                enrollmentNumber: student.enrollmentNumber,
                courseName: batch?.course?.name || "N/A",
                instituteName: student.institute?.name,
                instituteLogo: student.institute?.branding?.logo,
                bloodGroup: student.bloodGroup || "N/A",
                address: student.address ? `${student.address.city}, ${student.address.state}` : "N/A"
            },
            template: template || null
        });

    } catch (error) {
        console.error("Student ID Card API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
