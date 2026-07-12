import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import IDCardTemplate from "@/models/IDCardTemplate";
import User from "@/models/User";
import Institute from "@/models/Institute";
import StudentIDCard from "@/models/StudentIDCard";
import { renderIDCardFront, renderIDCardBack } from "@/services/idCardService";
import { getInstituteScope } from "@/middleware/instituteScope";
import { v2 as cloudinary } from "cloudinary";
import { getCloudinaryOptions, getUploadFolder } from "@/lib/cloudinaryResolver";

export const runtime = "nodejs";

/**
 * Validates request body and ensures proper data structure
 */
function validateRequest(body) {
     const errors = [];
     
     if (!body.templateId) errors.push("templateId is required");
     if (!body.studentIds) errors.push("studentIds is required");
     if (!Array.isArray(body.studentIds)) errors.push("studentIds must be an array");
     if (Array.isArray(body.studentIds) && body.studentIds.length === 0) errors.push("studentIds cannot be empty");
     
     return { valid: errors.length === 0, errors };
 }

/**
 * Uploads buffer to Cloudinary with scoped credentials
 * @param {Buffer} buffer - The file buffer
 * @param {string} folder - The destination folder path
 * @param {string} instituteId - The institute ID for credential resolution
 * @returns {Promise<Object>} - The upload result
 */
async function uploadToCloudinaryScoped(buffer, folder, instituteId) {
     return new Promise(async (resolve, reject) => {
         try {
             const scopedOptions = await getCloudinaryOptions(instituteId);
             const uploadStream = cloudinary.uploader.upload_stream(
                 {
                     folder: folder,
                     resource_type: 'auto',
                     ...scopedOptions
                 },
                 (error, result) => {
                     if (error) return reject(error);
                     resolve(result);
                 }
             );
             uploadStream.end(buffer);
         } catch (error) {
             reject(error);
         }
     });
}

/**
 * Deletes resource from Cloudinary with scoped credentials
 * @param {string} publicId - The public ID to delete
 * @param {string} instituteId - The institute ID for credential resolution
 * @returns {Promise<Object>} - The delete result
 */
async function deleteFromCloudinaryScoped(publicId, instituteId) {
     if (!publicId) return Promise.resolve(null);
     const scopedOptions = await getCloudinaryOptions(instituteId);
     return new Promise((resolve, reject) => {
         cloudinary.uploader.destroy(publicId, scopedOptions, (error, result) => {
             if (error) return reject(error);
             resolve(result);
         });
     });
}

export async function POST(req) {
    try {
        await connectDB();

        const session = await getServerSession(authOptions);
        const hasAccess = ['admin', 'super_admin'].includes(session?.user?.role) || 
            (session?.user?.role === 'instructor' && session?.user?.permissions?.includes('generate_id_cards'));
        if (!session || !hasAccess) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const scope = await getInstituteScope(req);
        if (!scope.instituteId) {
            return NextResponse.json({ error: "Missing institute context" }, { status: 400 });
        }

        const body = await req.json();
        
        // Validate request
        const validation = validateRequest(body);
        if (!validation.valid) {
            return NextResponse.json(
                { error: "Invalid request", details: validation.errors },
                { status: 400 }
            );
        }
        
        const { templateId, studentIds } = body;

        // Fetch template - scoped to institute
        const template = await IDCardTemplate.findOne({ 
            _id: templateId, 
            institute: scope.instituteId 
        });
        if (!template) {
            return NextResponse.json(
                { error: "Template not found or access denied" },
                { status: 404 }
            );
        }

        // Fetch students - scoped to institute
        const students = await User.find({ 
            _id: { $in: studentIds },
            institute: scope.instituteId
        }).lean();

        if (students.length === 0) {
            return NextResponse.json(
                { error: "No students found for this institute" },
                { status: 404 }
            );
        }

        // Fetch institute info
        const institute = await Institute.findById(scope.instituteId).lean();
        if (!institute) {
            return NextResponse.json({ error: "Institute not found" }, { status: 404 });
        }
        const instituteId = scope.instituteId;

        const { getHydratedContext } = await import("@/services/certificateService");

        console.log(`[IDCardGeneration] Starting generation for ${students.length} students using template "${template.name}"`);

        // 1. Prepare contexts for all students in parallel
        const hydratedContexts = await Promise.all(students.map(async (student) => {
            try {
                // Find batch for this student
                const Batch = (await import("@/models/Batch")).default;
                const studentBatch = await Batch.findOne({
                    'enrolledStudents.student': student._id,
                    deletedAt: null
                }).populate('course').lean();

                // Get hydrated context with batch info
                const hydratedContext = await getHydratedContext(student._id, instituteId, {
                    batchId: studentBatch?._id
                });

                console.log(`[IDCardGeneration] Hydrated context for ${student.email}: batch="${studentBatch?.name || 'N/A'}", fields available`);
                
                return hydratedContext;
            } catch (e) {
                console.error(`[IDCardGeneration] Failed to hydrate student ${student._id}:`, e.message);
                return null;
            }
        }));

        const validContexts = hydratedContexts.filter(c => !!c);
        if (validContexts.length === 0) {
            return NextResponse.json(
                { error: "Failed to hydrate student data" },
                { status: 500 }
            );
        }

        console.log(`[IDCardGeneration] Successfully hydrated ${validContexts.length}/${students.length} students`);

        // 2. Render back card once (common for all students)
        let backImageUrl = null;
        let backPublicId = null;
        
        try {
             console.log(`[IDCardGeneration] Rendering back side...`);
             const backCanvas = await renderIDCardBack(validContexts[0], template, institute);
             const backBuffer = backCanvas.toBuffer("image/png");
             const backUploadFolder = getUploadFolder(instituteId, `id-cards/templates/${templateId}/back`);
             const backUpload = await uploadToCloudinaryScoped(backBuffer, backUploadFolder, instituteId);
             backImageUrl = backUpload.secure_url;
             backPublicId = backUpload.public_id;
             console.log(`[IDCardGeneration] Back side rendered successfully`);
         } catch (backError) {
             console.error(`[IDCardGeneration] Error rendering back side:`, backError);
             return NextResponse.json(
                 { error: "Failed to render back side", details: backError.message },
                 { status: 500 }
             );
         }

        // 3. Render and store cards for each student
        const studentCards = [];
        const failedCards = [];
        
        for (const context of validContexts) {
            try {
                const studentId = context.student.id || context.student._id;
                const studentName = context.student.fullName || "Unknown";
                
                console.log(`[IDCardGeneration] Rendering front side for ${studentName}...`);
                
                 // Render front
                 const frontCanvas = await renderIDCardFront(context, template);
                 const frontBuffer = frontCanvas.toBuffer("image/png");

                 // Upload to Cloudinary with scoped credentials
                 const frontUploadFolder = getUploadFolder(instituteId, `students/${studentId}/id-cards/front`);
                 const frontUpload = await uploadToCloudinaryScoped(frontBuffer, frontUploadFolder, instituteId);

                // 2. Cleanup Cloudinary - Find old active cards to delete their images
                // Only delete the front image (back is shared or template-based)
                const oldCards = await StudentIDCard.find(
                    { studentId, instituteId, status: 'ACTIVE' },
                    { frontPublicId: 1 }
                ).lean();

                 const { deleteFromCloudinary } = await import("@/lib/cloudinary");
                 for (const oldCard of oldCards) {
                     if (oldCard.frontPublicId) {
                         try {
                             await deleteFromCloudinaryScoped(oldCard.frontPublicId, instituteId);
                             console.log(`[IDCardGeneration] Deleted old Cloudinary image: ${oldCard.frontPublicId}`);
                         } catch (delErr) {
                             console.warn(`[IDCardGeneration] Failed to delete old image ${oldCard.frontPublicId}:`, delErr.message);
                         }
                     }
                 }

                // Deactivate old records in DB
                await StudentIDCard.updateMany(
                    { studentId, instituteId, status: 'ACTIVE' },
                    { status: 'EXPIRED' }
                );

                // Save to DB
                const cardRecord = await StudentIDCard.create({
                    studentId,
                    instituteId,
                    templateId: template._id,
                    frontImageUrl: frontUpload.secure_url,
                    backImageUrl: backImageUrl,
                    frontPublicId: frontUpload.public_id,
                    backPublicId: backPublicId,
                    status: 'ACTIVE'
                });

                studentCards.push({
                    studentId: context.student.grNumber || context.student.enrollmentNo || studentId,
                    name: studentName,
                    rollNumber: context.student.rollNo || context.student.enrollmentNo || "N/A",
                    frontImage: frontUpload.secure_url,
                    backImage: backImageUrl,
                    cardId: cardRecord._id.toString()
                });

                console.log(`[IDCardGeneration] Successfully generated card for ${studentName}`);

            } catch (cardError) {
                const errorMsg = `Error for student ${context.student.fullName}: ${cardError.message}`;
                console.error(`[IDCardGeneration]`, errorMsg);
                failedCards.push({
                    name: context.student.fullName,
                    error: cardError.message
                });
            }
        }

        if (studentCards.length === 0) {
            return NextResponse.json(
                { 
                    error: "Failed to generate any ID cards",
                    details: failedCards
                },
                { status: 500 }
            );
        }

        const summary = {
            success: true,
            generated: studentCards.length,
            failed: failedCards.length,
            total: validContexts.length,
            studentCards,
            failedCards: failedCards.length > 0 ? failedCards : undefined,
            message: `Successfully generated ${studentCards.length} ID card(s)${failedCards.length > 0 ? ` (${failedCards.length} failed)` : ""}`
        };
        
        console.log(`[IDCardGeneration] Generation complete: ${summary.generated} successful, ${summary.failed} failed`);

        return NextResponse.json(summary);

    } catch (error) {
        console.error("[IDCardGeneration] Error:", error);
        return NextResponse.json(
            { error: "Failed to generate ID cards", details: error.message },
            { status: 500 }
        );
    }
}
