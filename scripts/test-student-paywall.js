import assert from "assert";
import crypto from "crypto";

console.log("--> Running Student Paywall Logic & Razorpay Verification Check...");

// 1. Pricing Math Verification
const basePrice = 25;
const gstPercent = 18;
const gatewayFeePercent = 2;

const gstAmount = Math.round((basePrice * (gstPercent / 100)) * 100) / 100;
const gatewayFee = Math.round((basePrice * (gatewayFeePercent / 100)) * 100) / 100;
const totalAmount = Math.round(basePrice + gstAmount + gatewayFee);
const amountInPaise = Math.round(totalAmount * 100);

assert.strictEqual(gstAmount, 4.5, "18% GST on ₹25 must be ₹4.50");
assert.strictEqual(gatewayFee, 0.5, "2% Gateway fee on ₹25 must be ₹0.50");
assert.strictEqual(totalAmount, 30, "Total amount payable must be ₹30.00");
assert.strictEqual(amountInPaise, 3000, "Razorpay amount in paise must be 3000");
console.log("✓ Test 1 Passed: Pricing breakdown (₹25 + ₹4.50 + ₹0.50 = ₹30.00) is accurate");

// 2. Razorpay HMAC SHA256 Verification
const mockSecret = "rzp_secret_test_xyz123";
const mockOrderId = "order_Qe123456789";
const mockPaymentId = "pay_Qe987654321";

const validSignature = crypto
    .createHmac("sha256", mockSecret)
    .update(`${mockOrderId}|${mockPaymentId}`)
    .digest("hex");

const verifySignature = (orderId, paymentId, sig, secret) => {
    const computed = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    return computed === sig;
};

assert.strictEqual(verifySignature(mockOrderId, mockPaymentId, validSignature, mockSecret), true);
assert.strictEqual(verifySignature(mockOrderId, mockPaymentId, "tampered_sig", mockSecret), false);
console.log("✓ Test 2 Passed: Razorpay HMAC SHA256 signature verification works correctly");

// 3. Institute Cycle Expiry Date Pinning
const instituteSubscriptionEnd = new Date("2026-03-31T23:59:59.999Z");
const studentPaymentDate1 = new Date("2025-06-15T10:00:00.000Z");
const studentPaymentDate2 = new Date("2025-11-20T14:30:00.000Z");

const assignExpiry = (paymentDate, instituteEndDate) => {
    // Expiry is pinned to the institute's official cycle end date, NOT rolling 365 days
    return new Date(instituteEndDate.getTime());
};

const studentExpiry1 = assignExpiry(studentPaymentDate1, instituteSubscriptionEnd);
const studentExpiry2 = assignExpiry(studentPaymentDate2, instituteSubscriptionEnd);

assert.strictEqual(studentExpiry1.toISOString(), instituteSubscriptionEnd.toISOString(), "Student 1 must expire on 31 March 2026");
assert.strictEqual(studentExpiry2.toISOString(), instituteSubscriptionEnd.toISOString(), "Student 2 must expire on 31 March 2026");
console.log("✓ Test 3 Passed: Student expiry is strictly synchronized to Institute cycle end date");

// 4. Access Gating Logic
const checkAccess = ({ role, paywallEnabled, subscriptionStatus, expiresAt }) => {
    if (role !== "student") return false; // Staff/Admin never gated
    if (!paywallEnabled) return false;    // School has not enabled paywall
    if (subscriptionStatus === "EXEMPTED") return false; // Sponsored / RTE student
    const isCurrentlyActive = subscriptionStatus === "ACTIVE" && expiresAt && new Date(expiresAt) > new Date();
    return !isCurrentlyActive; // Returns true if payment is required
};

// Case A: Paywall disabled for institute
assert.strictEqual(checkAccess({
    role: "student",
    paywallEnabled: false,
    subscriptionStatus: "UNPAID",
    expiresAt: null
}), false, "Should not require payment if institute has disabled paywall");

// Case B: Paywall enabled, new student unpaid
assert.strictEqual(checkAccess({
    role: "student",
    paywallEnabled: true,
    subscriptionStatus: "UNPAID",
    expiresAt: null
}), true, "Should require payment for new unpaid student");

// Case C: Student paid, session active
assert.strictEqual(checkAccess({
    role: "student",
    paywallEnabled: true,
    subscriptionStatus: "ACTIVE",
    expiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000)
}), false, "Should NOT require payment if active and not expired");

// Case D: Student paid last year, cycle has now expired (e.g. past March 31st)
assert.strictEqual(checkAccess({
    role: "student",
    paywallEnabled: true,
    subscriptionStatus: "ACTIVE",
    expiresAt: new Date("2024-03-31")
}), true, "Should require payment after cycle has expired");

// Case E: Student exempted by principal
assert.strictEqual(checkAccess({
    role: "student",
    paywallEnabled: true,
    subscriptionStatus: "EXEMPTED",
    expiresAt: null
}), false, "Should NOT require payment if exempted");

// Case F: Teacher or Admin
assert.strictEqual(checkAccess({
    role: "instructor",
    paywallEnabled: true,
    subscriptionStatus: "UNPAID",
    expiresAt: null
}), false, "Teacher must never be blocked by student paywall");

console.log("✓ Test 4 Passed: All access gating conditions evaluate accurately");
console.log("\n--> ALL SELF-CHECK TESTS PASSED SUCCESSFULLY!");
