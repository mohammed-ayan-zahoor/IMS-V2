/**
 * ZKTeco iClock Push Protocol Endpoint
 * ─────────────────────────────────────
 * ZKTeco/eSSL devices (ADMS mode) push punch logs to:
 *   POST /iclock/cdata?SN=<device_serial>&table=ATTLOG
 *
 * Body is plain text, one punch per line:
 *   <UserId>\t<DateTime>\t<VerifyState>\t<InOutState>\t...\n
 *   e.g. 101\t2024-09-28 09:05:33\t1\t0
 *
 * The device identifies itself by serial number (SN).
 * We resolve the institute by matching SN against HRSettings.biometricDeviceSerial,
 * OR we accept any registered API key passed as ?apiKey= query param.
 *
 * Device configuration (on device menu):
 *   Comm → Cloud Server Settings
 *     Server Address : imsportal.3ftech.in
 *     Server Port    : 443
 *     HTTPS          : ON
 *     (No path needed — device appends /iclock/cdata automatically)
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import StaffAttendance from "@/models/StaffAttendance";
import User from "@/models/User";
import HRSettings from "@/models/HRSettings";
import { format } from "date-fns";

function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridian = match[3]?.toUpperCase();
    if (meridian === "PM" && hours < 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

// The device sends GET /iclock/cdata?SN=xxx first to "handshake"
export async function GET(req) {
    // Respond with the handshake the device expects
    // Device checks for "GET OPTION FROM:" response
    return new Response(
        "GET OPTION FROM: ServerVersion=2.4.1 Compatible\nATT_LOG_ENCRYPT=None\nOPERLOG_ENCRYPT=None\nEXTENDFMT=0\n",
        {
            status: 200,
            headers: { "Content-Type": "text/plain" }
        }
    );
}

export async function POST(req) {
    try {
        const { searchParams } = new URL(req.url);
        const deviceSerial = searchParams.get("SN") || "";
        const table = searchParams.get("table") || "";
        const apiKey = searchParams.get("apiKey") ||
                       req.headers.get("x-biometric-key") ||
                       req.headers.get("authorization")?.replace("Bearer ", "");

        // Only handle attendance log pushes
        if (table !== "ATTLOG") {
            return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
        }

        await connectDB();

        // Resolve institute: by apiKey header OR by device serial number
        let instituteId = null;
        let hrSettings = null;

        if (apiKey) {
            hrSettings = await HRSettings.findOne({ biometricApiKey: apiKey.trim() }).lean();
            if (hrSettings) instituteId = hrSettings.institute;
        }

        if (!instituteId && deviceSerial) {
            hrSettings = await HRSettings.findOne({ biometricDeviceSerial: deviceSerial }).lean();
            if (hrSettings) instituteId = hrSettings.institute;
        }

        if (!instituteId) {
            // Unknown device — return OK so device doesn't keep retrying,
            // but log it. Admin needs to register the device serial in HR Settings.
            console.warn(`[iClock] Unrecognized device SN: ${deviceSerial}, apiKey: ${apiKey}`);
            return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
        }

        // Parse the ATTLOG body — tab-separated, one punch per line
        // Format: UserId\tDateTime\tVerifyState\tInOutState\tWorkCode\tReserved
        const body = await req.text();
        const lines = body.trim().split(/\r?\n/).filter(Boolean);

        const punches = lines.map(line => {
            const parts = line.split("\t");
            const userId = parts[0]?.trim();
            const rawTime = parts[1]?.trim();   // "2024-09-28 09:05:33"
            if (!userId || !rawTime) return null;
            const timestamp = new Date(rawTime.replace(" ", "T"));
            return isNaN(timestamp.getTime()) ? null : { biometricId: userId, timestamp };
        }).filter(Boolean);

        if (!punches.length) {
            return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
        }

        // Process each punch — same logic as the JSON webhook
        for (const punch of punches) {
            const staff = await User.findOne({
                institute: instituteId,
                "hrDetails.biometricId": punch.biometricId,
                deletedAt: null
            }).populate("department", "name shiftTimings");

            if (!staff) continue;

            const deptShift = staff.department?.shiftTimings;
            const hasCustom = Boolean(deptShift?.useCustomShift);
            const shiftStart = hasCustom ? (deptShift.shiftStart || "09:00") : (hrSettings?.shiftStart || "09:00");
            const shiftEnd   = hasCustom ? (deptShift.shiftEnd   || "18:00") : (hrSettings?.shiftEnd   || "18:00");
            const checkInGrace  = hasCustom ? (deptShift.checkInGraceMins  ?? 15) : (hrSettings?.checkInGraceMins  ?? 15);
            const checkOutGrace = hasCustom ? (deptShift.checkOutGraceMins ?? 10) : (hrSettings?.checkOutGraceMins ?? 10);

            const punchTimeStr  = format(punch.timestamp, "hh:mm a");
            const punchMins     = punch.timestamp.getHours() * 60 + punch.timestamp.getMinutes();
            const shiftStartMins = parseTimeToMinutes(shiftStart);
            const shiftEndMins   = parseTimeToMinutes(shiftEnd);

            const queryDate = new Date(punch.timestamp);
            queryDate.setHours(0, 0, 0, 0);

            let attendance = await StaffAttendance.findOne({
                institute: instituteId,
                staff: staff._id,
                date: queryDate
            });

            if (!attendance) {
                // First punch = check-in
                let lateMinutes = 0;
                if (punchMins > shiftStartMins + checkInGrace) {
                    lateMinutes = punchMins - shiftStartMins;
                }
                await StaffAttendance.create({
                    institute: instituteId,
                    staff: staff._id,
                    date: queryDate,
                    status: "present",
                    checkInTime: punchTimeStr,
                    lateMinutes,
                    source: "biometric",
                    remarks: lateMinutes > 0 ? `Late check-in via Device (${lateMinutes}m)` : "Check-in via Device"
                });
            } else {
                // Subsequent punch = check-out
                const lastMins = parseTimeToMinutes(attendance.checkOutTime || attendance.checkInTime);
                if (Math.abs(punchMins - lastMins) <= 3) continue;

                // Prevent premature check-out during morning arrival window
                const checkInMinutes = parseTimeToMinutes(attendance.checkInTime);
                const shiftMidpoint = Math.floor((shiftStartMins + shiftEndMins) / 2);
                const minutesSinceCheckIn = punchMins - checkInMinutes;

                if (!attendance.checkOutTime && (minutesSinceCheckIn < 30 || (punchMins < shiftMidpoint && minutesSinceCheckIn < 120))) {
                    continue;
                }

                attendance.checkOutTime = punchTimeStr;
                attendance.source = "biometric";

                if (punchMins < shiftEndMins - checkOutGrace) {
                    attendance.earlyDepartureMinutes = shiftEndMins - punchMins;
                } else {
                    attendance.earlyDepartureMinutes = 0;
                }

                if (hrSettings?.overtimeEnabled && punchMins > shiftEndMins) {
                    const raw = punchMins - shiftEndMins;
                    const buffer = hrSettings.overtimeBufferMins || 30;
                    attendance.overtimeMinutes = raw >= buffer ? raw : 0;
                }

                await attendance.save();
            }
        }

        // Device expects plain-text "OK" response
        return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });

    } catch (error) {
        console.error("[iClock] Error:", error);
        // Still return OK — device will retry endlessly otherwise
        return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }
}
