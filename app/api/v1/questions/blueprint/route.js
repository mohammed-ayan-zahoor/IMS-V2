import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Question from "@/models/Question";
import { getInstituteScope } from "@/middleware/instituteScope";
import mongoose from "mongoose";

// POST /api/v1/questions/blueprint
// Auto-selects questions satisfying blueprint criteria using MongoDB $sample
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const scope = await getInstituteScope(req);
        if (!scope || !["admin", "super_admin", "instructor"].includes(scope.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await connectDB();
        const body = await req.json();
        const {
            course,
            subject,
            chapters = [],
            difficultyCounts = {},
            typeCounts = {},
            totalQuestions = 10,
            excludeIds = []
        } = body;

        const baseMatch = {
            institute: scope.instituteId,
            isActive: true
        };

        if (course && mongoose.Types.ObjectId.isValid(course)) {
            baseMatch.course = new mongoose.Types.ObjectId(course);
        }
        if (subject && mongoose.Types.ObjectId.isValid(subject)) {
            baseMatch.subject = new mongoose.Types.ObjectId(subject);
        }
        if (Array.isArray(chapters) && chapters.length > 0) {
            baseMatch.chapter = { $in: chapters };
        }

        const pickedIds = new Set();
        if (Array.isArray(excludeIds)) {
            excludeIds.forEach(id => {
                if (id) pickedIds.add(String(id));
            });
        }

        const hasDiffCounts = Object.values(difficultyCounts).some(v => Number(v) > 0);
        const hasTypeCounts = Object.values(typeCounts).some(v => Number(v) > 0);

        let selectedQuestions = [];

        if (hasDiffCounts) {
            for (const [diff, count] of Object.entries(difficultyCounts)) {
                const targetCount = Number(count);
                if (targetCount <= 0) continue;

                const match = {
                    ...baseMatch,
                    difficulty: diff
                };
                if (pickedIds.size > 0) {
                    match._id = { $nin: Array.from(pickedIds).filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id)) };
                }

                const sampleResult = await Question.aggregate([
                    { $match: match },
                    { $sample: { size: targetCount } }
                ]);

                for (const q of sampleResult) {
                    pickedIds.add(String(q._id));
                    selectedQuestions.push(q);
                }
            }
        } else if (hasTypeCounts) {
            for (const [qType, count] of Object.entries(typeCounts)) {
                const targetCount = Number(count);
                if (targetCount <= 0) continue;

                const match = {
                    ...baseMatch,
                    type: qType
                };
                if (pickedIds.size > 0) {
                    match._id = { $nin: Array.from(pickedIds).filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id)) };
                }

                const sampleResult = await Question.aggregate([
                    { $match: match },
                    { $sample: { size: targetCount } }
                ]);

                for (const q of sampleResult) {
                    pickedIds.add(String(q._id));
                    selectedQuestions.push(q);
                }
            }
        } else {
            const sampleSize = Math.max(1, Number(totalQuestions) || 10);
            const match = { ...baseMatch };
            if (pickedIds.size > 0) {
                match._id = { $nin: Array.from(pickedIds).filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id)) };
            }

            selectedQuestions = await Question.aggregate([
                { $match: match },
                { $sample: { size: sampleSize } }
            ]);
        }

        await Question.populate(selectedQuestions, [
            { path: 'course', select: 'name' },
            { path: 'subject', select: 'name' },
            { path: 'createdBy', select: 'profile.firstName profile.lastName' }
        ]);

        return NextResponse.json({
            questions: selectedQuestions,
            count: selectedQuestions.length
        });
    } catch (error) {
        console.error("Blueprint generation error:", error);
        return NextResponse.json({ error: "Failed to generate questions from blueprint" }, { status: 500 });
    }
}
