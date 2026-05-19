import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Institute from '@/models/Institute';
import { encrypt } from '@/lib/crypto';
import { maskCloudinaryConfig } from '@/lib/cloudinaryResolver';

/**
 * GET /api/v1/admin/settings
 * 
 * Fetch current institute settings with sensitive data masked
 * Security: API secrets are masked as "••••••••" to prevent exposure
 */
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // Extract institute ID from session
        const instituteId = session.user.institute?.id || session.user.instituteId;
        if (!instituteId) {
            return NextResponse.json({ error: "No institute context" }, { status: 400 });
        }

        // Only admin or super_admin can access settings
        if (!['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const institute = await Institute.findById(instituteId);
        if (!institute) {
            return NextResponse.json({ error: "Institute not found" }, { status: 404 });
        }

        // Mask Cloudinary API secret before returning to frontend
        const safeCloudinary = maskCloudinaryConfig(institute.cloudinary);

        return NextResponse.json({
            success: true,
            settings: {
                ...institute.toJSON(),
                cloudinary: safeCloudinary
            }
        });

    } catch (error) {
        console.error('[Settings API] GET error:', error);
        return NextResponse.json(
            { error: "Failed to fetch settings" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/v1/admin/settings
 * 
 * Update institute settings including Cloudinary configuration
 * Security controls:
 * - Encrypt apiSecret before storage
 * - If client passes "••••••••", preserve existing encrypted value
 * - Only update secret if new plain text value is submitted
 * - Never log credentials
 */
export async function PATCH(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // Extract institute ID from session
        const instituteId = session.user.institute?.id || session.user.instituteId;
        if (!instituteId) {
            return NextResponse.json({ error: "No institute context" }, { status: 400 });
        }

        // Only admin or super_admin can update settings
        if (!['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const updateData = {};

        // Handle Cloudinary settings if provided
        if (body.cloudinary) {
            const cloudinaryUpdate = {};

            if (body.cloudinary.enabled !== undefined) {
                cloudinaryUpdate.enabled = Boolean(body.cloudinary.enabled);
            }

            if (body.cloudinary.cloudName) {
                cloudinaryUpdate.cloudName = body.cloudinary.cloudName.trim();
            }

            if (body.cloudinary.apiKey) {
                cloudinaryUpdate.apiKey = body.cloudinary.apiKey.trim();
            }

            // Handle API secret encryption
            if (body.cloudinary.apiSecret) {
                // If client sends "••••••••", skip updating (preserve existing encrypted value)
                if (body.cloudinary.apiSecret === '••••••••') {
                    // Use existing value - don't update
                    const existing = await Institute.findById(instituteId, { 'cloudinary.apiSecret': 1 });
                    if (existing?.cloudinary?.apiSecret) {
                        cloudinaryUpdate.apiSecret = existing.cloudinary.apiSecret;
                    }
                } else {
                    // New credential provided - encrypt and store
                    const encryptionKey = process.env.STORAGE_ENCRYPTION_KEY;
                    if (!encryptionKey) {
                        return NextResponse.json(
                            { error: "Server configuration error: encryption key not available" },
                            { status: 500 }
                        );
                    }

                    try {
                        const encrypted = encrypt(body.cloudinary.apiSecret, encryptionKey);
                        cloudinaryUpdate.apiSecret = encrypted;
                    } catch (encryptError) {
                        console.error('[Settings] Encryption failed:', encryptError.message);
                        return NextResponse.json(
                            { error: "Failed to encrypt credentials" },
                            { status: 500 }
                        );
                    }
                }
            }

            // Set configuration timestamp
            if (Object.keys(cloudinaryUpdate).length > 0) {
                cloudinaryUpdate.configuredAt = new Date();
            }

            updateData.cloudinary = cloudinaryUpdate;
        }

        // Validate configuration before saving
        if (updateData.cloudinary) {
            const { enabled, cloudName, apiKey, apiSecret } = {
                ...body.cloudinary,
                apiSecret: body.cloudinary.apiSecret === '••••••••' ? 'preserved' : body.cloudinary.apiSecret
            };

            if (enabled && (!cloudName || !apiKey || !apiSecret)) {
                return NextResponse.json(
                    { error: "Missing required Cloudinary credentials" },
                    { status: 400 }
                );
            }
        }

        const updatedInstitute = await Institute.findByIdAndUpdate(
            instituteId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        // Return masked configuration
        const safeCloudinary = maskCloudinaryConfig(updatedInstitute.cloudinary);

        return NextResponse.json({
            success: true,
            message: "Settings updated successfully",
            settings: {
                ...updatedInstitute.toJSON(),
                cloudinary: safeCloudinary
            }
        });

    } catch (error) {
        console.error('[Settings API] PATCH error:', error);
        return NextResponse.json(
            { error: "Failed to update settings" },
            { status: 500 }
        );
    }
}
