import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Institute from '@/models/Institute';
import { decrypt } from '@/lib/crypto';
import PusherServer from 'pusher';
import rateLimit from '@/lib/rateLimit';

/**
 * POST /api/v1/admin/settings/pusher-test
 * 
 * Test Pusher Channels and/or Beams credentials.
 */
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Apply rate limiting (max 5 requests per minute per user)
        const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
        const userId = session.user.id;
        const rateLimitKey = `pusher-test:${userId}:${ipAddress}`;

        try {
            await rateLimit(rateLimitKey, {
                points: 1,
                duration: 60,
                blockDuration: 60,
                maxPoints: 5
            });
        } catch (rateLimitError) {
            console.warn(`[Pusher Test] Rate limit exceeded for ${userId}`);
            return NextResponse.json(
                { error: "Too many test attempts. Please try again in a minute." },
                { status: 429 }
            );
        }

        await connectDB();

        const instituteId = session.user.institute?.id || session.user.instituteId;
        if (!instituteId) {
            return NextResponse.json({ error: "No institute context" }, { status: 400 });
        }

        // Only admin or super_admin can test
        if (!['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { appId, key, secret, cluster, beamsInstanceId, beamsSecretKey, testBeams } = body;

        // Retrieve stored credentials if masked
        let decryptedSecret = secret;
        let decryptedBeamsSecretKey = beamsSecretKey;
        const encryptionKey = process.env.STORAGE_ENCRYPTION_KEY;

        if (secret === '••••••••' || beamsSecretKey === '••••••••') {
            const institute = await Institute.findById(instituteId);
            if (!institute) {
                return NextResponse.json({ error: "Institute not found" }, { status: 404 });
            }

            if (secret === '••••••••') {
                if (!institute.pusher?.secret) {
                    return NextResponse.json({ error: "No existing Pusher secret found" }, { status: 400 });
                }
                decryptedSecret = decrypt(institute.pusher.secret, encryptionKey);
            }

            if (beamsSecretKey === '••••••••') {
                if (!institute.pusher?.beamsSecretKey) {
                    return NextResponse.json({ error: "No existing Beams secret key found" }, { status: 400 });
                }
                decryptedBeamsSecretKey = decrypt(institute.pusher.beamsSecretKey, encryptionKey);
            }
        }

        const errors = {};

        // 1. Test Pusher Channels (if provided)
        if (appId && key && decryptedSecret) {
            try {
                const pusherTestClient = new PusherServer({
                    appId,
                    key,
                    secret: decryptedSecret,
                    cluster: cluster || 'mt1',
                    useTLS: true
                });

                // Query Pusher Channels API to verify authentication
                await pusherTestClient.get({ path: '/channels' });
            } catch (err) {
                errors.channels = err.message || "Failed to connect to Pusher Channels. Verify App ID, Key, Secret, and Cluster.";
            }
        } else if (!testBeams) {
            errors.channels = "Missing required fields for Pusher Channels test.";
        }

        // 2. Test Pusher Beams (if requested and credentials provided)
        if (testBeams && beamsInstanceId && decryptedBeamsSecretKey) {
            try {
                const url = `https://${beamsInstanceId}.beams.pusher.com/publisher/api/v1/instances/${beamsInstanceId}/interests`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${decryptedBeamsSecretKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        interests: ['test-validation-interest'],
                        web: {
                            notification: {
                                title: 'IMS Test',
                                body: 'Verifying credentials'
                            }
                        }
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Beams API returned status ${response.status}: ${errorText}`);
                }
            } catch (err) {
                errors.beams = err.message || "Failed to validate Pusher Beams credentials.";
            }
        } else if (testBeams) {
            errors.beams = "Missing required fields for Pusher Beams test.";
        }

        // Save last test results to the DB
        const testSuccess = Object.keys(errors).length === 0;
        await Institute.findByIdAndUpdate(
            instituteId,
            {
                $set: {
                    'pusher.lastTestedAt': new Date(),
                    'pusher.lastTestResult': {
                        success: testSuccess,
                        error: testSuccess ? null : JSON.stringify(errors),
                        timestamp: new Date()
                    }
                }
            },
            { runValidators: false }
        );

        if (!testSuccess) {
            return NextResponse.json({
                success: false,
                errors,
                message: "Pusher connection test failed."
            });
        }

        return NextResponse.json({
            success: true,
            message: "Pusher connection test successful!",
            timestamp: new Date()
        });

    } catch (error) {
        console.error('[Pusher Test] Unexpected error:', error.message);
        return NextResponse.json(
            { error: "Test connection failed. Please check inputs and try again." },
            { status: 500 }
        );
    }
}
