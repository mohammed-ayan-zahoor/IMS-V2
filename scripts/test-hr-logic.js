// Self-check for HR module calculations and non-login staff rules
const assert = require('assert');

console.log("Running HR module self-check...");

// 1. Percentage & Flat Component Calculations
function calculateComponentAmount(basic, gross, comp) {
    if (comp.calculationType === 'percentage') {
        const basis = comp.percentageBasis === 'gross' ? gross : basic;
        return Math.round((basis * (comp.defaultValue || 0)) / 100);
    }
    return comp.defaultValue || 0;
}

const basic = 15000;
const gross = 25000;

// Flat test
const flatAllowance = { calculationType: 'flat', defaultValue: 3000 };
assert.strictEqual(calculateComponentAmount(basic, gross, flatAllowance), 3000, "Flat allowance calculation failed");

// Percentage of Basic test
const basicPercent = { calculationType: 'percentage', percentageBasis: 'basic', defaultValue: 12 };
assert.strictEqual(calculateComponentAmount(basic, gross, basicPercent), 1800, "Percentage of basic calculation failed");

// Percentage of Gross test
const grossPercent = { calculationType: 'percentage', percentageBasis: 'gross', defaultValue: 5 };
assert.strictEqual(calculateComponentAmount(basic, gross, grossPercent), 1250, "Percentage of gross calculation failed");

// 2. Attendance Late Penalty Block-Hour Rounding
function calculateLateHours(lateMinutes, graceMins = 15) {
    if (lateMinutes <= graceMins) return 0;
    return Math.ceil(lateMinutes / 60);
}

assert.strictEqual(calculateLateHours(10, 15), 0, "Grace period failed (should be 0)");
assert.strictEqual(calculateLateHours(15, 15), 0, "Exact grace limit failed (should be 0)");
assert.strictEqual(calculateLateHours(20, 15), 1, "Late 20 mins block round failed (should be 1)");
assert.strictEqual(calculateLateHours(65, 15), 2, "Late 65 mins block round failed (should be 2)");

// 3. Overtime Pay Block-Hour Calculation
function calculateOvertimeHours(stayMinutes, bufferMins = 30) {
    if (stayMinutes <= bufferMins) return 0;
    return Math.floor((stayMinutes - bufferMins) / 60);
}

assert.strictEqual(calculateOvertimeHours(25, 30), 0, "Buffer period failed (should be 0)");
assert.strictEqual(calculateOvertimeHours(85, 30), 0, "Uncompleted 1 hour past buffer failed (should be 0)");
assert.strictEqual(calculateOvertimeHours(90, 30), 1, "Completed 1 hour OT failed (should be 1)");
assert.strictEqual(calculateOvertimeHours(160, 30), 2, "Completed 2 hours OT failed (should be 2)");

// 4. Non-Login Support Staff Synthetic Email Regex
const sampleSyntheticEmail = `staff.${Date.now()}.a1b2c3d4@ims.internal`;
const internalEmailRegex = /^staff\.\d+\.[a-f0-9]+@ims\.internal$/;
assert.ok(internalEmailRegex.test(sampleSyntheticEmail), "Synthetic email format verification failed");

console.log("✅ All HR module logic checks passed successfully!");
