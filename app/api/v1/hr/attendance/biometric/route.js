import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import HRSettings from "@/models/HRSettings";
import Institute from "@/models/Institute";
import { recordPunch } from "@/lib/attendance/recordPunch";

export async function GET(req) {
    return NextResponse.json({
        service: "IMS-V2 Biometric Attendance Webhook",
        status: "active",
        timestamp: new Date().toISOString()
    });
}

export async function POST(req) {
    try {
        const apiKey = req.headers.get("x-biometric-key") ||
                       req.headers.get("authorization")?.replace("Bearer ", "") ||
                       new URL(req.url).searchParams.get("apiKey");

        if (!apiKey) {
            return NextResponse.json({ error: "Missing x-biometric-key header" }, { status: 401 });
        }

        await connectDB();

        // 1. Resolve Institute via HRSettings or Institute attendance settings
        let instituteId = null;
        let hrSettings = await HRSettings.findOne({ biometricApiKey: apiKey.trim() }).lean();

        if (hrSettings) {
            instituteId = hrSettings.institute;
        } else {
            const inst = await Institute.findOne({ "settings.attendance.biometricApiKey": apiKey.trim() }).lean();
            if (inst) {
                instituteId = inst._id;
            }
        }

        if (!instituteId) {
            return NextResponse.json({ error: "Invalid biometric API key" }, { status: 401 });
        }

        // 2. Parse request payload
        let rawBody;
        const contentType = req.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            rawBody = await req.json();
        } else {
            const text = await req.text();
            try {
                rawBody = JSON.parse(text);
            } catch {
                rawBody = { text };
            }
        }

        // Normalize punches array
        let rawPunches = [];
        if (Array.isArray(rawBody)) {
            rawPunches = rawBody;
        } else if (Array.isArray(rawBody.punches)) {
            rawPunches = rawBody.punches;
        } else if (rawBody.biometricId) {
            rawPunches = [rawBody];
        } else if (rawBody.text) {
            const lines = rawBody.text.split(/\r?\n/).filter(Boolean);
            rawPunches = lines.map(line => {
                const parts = line.split(/[,\t]/);
                return { biometricId: parts[0]?.trim(), timestamp: parts[1]?.trim() };
            });
        }

        if (!rawPunches.length) {
            return NextResponse.json({ error: "No punch data found in request" }, { status: 400 });
        }

        // Sort punches chronologically
        const punches = rawPunches
            .filter(p => p && p.biometricId)
            .map(p => {
                const d = p.timestamp ? new Date(p.timestamp) : new Date();
                return {
                    biometricId: String(p.biometricId).trim(),
                    timestamp: isNaN(d.getTime()) ? new Date() : d,
                    deviceId: p.deviceId || "Biometric-Device"
                };
            })
            .sort((a, b) => a.timestamp - b.timestamp);

        const results = {
            total: punches.length,
            processed: 0,
            matched: 0,
            unmatched: []
        };

        for (const punch of punches) {
            // Find staff member in this institute with matching biometricId
            const staff = await User.findOne({
                institute: instituteId,
                "hrDetails.biometricId": punch.biometricId,
                deletedAt: null
            }).select("_id");

            if (!staff) {
                results.unmatched.push({
                    biometricId: punch.biometricId,
                    timestamp: punch.timestamp,
                    reason: "No staff member mapped with this Biometric ID"
                });
                continue;
            }

            results.matched++;

            // Process punch through unified recordPunch processor
            const punchId = `${punch.biometricId}_${punch.timestamp.getTime()}`;
            const punchRes = await recordPunch({
                instituteId,
                staffId: staff._id,
                timestamp: punch.timestamp,
                source: "biometric",
                punchId
            });

            if (punchRes.action === "IN" || punchRes.action === "OUT") {
                results.processed++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${results.processed} biometric punch logs`,
            results
        });

    } catch (error) {
        console.error("Biometric webhook error:", error);
        return NextResponse.json({ error: "Internal server error processing punches" }, { status: 500 });
    }
}
