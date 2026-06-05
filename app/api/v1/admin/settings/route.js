import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Institute from '@/models/Institute';
import { encrypt } from '@/lib/crypto';
import { maskCloudinaryConfig } from '@/lib/cloudinaryResolver';

/**
 * Prepares safe Pusher options for API responses
 * Masks sensitive secret keys to prevent exposure to frontend
 */
export function maskPusherConfig(pusherConfig) {
    if (!pusherConfig) return null;

    return {
        enabled: pusherConfig.enabled || false,
        appId: pusherConfig.appId || '',
        key: pusherConfig.key || '',
        secret: pusherConfig.secret ? '••••••••' : '',
        cluster: pusherConfig.cluster || 'mt1',
        beamsInstanceId: pusherConfig.beamsInstanceId || '',
        beamsSecretKey: pusherConfig.beamsSecretKey ? '••••••••' : '',
        configuredAt: pusherConfig.configuredAt,
        lastTestedAt: pusherConfig.lastTestedAt,
        lastTestResult: pusherConfig.lastTestResult
    };
}

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
        const safePusher = maskPusherConfig(institute.pusher);

        return NextResponse.json({
            success: true,
            settings: {
                ...institute.toJSON(),
                cloudinary: safeCloudinary,
                pusher: safePusher
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
 * Update institute settings including Cloudinary & Pusher configuration
 * Security controls:
 * - Encrypt apiSecret & secret & beamsSecretKey before storage using STORAGE_ENCRYPTION_KEY
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
        const encryptionKey = process.env.STORAGE_ENCRYPTION_KEY;

        if (!encryptionKey) {
            return NextResponse.json(
                { error: "Server configuration error: encryption key not available" },
                { status: 500 }
            );
        }

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
                if (body.cloudinary.apiSecret === '••••••••') {
                    const existing = await Institute.findById(instituteId, { 'cloudinary.apiSecret': 1 });
                    if (existing?.cloudinary?.apiSecret) {
                        cloudinaryUpdate.apiSecret = existing.cloudinary.apiSecret;
                    }
                } else {
                    try {
                        const encrypted = encrypt(body.cloudinary.apiSecret, encryptionKey);
                        cloudinaryUpdate.apiSecret = encrypted;
                    } catch (encryptError) {
                        console.error('[Settings] Cloudinary Encryption failed:', encryptError.message);
                        return NextResponse.json({ error: "Failed to encrypt Cloudinary credentials" }, { status: 500 });
                    }
                }
            }

            if (Object.keys(cloudinaryUpdate).length > 0) {
                cloudinaryUpdate.configuredAt = new Date();
            }

            updateData.cloudinary = cloudinaryUpdate;
        }

        // Handle Pusher settings if provided
        if (body.pusher) {
            const pusherUpdate = {};

            if (body.pusher.enabled !== undefined) {
                pusherUpdate.enabled = Boolean(body.pusher.enabled);
            }
            if (body.pusher.appId !== undefined) {
                pusherUpdate.appId = body.pusher.appId.trim();
            }
            if (body.pusher.key !== undefined) {
                pusherUpdate.key = body.pusher.key.trim();
            }
            if (body.pusher.cluster !== undefined) {
                pusherUpdate.cluster = body.pusher.cluster.trim();
            }
            if (body.pusher.beamsInstanceId !== undefined) {
                pusherUpdate.beamsInstanceId = body.pusher.beamsInstanceId.trim();
            }

            // Handle Pusher Secret Encryption
            if (body.pusher.secret) {
                if (body.pusher.secret === '••••••••') {
                    const existing = await Institute.findById(instituteId, { 'pusher.secret': 1 });
                    if (existing?.pusher?.secret) {
                        pusherUpdate.secret = existing.pusher.secret;
                    }
                } else {
                    try {
                        const encrypted = encrypt(body.pusher.secret, encryptionKey);
                        pusherUpdate.secret = encrypted;
                    } catch (encryptError) {
                        console.error('[Settings] Pusher Secret Encryption failed:', encryptError.message);
                        return NextResponse.json({ error: "Failed to encrypt Pusher credentials" }, { status: 500 });
                    }
                }
            }

            // Handle Pusher Beams Secret Key Encryption
            if (body.pusher.beamsSecretKey) {
                if (body.pusher.beamsSecretKey === '••••••••') {
                    const existing = await Institute.findById(instituteId, { 'pusher.beamsSecretKey': 1 });
                    if (existing?.pusher?.beamsSecretKey) {
                        pusherUpdate.beamsSecretKey = existing.pusher.beamsSecretKey;
                    }
                } else {
                    try {
                        const encrypted = encrypt(body.pusher.beamsSecretKey, encryptionKey);
                        pusherUpdate.beamsSecretKey = encrypted;
                    } catch (encryptError) {
                        console.error('[Settings] Beams Secret Encryption failed:', encryptError.message);
                        return NextResponse.json({ error: "Failed to encrypt Beams credentials" }, { status: 500 });
                    }
                }
            }

            if (Object.keys(pusherUpdate).length > 0) {
                pusherUpdate.configuredAt = new Date();
            }

            updateData.pusher = pusherUpdate;
        }

        // Validate Cloudinary configuration before saving
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

        // Validate Pusher configuration before saving
        if (updateData.pusher) {
            const { enabled, appId, key, secret } = {
                ...body.pusher,
                secret: body.pusher.secret === '••••••••' ? 'preserved' : body.pusher.secret
            };

            if (enabled && (!appId || !key || !secret)) {
                return NextResponse.json(
                    { error: "Missing required Pusher Channels credentials" },
                    { status: 400 }
                );
            }
        }

        // Build mongoose update payload keeping nested properties safe
        const setPayload = {};
        if (updateData.cloudinary) {
            for (const [k, v] of Object.entries(updateData.cloudinary)) {
                setPayload[`cloudinary.${k}`] = v;
            }
        }
        if (updateData.pusher) {
            for (const [k, v] of Object.entries(updateData.pusher)) {
                setPayload[`pusher.${k}`] = v;
            }
        }

        const updatedInstitute = await Institute.findByIdAndUpdate(
            instituteId,
            { $set: setPayload },
            { new: true, runValidators: true }
        );

        // Return masked configuration
        const safeCloudinary = maskCloudinaryConfig(updatedInstitute.cloudinary);
        const safePusher = maskPusherConfig(updatedInstitute.pusher);

        return NextResponse.json({
            success: true,
            message: "Settings updated successfully",
            settings: {
                ...updatedInstitute.toJSON(),
                cloudinary: safeCloudinary,
                pusher: safePusher
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
