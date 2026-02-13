import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Fee from "@/models/Fee";
import mongoose from "mongoose";
import "@/models/User";
import "@/models/Batch";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // Get pagination params from query string
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '100');
        const skip = (page - 1) * limit;

        const instituteId = session.user.institute?.id;
        if (!instituteId && session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Institute context missing" }, { status: 400 });
        }

        // Create query with proper ObjectId casting for aggregation if instituteId exists
        const matchQuery = {
            deletedAt: null,
            ...(instituteId ? { institute: new mongoose.Types.ObjectId(instituteId) } : {})
        };

        // Aggregation pipeline to:
        // 1. Match fees by institute
        // 2. Unwind installments to flatten them
        // 3. Match only paid installments
        // 4. Use $facet to get both paginated results and total count
        const pipeline = [
            { $match: matchQuery },
            { $unwind: "$installments" },
            { $match: { "installments.status": "paid" } },
            {
                $facet: {
                    results: [
                        { $sort: { "installments.paidDate": -1 } },
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    total: [
                        { $count: "total" }
                    ]
                }
            }
        ];

        const [aggregatedData] = await Fee.aggregate(pipeline);
        const results = aggregatedData.results || [];
        const total = aggregatedData.total[0]?.total || 0;

        // Populate student and batch on the flattened results
        const populatedResults = await Fee.populate(results, [
            { path: 'student', select: 'fullName email enrollmentNumber profile' },
            { path: 'batch', select: 'name' }
        ]);

        const collections = populatedResults.map(item => ({
            _id: item.installments._id,
            feeId: item._id,
            student: item.student,
            batch: item.batch,
            amount: item.installments.amount,
            paidDate: item.installments.paidDate,
            method: item.installments.paymentMethod,
            collectedBy: item.installments.collectedBy || "System/Unknown",
            notes: item.installments.notes
        }));

        return NextResponse.json({
            collections,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Collections report error:", error);
        return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 });
    }
}
