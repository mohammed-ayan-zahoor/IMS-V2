import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Batch from "@/models/Batch";
import Fee from "@/models/Fee";
import mongoose from "mongoose";
import { getInstituteScope } from "@/middleware/instituteScope";

export async function GET(req, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const batchId = searchParams.get('batchId');
        
        await connectDB();
        
        const scope = await getInstituteScope(req);
        const instituteId = scope?.instituteId;

        if (!instituteId && session.user.role !== 'super_admin') {
            return NextResponse.json({ error: "Institute context missing" }, { status: 400 });
        }

        const query = { _id: id, role: 'student' };
        if (instituteId) {
            query.institute = instituteId;
        }

        const student = await User.findOne(query).lean();

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        let batches = [];
        let fees = [];

        const batchQuery = { 
            'enrolledStudents.student': id, 
            deletedAt: null 
        };
        
        if (batchId && mongoose.Types.ObjectId.isValid(batchId)) {
            batchQuery._id = new mongoose.Types.ObjectId(batchId);
        }

        const foundBatches = await Batch.find(batchQuery)
            .populate('course', 'name code')
            .lean();
        
        batches = foundBatches;
        
        if (batches.length > 0) {
            const batchIds = batches.map(b => b._id);
            const foundFees = await Fee.find({
                student: id,
                batch: { $in: batchIds }
            }).lean();
            fees = foundFees;
        }

        let institute = null;
        if (student.institute) {
            try {
                const Institute = (await import('@/models/Institute')).default;
                institute = await Institute.findById(student.institute).lean();
            } catch (e) {
                console.error("Institute fetch error:", e);
            }
        }

        return NextResponse.json({
            student: {
                _id: student._id,
                enrollmentNumber: student.enrollmentNumber,
                email: student.email,
                profile: student.profile,
                guardianDetails: student.guardianDetails,
                createdAt: student.createdAt
            },
            batches: batches.map(b => ({
                _id: b._id,
                name: b.name,
                course: b.course,
                schedule: b.schedule,
                enrollment: b.enrolledStudents?.find(e => String(e.student) === String(id))
            })),
            fees: fees.map(f => ({
                totalAmount: f.totalAmount,
                discount: f.discount,
                installments: f.installments
            })),
            institute: institute ? {
                name: institute.name,
                address: institute.address,
                phone: institute.phone,
                email: institute.email,
                logo: institute.logo
            } : null
        });

    } catch (error) {
        console.error("Error fetching admission form data:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch data" }, { status: 500 });
    }
}