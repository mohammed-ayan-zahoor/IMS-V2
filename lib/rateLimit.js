/**
 * Simple in-memory rate limiter using token bucket algorithm
 * Suitable for single-instance deployments
 * For distributed systems, use Redis-based rate limiting
 */

const buckets = new Map();

const DEFAULT_OPTIONS = {
    points: 1,           // Number of points consumed per action
    duration: 60,        // Reset window in seconds
    blockDuration: 60,   // Block duration in seconds
    maxPoints: 10        // Max points allowed in window
};

/**
 * Rate limit check using token bucket algorithm
 * 
 * @param {string} key - Unique identifier (e.g., "userId:ipAddress")
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - { remaining: number, resetIn: number, blocked: boolean }
 * @throws {Error} - If rate limit exceeded
 */
export default async function rateLimit(key, options = {}) {
    const config = { ...DEFAULT_OPTIONS, ...options };

    let bucket = buckets.get(key);

    // Initialize or reset bucket if expired
    if (!bucket || Date.now() - bucket.resetAt > config.duration * 1000) {
        bucket = {
            points: config.maxPoints,
            resetAt: Date.now(),
            blockedUntil: 0
        };
        buckets.set(key, bucket);
    }

    // Check if currently blocked
    if (bucket.blockedUntil > Date.now()) {
        const resetIn = Math.ceil((bucket.blockedUntil - Date.now()) / 1000);
        const error = new Error('Rate limit exceeded');
        error.code = 'RATE_LIMIT_EXCEEDED';
        error.resetIn = resetIn;
        throw error;
    }

    // Check if enough points available
    if (bucket.points < config.points) {
        bucket.blockedUntil = Date.now() + config.blockDuration * 1000;
        const resetIn = config.blockDuration;
        const error = new Error('Rate limit exceeded');
        error.code = 'RATE_LIMIT_EXCEEDED';
        error.resetIn = resetIn;
        throw error;
    }

    // Consume points
    bucket.points -= config.points;

    return {
        remaining: bucket.points,
        resetIn: Math.ceil((bucket.resetAt + config.duration * 1000 - Date.now()) / 1000),
        blocked: false
    };
}

/**
 * Reset rate limit for a specific key
 * Useful for testing or admin operations
 * 
 * @param {string} key - The rate limit key to reset
 */
export function resetRateLimit(key) {
    buckets.delete(key);
}

/**
 * Get current rate limit status
 * 
 * @param {string} key - The rate limit key
 * @returns {Object|null} - Current bucket state or null if not found
 */
export function getRateLimitStatus(key) {
    return buckets.get(key) || null;
}

/**
 * Clean up expired buckets periodically
 * Call this in your cleanup routine
 */
export function cleanupExpiredBuckets() {
    const now = Date.now();
    const expired = [];

    for (const [key, bucket] of buckets.entries()) {
        if (now - bucket.resetAt > 24 * 60 * 60 * 1000) {
            // Remove buckets older than 24 hours
            expired.push(key);
        }
    }

    expired.forEach(key => buckets.delete(key));
    return expired.length;
}
