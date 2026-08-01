import crypto from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET || 'ims_transport_secret_key_2026';

/**
 * Signs a payload into a JWT token using HS256 algorithm.
 * @param {object} payload - Claims to include in the token.
 * @param {number} expiresInSeconds - Expiry time (default: 30 days).
 */
export function signToken(payload, expiresInSeconds = 30 * 24 * 60 * 60) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + expiresInSeconds;
    const fullPayload = { ...payload, iat, exp };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

    const signature = crypto
        .createHmac('sha256', SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifies a JWT token signature and expiration.
 * @param {string} token - The Bearer token string.
 * @returns {object|null} Payload if valid, null if invalid or expired.
 */
export function verifyToken(token) {
    if (!token) return null;
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    
    try {
        const parts = cleanToken.split('.');
        if (parts.length !== 3) return null;

        const [encodedHeader, encodedPayload, signature] = parts;
        const expectedSignature = crypto
            .createHmac('sha256', SECRET)
            .update(`${encodedHeader}.${encodedPayload}`)
            .digest('base64url');

        if (signature !== expectedSignature) return null;

        const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null; // Expired
        }
        return payload;
    } catch (err) {
        return null;
    }
}
