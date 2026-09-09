import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Course from "@/models/Course";
import Batch from "@/models/Batch";
import Fee from "@/models/Fee";
import Institute from "@/models/Institute";
import "@/models/Department";
import "@/models/Subject";
import "@/models/Session";
// Ensure models are registered for populate
import mongoose from "mongoose";
import { getInstituteScope } from "@/middleware/instituteScope";
import { decrypt } from "@/lib/crypto";

function safeDecrypt(val) {
    if (!val) return "";
    if (typeof val === 'string' && val.startsWith('enc:')) {
        try {
            return decrypt(val.replace(/^enc:/, '')) || "";
        } catch {
            return "";
        }
    }
    return val;
}

// Robust Institute Mapper (DTO)
function mapInstitute(inst) {
    if (!inst) return {
        type: '',
        name: 'Institute Name',
        code: '',
        affiliation: '',
        address: {},
        phone: 'N/A',
        email: 'N/A',
        logo: ''
    };

    return {
        type: inst.type || '',
        name: inst.name || 'Institute Name',
        code: inst.code || '',
        affiliation: inst.affiliation || inst.affiliatedTo || '',
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
            .populate({
                path: 'course',
                select: 'name code duration fees collegeConfig department subjects',
                populate: [
                    { path: 'department', select: 'name code' },
                    { path: 'subjects', select: 'name code' }
                ]
            })
            .populate('session', 'sessionName')
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
                bloodGroup: student.profile?.bloodGroup,
                avatar: student.profile?.avatar,
                address: student.profile?.address || {},

                // College & Academic IDs
                grNumber: student.grNumber,
                apaarId: safeDecrypt(student.apaarId),
                studentIdUdise: student.studentIdUdise,
                penNumber: safeDecrypt(student.penNumber),
                aadharNumber: safeDecrypt(student.aadharNumber),

                // Qualification & Entrance
                lastSchoolAttended: student.lastSchoolAttended,
                admissionDate: student.admissionDate,
                admissionStd: student.admissionStd,
                medium: student.medium,
                studyingSinceStandard: student.studyingSinceStandard,

                // Parents / Guardians
                fatherName: student.fatherName,
                fatherPhone: student.fatherPhone,
                motherName: student.motherName,
                motherPhone: student.motherPhone,
                guardianName: student.guardianDetails?.name,
                guardianPhone: student.guardianDetails?.phone,
                guardianRelation: student.guardianDetails?.relation,

                // Demographics
                nationality: student.nationality || "Indian",
                motherTongue: student.motherTongue,
                religion: student.religion,
                caste: student.caste,
                subCaste: student.subCaste,
                referredBy: student.referredBy,

                createdAt: student.createdAt
            },
            batches: batches.map(b => ({
                _id: b._id,
                name: b.name,
                semester: b.semester,
                course: b.course,
                session: b.session,
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