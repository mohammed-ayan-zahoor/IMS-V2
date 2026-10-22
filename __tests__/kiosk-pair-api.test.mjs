import assert from 'assert';
import { connectDB } from '../lib/mongodb.js';
import User from '../models/User.js';
import Institute from '../models/Institute.js';
import KioskDevice from '../models/KioskDevice.js';
import { POST } from '../app/api/v1/attendance/kiosk/pair/route.js';
import bcrypt from 'bcryptjs';

async function runPairTest() {
    console.log("=========================================================");
    console.log("     TEST: Kiosk Admin Pairing API (/kiosk/pair)         ");
    console.log("=========================================================");

    await connectDB();

    // 1. Create a dummy Institute
    const testInst = await Institute.create({
        name: "Test Pairing International School",
        code: "TPIS" + Date.now().toString().slice(-4),
        status: "active"
    });

    // 2. Create a dummy Admin User
    const passwordHash = await bcrypt.hash("AdminPass123!", 10);
    const testAdmin = await User.create({
        name: "Principal Sharma",
        email: `principal_${Date.now()}@testschool.edu`,
        passwordHash,
        role: "admin",
        institute: testInst._id
    });

    try {
        // [Case 1] Bad password
        console.log("\n[Test 1] Attempting pair with invalid password...");
        const badReq = new Request("http://localhost:3000/api/v1/attendance/kiosk/pair", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: testAdmin.email,
                password: "WrongPassword!",
                deviceName: "Reception Tablet"
            })
        });
        const badRes = await POST(badReq);
        const badJson = await badRes.json();
        assert.strictEqual(badRes.status, 401);
        assert.strictEqual(badJson.success, false);
        console.log("✓ Invalid password correctly rejected (401)");

        // [Case 2] Valid Admin Login & Pairing
        console.log("\n[Test 2] Pairing with correct Admin Credentials...");
        const goodReq = new Request("http://localhost:3000/api/v1/attendance/kiosk/pair", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: testAdmin.email,
                password: "AdminPass123!",
                deviceName: "Gate 1 North Tablet"
            })
        });
        const goodRes = await POST(goodReq);
        const goodJson = await goodRes.json();
        assert.strictEqual(goodRes.status, 200);
        assert.strictEqual(goodJson.success, true);
        assert.ok(goodJson.kioskKey.startsWith("ksk_"));
        assert.strictEqual(goodJson.instituteName, "Test Pairing International School");
        assert.strictEqual(goodJson.kioskName, "Gate 1 North Tablet");
        console.log(`✓ Device paired: Key=${goodJson.kioskKey.slice(0, 12)}... Institute=${goodJson.instituteName}`);

        // [Case 3] Verify KioskDevice created in MongoDB
        const dbDevice = await KioskDevice.findOne({ keyPrefix: goodJson.kioskKey.slice(0, 12) });
        assert.ok(dbDevice, "KioskDevice must exist in database");
        assert.strictEqual(dbDevice.status, "ACTIVE");
        console.log("✓ KioskDevice verified in MongoDB collection");

        console.log("\n=========================================================");
        console.log("       ALL KIOSK PAIRING TESTS PASSED 100%!              ");
        console.log("=========================================================");
    } finally {
        // Cleanup test data
        await KioskDevice.deleteMany({ institute: testInst._id });
        await User.deleteMany({ institute: testInst._id });
        await Institute.findByIdAndDelete(testInst._id);
    }

    process.exit(0);
}

runPairTest().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
