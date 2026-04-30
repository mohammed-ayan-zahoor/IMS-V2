import { NextResponse } from "next/server";
import AdmissionApplication from "@/models/AdmissionApplication";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import cloudinary from "@/lib/cloudinary";

export async function POST(req) {
    try {
        await connectDB();
        const body = await req.json();

        // Basic validation
        const requiredFields = ['institute', 'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'course', 'learningMode'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json({ error: `Field '${field}' is required` }, { status: 400 });
            }
        }

        // Handle Photo Upload via Cloudinary if provided as base64 string
        if (body.photo && body.photo.startsWith('data:image')) {
            try {
                const uploadResponse = await new Promise((resolve, reject) => {
                    const options = {
                        folder: "quantech/uploads/admissions",
                        resource_type: "image",
                        transformation: [{ width: 500, height: 500, crop: "limit" }]
                    };
                    cloudinary.uploader.upload(body.photo, options, (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    });
                });
                body.photo = uploadResponse.secure_url;
            } catch (uploadError) {
                console.error("[Cloudinary Upload Error]:", uploadError);
                return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
            }
        }

        const application = await AdmissionApplication.create(body);
        return NextResponse.json({ success: true, id: application._id }, { status: 201 });
    } catch (error) {
        console.error("[Admission Submission Error]:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const instituteId = searchParams.get('instituteId');
        const status = searchParams.get('status');

        const query = {};
        if (instituteId) {
            try {
                // Use the already imported mongoose if available, or fetch it
                const mongoose = require('mongoose');
                const targetId = new mongoose.Types.ObjectId(instituteId);
                query.institute = targetId;

                // DIAGNOSTICS: Check total records for this institute
                const totalInInst = await AdmissionApplication.countDocuments({ institute: targetId });
                const convertedInInst = await AdmissionApplication.countDocuments({ institute: targetId, status: 'converted' });
                console.log(`[ADMISSION DIAG] Institute: ${instituteId}, Total: ${totalInInst}, Converted: ${convertedInInst}, Requested Status: ${status}`);
            } catch (e) {
                query.institute = instituteId;
            }
        }
        if (status) query.status = status;

        const applications = await AdmissionApplication.find(query)
            .populate('course', 'name code fees')
            .sort({ createdAt: -1 });

        return NextResponse.json({ applications });
    } catch (error) {
        console.error("[Admission Fetch Error]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();
        const { id, status, notes } = body;

        if (!id || !status) {
            return NextResponse.json({ error: "ID and status are required" }, { status: 400 });
        }

        const updated = await AdmissionApplication.findByIdAndUpdate(
            id,
            { $set: { status, notes } },
            { new: true }
        );

        if (!updated) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, application: updated });
    } catch (error) {
        console.error("[Admission Patch Error]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
