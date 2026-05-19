import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Institute from '@/models/Institute';
import { decrypt } from '@/lib/crypto';
import { validateCloudinaryCredentials } from '@/lib/cloudinaryResolver';
import rateLimit from '@/lib/rateLimit';

/**
 * POST /api/v1/admin/settings/cloudinary-test
 * 
 * Test Cloudinary connection by attempting a minimal upload
 * 
 * Security:
 * - Rate-limited to prevent brute-force attacks
 * - Never logs credentials in console
 * - Cleans up test file after validation
 * - If apiSecret is "••••••••", uses existing saved secret from database
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
        const rateLimitKey = `cloudinary-test:${userId}:${ipAddress}`;

        try {
            await rateLimit(rateLimitKey, {
                points: 1,
                duration: 60,
                blockDuration: 60,
                maxPoints: 5
            });
        } catch (rateLimitError) {
            console.warn(`[Cloudinary Test] Rate limit exceeded for ${userId}`);
            return NextResponse.json(
                { error: "Too many test attempts. Please try again in a minute." },
                { status: 429 }
            );
        }

        await connectDB();

        // Extract institute ID from session
        const instituteId = session.user.institute?.id || session.user.instituteId;
        if (!instituteId) {
            return NextResponse.json({ error: "No institute context" }, { status: 400 });
        }

        // Only admin or super_admin can test
        if (!['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { cloudName, apiKey, apiSecret } = body;

        // Validate required fields
        if (!cloudName || !apiKey || !apiSecret) {
            return NextResponse.json(
                { error: "Missing required fields: cloudName, apiKey, apiSecret" },
                { status: 400 }
            );
        }

        // If apiSecret is masked, fetch from database
        let credentialSecret = apiSecret;
        if (apiSecret === '••••••••') {
            const institute = await Institute.findById(instituteId);
            if (!institute?.cloudinary?.apiSecret) {
                return NextResponse.json(
                    { error: "No existing credentials found. Please provide full credentials." },
                    { status: 400 }
                );
            }

            // Decrypt the stored secret
            try {
                const encryptionKey = process.env.STORAGE_ENCRYPTION_KEY;
                if (!encryptionKey) {
                    throw new Error('Encryption key not available');
                }
                credentialSecret = decrypt(institute.cloudinary.apiSecret, encryptionKey);
            } catch (decryptError) {
                console.error('[Cloudinary Test] Decryption failed:', decryptError.message);
                return NextResponse.json(
                    { error: "Failed to retrieve existing credentials" },
                    { status: 500 }
                );
            }
        }

        // Validate credentials by attempting minimal upload
        const testResult = await validateCloudinaryCredentials({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: credentialSecret
        });

        if (!testResult.success) {
            // Update test result in database
            await Institute.findByIdAndUpdate(
                instituteId,
                {
                    $set: {
                        'cloudinary.lastTestedAt': new Date(),
                        'cloudinary.lastTestResult': {
                            success: false,
                            error: testResult.error,
                            timestamp: new Date()
                        }
                    }
                },
                { runValidators: false }
            );

            return NextResponse.json({
                success: false,
                error: testResult.error || "Cloudinary connection test failed",
                details: "Please verify your credentials and try again"
            });
        }

        // Update successful test result in database
        await Institute.findByIdAndUpdate(
            instituteId,
            {
                $set: {
                    'cloudinary.lastTestedAt': new Date(),
                    'cloudinary.lastTestResult': {
                        success: true,
                        error: null,
                        timestamp: new Date()
                    }
                }
            },
            { runValidators: false }
        );

        return NextResponse.json({
            success: true,
            message: "Cloudinary connection test successful!",
            timestamp: new Date()
        });

    } catch (error) {
        console.error('[Cloudinary Test] Unexpected error:', error.message);
        return NextResponse.json(
            { error: "Test connection failed. Please try again." },
            { status: 500 }
        );
    }
}
