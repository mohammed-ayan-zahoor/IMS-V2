import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Course from "@/models/Course";
import Batch from "@/models/Batch";
import Fee from "@/models/Fee";
import Institute from "@/models/Institute";
import mongoose from "mongoose";
import { getInstituteScope } from "@/middleware/instituteScope";

// Robust Institute Mapper (DTO)
function mapInstitute(inst) {
    if (!inst) return {
        name: 'Institute Name',
        address: {},
        phone: 'N/A',
        email: 'N/A',
        logo: ''
    };

    return {
        name: inst.name || 'Institute Name',
        address: {
            street: inst.address?.street || inst.address?.line1 || '',
            city: inst.address?.city || inst.address?.district || '',
            state: inst.address?.state || '',
            pincode: inst.address?.pincode || inst.address?.postalCode || ''
        },
        phone: inst.contactPhone 
            || inst.phone 
            || inst.mobile 
            || inst.phoneNumber 
            || inst.contactNumber 
            || "N/A",
        email: inst.contactEmail 
            || inst.email 
            || inst.emailAddress 
            || "N/A",
        logo: inst.branding?.logo || inst.logo || ''
    };
}

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
            .populate('course', 'name code duration')
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
        const instId = student.institute || instituteId;
        
        if (instId) {
            try {
                // Manually import to ensure model registration
                const InstituteModel = mongoose.models.Institute || (await import('@/models/Institute')).default;
                institute = await InstituteModel.findById(instId).lean();
            } catch (e) {
                console.error("Institute fetch error:", e);
            }
        }

        return NextResponse.json({
            student: {
                _id: student._id,
                enrollmentNumber: student.enrollmentNumber,
                email: student.email,
                
                // Flattened Profile
                firstName: student.profile?.firstName,
                lastName: student.profile?.lastName,
                phone: student.profile?.phone,
                dateOfBirth: student.profile?.dateOfBirth,
                gender: student.profile?.gender,
                avatar: student.profile?.avatar,
                address: student.profile?.address || {},

                // Flattened Guardian
                guardianName: student.guardianDetails?.name,
                guardianPhone: student.guardianDetails?.phone,
                guardianRelation: student.guardianDetails?.relation,

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
            institute: mapInstitute(institute)
        });
    } catch (error) {
        console.error("Error fetching admission form data:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch data" }, { status: 500 });
    }
}