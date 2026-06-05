import PusherServer from 'pusher';
import PushNotifications from '@pusher/push-notifications-server';
import Institute from '@/models/Institute';
import { decrypt } from '@/lib/crypto';
import { connectDB } from '@/lib/mongodb';

// Standard fallback/global instances
let defaultPusherServer = null;
let defaultBeamsClient = null;

export const pusherServer = new PusherServer({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    useTLS: true,
});

/**
 * Resolves a dynamic Pusher Server instance for a given institute context.
 * Falls back to global credentials if not configured/enabled.
 */
export async function getPusherInstance(instituteId) {
    if (!instituteId) {
        return pusherServer;
    }

    try {
        await connectDB();
        const institute = await Institute.findById(instituteId);

        if (institute?.pusher?.enabled && institute.pusher.appId && institute.pusher.key) {
            const { appId, key, secret, cluster } = institute.pusher;
            const encryptionKey = process.env.STORAGE_ENCRYPTION_KEY;
            
            if (!encryptionKey) {
                console.error('[Pusher Resolver] STORAGE_ENCRYPTION_KEY is missing, falling back to default client');
                return pusherServer;
            }

            let decryptedSecret;
            try {
                decryptedSecret = decrypt(secret, encryptionKey);
            } catch (decError) {
                console.error(`[Pusher Resolver] Decryption failed for institute ${instituteId}:`, decError.message);
                return pusherServer;
            }

            return new PusherServer({
                appId,
                key,
                secret: decryptedSecret,
                cluster: cluster || 'mt1',
                useTLS: true
            });
        }
    } catch (error) {
        console.error(`[Pusher Resolver] Error resolving custom instance for ${instituteId}:`, error);
    }

    return pusherServer;
}

/**
 * Resolves a dynamic Pusher Beams client for a given institute context.
 * Falls back to global credentials if not configured/enabled.
 */
export async function getBeamsInstance(instituteId) {
    // If no instituteId, try to return default beams client
    if (!instituteId) {
        return getDefaultBeamsClient();
    }

    try {
        await connectDB();
        const institute = await Institute.findById(instituteId);

        if (institute?.pusher?.enabled && institute.pusher.beamsInstanceId && institute.pusher.beamsSecretKey) {
            const { beamsInstanceId, beamsSecretKey } = institute.pusher;
            const encryptionKey = process.env.STORAGE_ENCRYPTION_KEY;
            
            if (!encryptionKey) {
                console.error('[Beams Resolver] STORAGE_ENCRYPTION_KEY is missing, falling back to default Beams');
                return getDefaultBeamsClient();
            }

            let decryptedSecretKey;
            try {
                decryptedSecretKey = decrypt(beamsSecretKey, encryptionKey);
            } catch (decError) {
                console.error(`[Beams Resolver] Decryption failed for institute ${instituteId}:`, decError.message);
                return getDefaultBeamsClient();
            }

            return new PushNotifications({
                instanceId: beamsInstanceId,
                secretKey: decryptedSecretKey
            });
        }
    } catch (error) {
        console.error(`[Beams Resolver] Error resolving custom Beams for ${instituteId}:`, error);
    }

    return getDefaultBeamsClient();
}

function getDefaultBeamsClient() {
    if (!defaultBeamsClient) {
        if (!process.env.PUSHER_BEAMS_INSTANCE_ID || !process.env.PUSHER_BEAMS_PRIMARY_KEY) {
            return null;
        }
        defaultBeamsClient = new PushNotifications({
            instanceId: process.env.PUSHER_BEAMS_INSTANCE_ID,
            secretKey: process.env.PUSHER_BEAMS_PRIMARY_KEY,
        });
    }
    return defaultBeamsClient;
}
