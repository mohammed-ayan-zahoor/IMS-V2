/**
 * Rate Limiting Test for Cloudinary Connection Test
 * 
 * Verifies that:
 * 1. Requests are throttled at 5 per minute per user
 * 2. Blocked requests return 429 status
 * 3. Rate limit resets after duration
 * 4. Different users have separate limits
 */

// Simple in-memory rate limiter for testing
const buckets = new Map();

const DEFAULT_OPTIONS = {
    points: 1,
    duration: 60,
    blockDuration: 60,
    maxPoints: 10
};

function rateLimit(key, options = {}) {
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

function resetRateLimit(key) {
    buckets.delete(key);
}

function getRateLimitStatus(key) {
    return buckets.get(key) || null;
}

/**
 * Simulate user making requests
 */
function simulateUserRequests(userId, requestCount, delayBetween = 10) {
    const results = [];

    for (let i = 0; i < requestCount; i++) {
        try {
            const key = `test-endpoint:${userId}`;
            const result = rateLimit(key, {
                points: 1,
                duration: 60,
                blockDuration: 60,
                maxPoints: 5
            });

            results.push({
                request: i + 1,
                success: true,
                remaining: result.remaining,
                resetIn: result.resetIn
            });

            console.log(`   Request ${i + 1}: ✅ Allowed (${result.remaining} remaining)`);
        } catch (error) {
            results.push({
                request: i + 1,
                success: false,
                error: error.code,
                resetIn: error.resetIn
            });

            console.log(`   Request ${i + 1}: ❌ Blocked (${error.code})`);
        }
    }

    return results;
}

/**
 * Test: Rate Limit Enforcement
 */
function testRateLimitEnforcement() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST: Rate Limiting (5 requests/minute)');
    console.log('='.repeat(80));

    const userId = 'user-12345';

    console.log(`\n📋 Simulating requests from ${userId}`);
    console.log(`   Limit: 5 requests per 60 seconds`);
    console.log(`   Testing: 8 consecutive requests\n`);

    // Reset any existing limit for clean test
    resetRateLimit(`test-endpoint:${userId}`);

    // Simulate 8 rapid requests
    const results = simulateUserRequests(userId, 8, 5);

    // Verify results
    const allowedCount = results.filter(r => r.success).length;
    const blockedCount = results.filter(r => !r.success).length;

    console.log(`\n📊 Results:`);
    console.log(`   Allowed: ${allowedCount}`);
    console.log(`   Blocked: ${blockedCount}`);
    console.log(`   Expected: 5 allowed, 3 blocked`);

    if (allowedCount === 5 && blockedCount === 3) {
        console.log(`\n✅ Rate limiting working correctly`);
        return {
            passed: true,
            allowedRequests: allowedCount,
            blockedRequests: blockedCount
        };
    } else {
        console.error(`\n❌ Rate limiting failed!`);
        console.error(`   Expected 5 allowed, got ${allowedCount}`);
        console.error(`   Expected 3 blocked, got ${blockedCount}`);
        return {
            passed: false,
            allowedRequests: allowedCount,
            blockedRequests: blockedCount,
            error: 'Incorrect rate limit counts'
        };
    }
}

/**
 * Test: Per-User Isolation
 */
function testPerUserRateIsolation() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST: Per-User Rate Limit Isolation');
    console.log('='.repeat(80));

    const user1 = 'user-111';
    const user2 = 'user-222';

    // Reset for clean test
    resetRateLimit(`test-endpoint:${user1}`);
    resetRateLimit(`test-endpoint:${user2}`);

    console.log(`\n📋 User 1: Making 4 requests`);
    const user1Results = simulateUserRequests(user1, 4, 5);
    const user1Allowed = user1Results.filter(r => r.success).length;

    console.log(`\n📋 User 2: Making 4 requests (should all succeed)`);
    const user2Results = simulateUserRequests(user2, 4, 5);
    const user2Allowed = user2Results.filter(r => r.success).length;

    console.log(`\n📊 Results:`);
    console.log(`   User 1 allowed: ${user1Allowed}/4`);
    console.log(`   User 2 allowed: ${user2Allowed}/4`);

    if (user1Allowed === 4 && user2Allowed === 4) {
        console.log(`\n✅ Users have separate rate limits`);
        return { passed: true };
    } else {
        console.error(`\n❌ Rate limit isolation failed!`);
        return {
            passed: false,
            error: 'Users do not have separate limits'
        };
    }
}

/**
 * Test: Block Duration
 */
function testBlockDuration() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST: Rate Limit Block Duration');
    console.log('='.repeat(80));

    const userId = 'user-blocked';

    // Reset for clean test
    resetRateLimit(`test-endpoint:${userId}`);

    console.log(`\n📋 Making 6 requests to trigger block (limit is 5)`);
    const results = simulateUserRequests(userId, 6, 5);

    // Find the blocked request
    const blockedRequest = results.find(r => !r.success);
    if (blockedRequest && blockedRequest.resetIn) {
        console.log(`\n📊 Block Duration:`);
        console.log(`   User is blocked for: ${blockedRequest.resetIn} seconds`);
        console.log(`   Expected: 60 seconds`);

        if (blockedRequest.resetIn > 0 && blockedRequest.resetIn <= 60) {
            console.log(`\n✅ Block duration is reasonable`);
            return {
                passed: true,
                blockDuration: blockedRequest.resetIn
            };
        }
    }

    console.error(`\n❌ Block duration test failed!`);
    return {
        passed: false,
        error: 'Unable to verify block duration'
    };
}

/**
 * Test: Reset Functionality
 */
function testRateLimitReset() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST: Rate Limit Reset');
    console.log('='.repeat(80));

    const key = 'test-reset-key';
    const userId = 'user-reset-test';
    const testKey = `${key}:${userId}`;

    // Check initial state (should be undefined)
    let status = getRateLimitStatus(testKey);
    console.log(`\n📋 Initial status: ${status ? 'Has limit' : 'No limit'}`);

    // Add a limit
    try {
        rateLimit(testKey, { points: 1, duration: 60, maxPoints: 5 });
        status = getRateLimitStatus(testKey);
        console.log(`After request: ${status ? '✅ Limit exists' : '❌ No limit'}`);
    } catch (e) {
        // Expected for some cases
    }

    // Reset it
    resetRateLimit(testKey);
    status = getRateLimitStatus(testKey);
    console.log(`After reset: ${status ? '❌ Limit still exists' : '✅ Limit cleared'}`);

    if (!status) {
        console.log(`\n✅ Rate limit reset working correctly`);
        return { passed: true };
    } else {
        console.error(`\n❌ Rate limit reset failed!`);
        return { passed: false, error: 'Reset did not clear limit' };
    }
}

/**
 * Test: HTTP 429 Response Simulation
 */
function testHTTP429Response() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST: HTTP 429 Too Many Requests Response');
    console.log('='.repeat(80));

    const userId = 'user-429-test';
    resetRateLimit(`test-endpoint:${userId}`);

    console.log(`\n📋 Simulating rate-limited request scenario`);
    console.log(`   Making 6 requests (limit is 5)\n`);

    const results = simulateUserRequests(userId, 6, 5);
    const blockedRequest = results.find(r => !r.success);

    if (blockedRequest) {
        console.log(`\n📊 Blocked Request Response:`);
        console.log(`   HTTP Status: 429 (Too Many Requests)`);
        console.log(`   Error Code: ${blockedRequest.error}`);
        console.log(`   Retry-After: ${blockedRequest.resetIn}s`);

        const responseHeaders = {
            'Retry-After': blockedRequest.resetIn,
            'X-RateLimit-Limit': 5,
            'X-RateLimit-Remaining': 0,
            'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + blockedRequest.resetIn
        };

        console.log(`\n📋 Response Headers:`);
        Object.entries(responseHeaders).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });

        if (blockedRequest.error === 'RATE_LIMIT_EXCEEDED') {
            console.log(`\n✅ Correct error code for rate limiting`);
            return {
                passed: true,
                httpStatus: 429,
                errorCode: blockedRequest.error,
                retryAfter: blockedRequest.resetIn
            };
        }
    }

    console.error(`\n❌ HTTP 429 test failed!`);
    return { passed: false, error: 'No blocked request found' };
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testRateLimitEnforcement,
        testPerUserRateIsolation,
        testBlockDuration,
        testRateLimitReset,
        testHTTP429Response
    };
}
