import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import WebsiteConfig from "@/models/WebsiteConfig";
import OfflineExam from "@/models/OfflineExam";
import Session from "@/models/Session";
import { getInstituteScope } from "@/middleware/instituteScope";
import "@/models/Course";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);

        let config = await WebsiteConfig.findOne({ instituteId: scope.instituteId });
        if (!config) {
            return Response.json({ error: "Website configuration not found" }, { status: 404 });
        }

        // Active Session
        let activeSession = await Session.findOne({
            instituteId: scope.instituteId,
            isActive: true,
            deletedAt: null
        });

        if (!activeSession) {
            activeSession = await Session.findOne({
                instituteId: scope.instituteId,
                deletedAt: null
            }).sort({ createdAt: -1 });
        }

        let exams = [];
        if (activeSession) {
            exams = await OfflineExam.find({
                institute: scope.instituteId,
                session: activeSession._id,
                status: 'published',
                deletedAt: null
            })
            .populate('course', 'name code')
            .sort({ createdAt: -1 });
        }

        return Response.json({
            success: true,
            activeSession: activeSession ? { id: activeSession._id, name: activeSession.sessionName } : null,
            exams: exams.map(e => ({
                id: e._id,
                title: e.title,
                examType: e.examType,
                courseName: e.course?.name || 'General',
                subjectsCount: e.subjects?.length || 0,
                status: e.status,
                updatedAt: e.updatedAt
            })),
            config: {
                hiddenExams: config.resultsPage?.hiddenExams || [],
                customTitle: config.resultsPage?.customTitle || 'Student Examination Results',
                customSubtitle: config.resultsPage?.customSubtitle || 'Enter your Enrollment Number and Date of Birth to view your statement of marks.'
            }
        });
    } catch (error) {
        console.error("Results Config GET Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const scope = await getInstituteScope(req);
        const { hiddenExams, customTitle, customSubtitle } = await req.json();

        const config = await WebsiteConfig.findOneAndUpdate(
            { instituteId: scope.instituteId },
            {
                $set: {
                    'resultsPage.hiddenExams': Array.isArray(hiddenExams) ? hiddenExams : [],
                    'resultsPage.customTitle': customTitle?.trim() || 'Student Examination Results',
                    'resultsPage.customSubtitle': customSubtitle?.trim() || 'Enter your Enrollment Number and Date of Birth to view your statement of marks.'
                }
            },
            { new: true, upsert: true }
        );

        return Response.json({
            success: true,
            config: config.resultsPage
        });
    } catch (error) {
        console.error("Results Config POST Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
