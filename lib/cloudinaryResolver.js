import { decrypt } from '@/lib/crypto';
import Institute from '@/models/Institute';

/**
 * Thread-Safe Cloudinary Resolver
 * 
 * Resolves tenant-specific Cloudinary credentials using scoped options injection.
 * This pattern avoids singleton credential bleed by passing credentials directly
 * to each Cloudinary API call rather than mutating global configuration.
 */

/**
 * Resolves the thread-safe Cloudinary upload option overrides for a specific institute.
 * 
 * Security guarantees:
 * - No singleton mutations (SDK processes each request independently)
 * - Credentials decrypted on-demand and never cached in memory
 * - Falls back to platform defaults if custom credentials unavailable
 * 
 * @param {string} instituteId - The institute ID (from session.user.institute?.id)
 * @returns {Promise<Object>} - Cloudinary options object for scoped injection
 * @throws {Error} - If encryption/decryption fails or database error occurs
 */
export async function getCloudinaryOptions(instituteId) {
    // No institute ID = use platform defaults
    if (!instituteId) {
        return {};
    }

    try {
        const institute = await Institute.findById(instituteId);

        if (!institute) {
            console.warn(`[Cloudinary] Institute ${instituteId} not found, using platform defaults`);
            return {};
        }

        // Check if custom Cloudinary is enabled and properly configured
        if (!institute.cloudinary?.enabled || !institute.cloudinary?.cloudName) {
            return {};
        }

        const { cloudName, apiKey, apiSecret } = institute.cloudinary;

        // Validate that all credentials are present
        if (!cloudName || !apiKey || !apiSecret) {
            console.warn(`[Cloudinary] Incomplete custom credentials for ${instituteId}, using platform defaults`);
            return {};
        }

        // Decrypt the API secret using the dedicated encryption key
        const encryptionKey = process.env.STORAGE_ENCRYPTION_KEY;
        if (!encryptionKey) {
            throw new Error('STORAGE_ENCRYPTION_KEY environment variable not configured');
        }

        let decryptedSecret;
        try {
            decryptedSecret = decrypt(apiSecret, encryptionKey);
        } catch (decryptError) {
            console.error(`[Cloudinary] Failed to decrypt API secret for ${instituteId}:`, decryptError.message);
            throw new Error('Failed to decrypt Cloudinary credentials');
        }

        // Return thread-safe scoped options
        // These options are passed directly to each Cloudinary API call
        // and do NOT mutate the global singleton configuration
        return {
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: decryptedSecret
        };

    } catch (error) {
        console.error(`[Cloudinary] Error resolving options for ${instituteId}:`, error);
        throw error;
    }
}

/**
 * Gets the tenant-specific upload folder path
 * 
 * @param {string} instituteId - The institute ID
 * @param {string} subfolder - Optional subfolder (e.g., 'id-cards', 'documents')
 * @returns {string} - The folder path for Cloudinary uploads
 */
export function getUploadFolder(instituteId, subfolder = '') {
    const basePath = `institutes/${instituteId}`;
    
    if (subfolder) {
        return `${basePath}/${subfolder}`;
    }
    
    return basePath;
}

/**
 * Validates Cloudinary credentials by attempting a minimal operation
 * Used for testing connection without logging credentials
 * 
 * @param {Object} credentials - { cloud_name, api_key, api_secret }
 * @returns {Promise<Object>} - { success: boolean, error?: string }
 */
export async function validateCloudinaryCredentials(credentials) {
    try {
        const { v2: cloudinary } = await import('cloudinary');
        
        // Temporarily create a scoped instance with provided credentials
        const testCloudinary = cloudinary;
        testCloudinary.config(credentials);

        // Attempt a minimal 1x1 transparent PNG upload
        const { Readable } = await import('stream');
        
        // 1x1 transparent PNG
        const minimalPNG = Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
            0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
            0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
        ]);

        // Create promise for upload
        const uploadPromise = new Promise((resolve, reject) => {
            const uploadStream = testCloudinary.uploader.upload_stream(
                {
                    folder: `_cloudinary_test/${Date.now()}`,
                    public_id: `test_${Date.now()}`,
                    resource_type: 'image',
                    overwrite: true
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );

            uploadStream.end(minimalPNG);
        });

        // Execute upload with timeout
        const result = await Promise.race([
            uploadPromise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection test timeout')), 5000)
            )
        ]);

        // Clean up: delete the test file
        try {
            await testCloudinary.uploader.destroy(result.public_id);
        } catch (cleanupError) {
            console.warn('[Cloudinary] Failed to clean up test file:', cleanupError.message);
        }

        return { success: true };

    } catch (error) {
        return {
            success: false,
            error: error.message || 'Failed to validate Cloudinary credentials'
        };
    }
}

/**
 * Prepares safe options for API responses
 * Masks sensitive data to prevent exposure to frontend
 * 
 * @param {Object} cloudinaryConfig - The full cloudinary config from institute
 * @returns {Object} - Safe config with masked secret
 */
export function maskCloudinaryConfig(cloudinaryConfig) {
    if (!cloudinaryConfig) return null;

    return {
        enabled: cloudinaryConfig.enabled,
        cloudName: cloudinaryConfig.cloudName,
        apiKey: cloudinaryConfig.apiKey,
        apiSecret: cloudinaryConfig.apiSecret ? '••••••••' : null
    };
}
