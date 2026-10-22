import crypto from "crypto";
import { connectDB } from "../mongodb.js";
import KioskDevice from "../../models/KioskDevice.js";
import HRSettings from "../../models/HRSettings.js";

/**
 * Generates a new cryptographically secure Kiosk Key.
 * Returns the plaintext key (to show once to admin) along with keyPrefix and keyHash to store in DB.
 * @returns {{ fullKey: string, keyPrefix: string, keyHash: string }}
 */
export function generateKioskKey() {
    const randomHex = crypto.randomBytes(24).toString("hex");
    const fullKey = `ksk_${randomHex}`;
    const keyPrefix = fullKey.slice(0, 12); // e.g. "ksk_a1b2c3d4"
    const keyHash = crypto.createHash("sha256").update(fullKey).digest("hex");
    return { fullKey, keyPrefix, keyHash };
}

/**
 * Hashes a key using SHA-256.
 * @param {string} key
 * @returns {string}
 */
export function hashKey(key) {
    return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Constant-time comparison of two hex hashes.
 * @param {string} a - hex string
 * @param {string} b - hex string
 * @returns {boolean}
 */
export function safeCompare(a, b) {
    if (!a || !b) return false;
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies an incoming kiosk key against registered KioskDevices or legacy HRSettings.
 * @param {string} suppliedKey
 * @returns {Promise<{ isValid: boolean, instituteId?: mongoose.Types.ObjectId, device?: Object, error?: string }>}
 */
export async function verifyKioskKey(suppliedKey) {
    if (!suppliedKey || typeof suppliedKey !== "string") {
        return { isValid: false, error: "Missing kiosk authorization key" };
    }

    const trimmed = suppliedKey.trim();
    await connectDB();

    // 1. Preferred Path: KioskDevice lookup by prefix + constant-time hash comparison
    if (trimmed.startsWith("ksk_") && trimmed.length >= 24) {
        const prefix = trimmed.slice(0, 12);
        const device = await KioskDevice.findOne({
            keyPrefix: prefix,
            isActive: true,
            revokedAt: null
        });

        if (device) {
            const computedHash = hashKey(trimmed);
            if (safeCompare(computedHash, device.keyHash)) {
                // Update lastSeenAt asynchronously
                KioskDevice.findByIdAndUpdate(device._id, { lastSeenAt: new Date() }).catch(err => {
                    console.warn("Failed to update kiosk lastSeenAt:", err.message);
                });

                return {
                    isValid: true,
                    instituteId: device.institute,
                    device: {
                        id: device._id,
                        name: device.name,
                        institute: device.institute
                    }
                };
            }
        }
    }

    // 2. Fallback Path: Check HRSettings.biometricApiKey
    const hrSettings = await HRSettings.findOne({ biometricApiKey: trimmed }).lean();
    if (hrSettings && hrSettings.institute) {
        return {
            isValid: true,
            instituteId: hrSettings.institute,
            device: {
                id: null,
                name: "Legacy-Biometric-Key",
                institute: hrSettings.institute
            }
        };
    }

    return { isValid: false, error: "Invalid or revoked kiosk key" };
}
