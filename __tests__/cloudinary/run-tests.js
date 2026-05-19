#!/usr/bin/env node

/**
 * Test Runner for Multi-Tenant Cloudinary Storage
 * 
 * Runs all security tests and generates a report
 * Usage: node __tests__/cloudinary/run-tests.js
 */

const path = require('path');
const fs = require('fs');

// Set up environment
process.env.STORAGE_ENCRYPTION_KEY = process.env.STORAGE_ENCRYPTION_KEY || 
    'test-encryption-key-32bytes-length123456';

async function runAllTests() {
    console.log('\n' + '╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(20) + 'CLOUDINARY SECURITY TEST SUITE' + ' '.repeat(28) + '║');
    console.log('║' + ' '.repeat(15) + 'Multi-Tenant Storage Validation' + ' '.repeat(32) + '║');
    console.log('╚' + '═'.repeat(78) + '╝\n');

    const testResults = {
        totalTests: 0,
        passed: 0,
        failed: 0,
        details: []
    };

    // Test 1: Concurrent Leak Prevention
    try {
        console.log('▶ Running Test 1: Concurrent Leak Prevention...');
        const { testConcurrentLeakPrevention } = require('./concurrent-leak.test.js');
        const result1 = await testConcurrentLeakPrevention();
        
        testResults.totalTests++;
        if (result1.passed) {
            testResults.passed++;
            testResults.details.push({
                name: 'Concurrent Leak Prevention',
                passed: true,
                details: result1
            });
        } else {
            testResults.failed++;
            testResults.details.push({
                name: 'Concurrent Leak Prevention',
                passed: false,
                error: result1.error
            });
        }
    } catch (error) {
        console.error('❌ Test 1 execution failed:', error.message);
        testResults.totalTests++;
        testResults.failed++;
        testResults.details.push({
            name: 'Concurrent Leak Prevention',
            passed: false,
            error: error.message
        });
    }

    // Test 2: Payload Masking
    try {
        console.log('\n▶ Running Test 2: Payload Masking...');
        const { testPayloadMasking } = require('./payload-validation.test.js');
        const result2 = testPayloadMasking();
        
        testResults.totalTests++;
        if (result2.passed) {
            testResults.passed++;
        } else {
            testResults.failed++;
        }
        testResults.details.push({
            name: 'Payload Masking',
            passed: result2.passed,
            details: result2
        });
    } catch (error) {
        console.error('❌ Test 2 execution failed:', error.message);
        testResults.totalTests++;
        testResults.failed++;
    }

    // Test 3: Masked Value Preservation
    try {
        console.log('\n▶ Running Test 3: Masked Value Preservation...');
        const { testMaskedValuePreservation } = require('./payload-validation.test.js');
        const result3 = testMaskedValuePreservation();
        
        testResults.totalTests++;
        if (result3.passed) {
            testResults.passed++;
        } else {
            testResults.failed++;
        }
        testResults.details.push({
            name: 'Masked Value Preservation',
            passed: result3.passed
        });
    } catch (error) {
        console.error('❌ Test 3 execution failed:', error.message);
        testResults.totalTests++;
        testResults.failed++;
    }

    // Test 4: Error Message Safety
    try {
        console.log('\n▶ Running Test 4: Error Message Safety...');
        const { testErrorMessageSafety } = require('./payload-validation.test.js');
        const result4 = testErrorMessageSafety();
        
        testResults.totalTests++;
        if (result4.passed) {
            testResults.passed++;
        } else {
            testResults.failed++;
        }
        testResults.details.push({
            name: 'Error Message Safety',
            passed: result4.passed,
            details: result4
        });
    } catch (error) {
        console.error('❌ Test 4 execution failed:', error.message);
        testResults.totalTests++;
        testResults.failed++;
    }

    // Test 5: Trust Boundary Enforcement
    try {
        console.log('\n▶ Running Test 5: Trust Boundary Enforcement...');
        const { testTrustBoundaryEnforcement } = require('./trust-boundary.test.js');
        const result5 = testTrustBoundaryEnforcement();
        
        testResults.totalTests++;
        if (result5.passed) {
            testResults.passed++;
        } else {
            testResults.failed++;
        }
        testResults.details.push({
            name: 'Trust Boundary Enforcement',
            passed: result5.passed,
            details: result5
        });
    } catch (error) {
        console.error('❌ Test 5 execution failed:', error.message);
        testResults.totalTests++;
        testResults.failed++;
    }

    // Test 6: Session Tampering Detection
    try {
        console.log('\n▶ Running Test 6: Session Tampering Detection...');
        const { testSessionTamperingDetection } = require('./trust-boundary.test.js');
        const result6 = testSessionTamperingDetection();
        
        testResults.totalTests++;
        if (result6.passed) {
            testResults.passed++;
        } else {
            testResults.failed++;
        }
        testResults.details.push({
            name: 'Session Tampering Detection',
            passed: result6.passed,
            details: result6
        });
    } catch (error) {
        console.error('❌ Test 6 execution failed:', error.message);
        testResults.totalTests++;
        testResults.failed++;
    }

    // Test 7: Cross-Tenant Access Prevention
    try {
        console.log('\n▶ Running Test 7: Cross-Tenant Access Prevention...');
        const { testCrossTenantAccessPrevention } = require('./trust-boundary.test.js');
        const result7 = testCrossTenantAccessPrevention();
        
        testResults.totalTests++;
        if (result7.passed) {
            testResults.passed++;
        } else {
            testResults.failed++;
        }
        testResults.details.push({
            name: 'Cross-Tenant Access Prevention',
            passed: result7.passed
        });
    } catch (error) {
        console.error('❌ Test 7 execution failed:', error.message);
        testResults.totalTests++;
        testResults.failed++;
    }

    // Test 8: Rate Limit Enforcement
    try {
        console.log('\n▶ Running Test 8: Rate Limit Enforcement...');
        const { testRateLimitEnforcement } = require('./rate-limit.test.js');
        const result8 = await testRateLimitEnforcement();
        
        testResults.totalTests++;
        if (result8.passed) {
            testResults.passed++;
        } else {
            testResults.failed++;
        }
        testResults.details.push({
            name: 'Rate Limit Enforcement',
            passed: result8.passed,
            details: result8
        });
    } catch (error) {
        console.error('❌ Test 8 execution failed:', error.message);
        testResults.totalTests++;
        testResults.failed++;
    }

    // Test 9: Per-User Rate Isolation
    try {
        console.log('\n▶ Running Test 9: Per-User Rate Isolation...');
        const { testPerUserRateIsolation } = require('./rate-limit.test.js');
        const result9 = await testPerUserRateIsolation();
        
        testResults.totalTests++;
        if (result9.passed) {
            testResults.passed++;
        } else {
            testResults.failed++;
        }
        testResults.details.push({
            name: 'Per-User Rate Isolation',
            passed: result9.passed
        });
    } catch (error) {
        console.error('❌ Test 9 execution failed:', error.message);
        testResults.totalTests++;
        testResults.failed++;
    }

    // Print Summary
    printTestSummary(testResults);

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

function printTestSummary(results) {
    console.log('\n' + '═'.repeat(80));
    console.log('TEST SUMMARY');
    console.log('═'.repeat(80));

    console.log(`\nTotal Tests: ${results.totalTests}`);
    console.log(`Passed: ${results.passed} ✅`);
    console.log(`Failed: ${results.failed} ❌`);
    console.log(`Success Rate: ${((results.passed / results.totalTests) * 100).toFixed(1)}%`);

    console.log('\n' + '─'.repeat(80));
    console.log('DETAILED RESULTS');
    console.log('─'.repeat(80));

    results.details.forEach((test, i) => {
        const status = test.passed ? '✅' : '❌';
        console.log(`${i + 1}. ${status} ${test.name}`);
        if (test.error) {
            console.log(`   Error: ${test.error}`);
        }
    });

    console.log('\n' + '═'.repeat(80));
    if (results.failed === 0) {
        console.log('✅ ALL TESTS PASSED!');
    } else {
        console.log(`⚠️  ${results.failed} TEST(S) FAILED`);
    }
    console.log('═'.repeat(80) + '\n');
}

// Run tests
runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
