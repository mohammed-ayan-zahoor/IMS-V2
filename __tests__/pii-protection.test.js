/**
 * PII Protection & Schema Verification Test
 * Run: node __tests__/pii-protection.test.js
 */

const assert = require('assert');
const mongoose = require('mongoose');

// Import User schema directly
require('../models/Counter');
require('../models/Designation');
require('../models/Department');
const User = require('../models/User').default || require('../models/User');

console.log("Running PII Protection & Schema Verification Tests...\n");

// Test 1: Check select: false on PII fields
const piiFields = ['aadharNumber', 'apaarId', 'penNumber', 'fatherAadhar', 'motherAadhar'];
piiFields.forEach(field => {
    const pathConfig = User.schema.paths[field];
    assert(pathConfig, `Field ${field} must exist in User schema`);
    assert.strictEqual(pathConfig.options.select, false, `Field ${field} MUST have select: false configured`);
    console.log(`  ✔ Test Passed: ${field} has select: false configured`);
});

// Test 2: Check redundant indexes removed
const indexes = User.schema.indexes();
const hasRedundantRoleStatusDeleted = indexes.some(([spec]) => {
    const keys = Object.keys(spec);
    return keys.length === 3 && keys[0] === 'role' && keys[1] === 'status' && keys[2] === 'deletedAt';
});
assert.strictEqual(hasRedundantRoleStatusDeleted, false, "Redundant { role: 1, status: 1, deletedAt: 1 } index must be removed");
console.log("  ✔ Test Passed: Redundant { role, status, deletedAt } index removed");

// Test 3: Check enrollmentNumber partial index includes $ne: ""
const enrollmentIndex = indexes.find(([spec]) => spec.enrollmentNumber === 1 && spec.institute === 1);
assert(enrollmentIndex, "Compound index on { institute, enrollmentNumber } must exist");
const filter = enrollmentIndex[1]?.partialFilterExpression?.enrollmentNumber;
assert(filter && filter.$ne === "", "enrollmentNumber partial index must filter out empty strings ($ne: '')");
console.log("  ✔ Test Passed: enrollmentNumber partialFilterExpression correctly excludes empty strings ($ne: '')");

// Test 4: Verify email partial index exists
const emailIndex = indexes.find(([spec]) => spec.email === 1);
assert(emailIndex, "email unique index must exist");
assert.strictEqual(emailIndex[1]?.partialFilterExpression?.deletedAt, null, "email index must filter on deletedAt: null");
console.log("  ✔ Test Passed: email index partialFilterExpression verified for deletedAt: null");

console.log("\nAll 4 PII Protection & Schema Verification tests passed successfully!");
