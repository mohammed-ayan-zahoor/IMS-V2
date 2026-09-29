import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import StaffAttendance from "@/models/StaffAttendance";
import User from "@/models/User";
import HRSettings from "@/models/HRSettings";
import Institute from "@/models/Institute";
import { format } from "date-fns";

function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    // Handles "09:00", "09:00 AM", "06:00 PM"
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridian = match[3]?.toUpperCase();

    if (meridian === "PM" && hours < 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
}

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
                hrSettings = await HRSettings.findOne({ institute: inst._id }).lean();
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
            // Support text/plain payloads (e.g. from raw HTTP push or proxy)
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
            // Parse comma or tab separated lines: ID,TIMESTAMP
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
                    deviceId: p.deviceId || "Secureye-S-B100CB"
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
            }).populate("department", "name shiftTimings");

            if (!staff) {
                results.unmatched.push({
                    biometricId: punch.biometricId,
                    timestamp: punch.timestamp,
                    reason: "No staff member mapped with this Biometric ID"
                });
                continue;
            }

            results.matched++;

            // Effective Shift resolution
            const deptShift = staff.department?.shiftTimings;
            const hasCustomDeptShift = Boolean(deptShift?.useCustomShift);

            const shiftStart = hasCustomDeptShift ? (deptShift.shiftStart || "09:00") : (hrSettings?.shiftStart || "09:00");
            const shiftEnd = hasCustomDeptShift ? (deptShift.shiftEnd || "18:00") : (hrSettings?.shiftEnd || "18:00");
            const checkInGraceMins = hasCustomDeptShift ? (deptShift.checkInGraceMins ?? 15) : (hrSettings?.checkInGraceMins ?? 15);
            const checkOutGraceMins = hasCustomDeptShift ? (deptShift.checkOutGraceMins ?? 10) : (hrSettings?.checkOutGraceMins ?? 10);

            const punchTimeStr = format(punch.timestamp, "hh:mm a");
            const punchMinutes = punch.timestamp.getHours() * 60 + punch.timestamp.getMinutes();
            const shiftStartMinutes = parseTimeToMinutes(shiftStart);
            const shiftEndMinutes = parseTimeToMinutes(shiftEnd);

            const queryDate = new Date(punch.timestamp);
            queryDate.setHours(0, 0, 0, 0);

            // Check if record already exists for today
            let attendance = await StaffAttendance.findOne({
                institute: instituteId,
                staff: staff._id,
                date: queryDate
            });

            if (!attendance) {
                // First punch of the day: CHECK-IN
                let lateMinutes = 0;
                if (punchMinutes > (shiftStartMinutes + checkInGraceMins)) {
                    lateMinutes = punchMinutes - shiftStartMinutes;
                }

                attendance = await StaffAttendance.create({
                    institute: instituteId,
                    staff: staff._id,
                    date: queryDate,
                    status: "present",
                    checkInTime: punchTimeStr,
                    lateMinutes,
                    source: "biometric",
                    remarks: lateMinutes > 0 ? `Late check-in via Biometric (${lateMinutes}m)` : "Check-in via Biometric"
                });
                results.processed++;
            } else {
                // Subsequent punch: CHECK-OUT
                const lastTimeStr = attendance.checkOutTime || attendance.checkInTime;
                const lastMinutes = parseTimeToMinutes(lastTimeStr);

                // 1. Debounce rapid repeat taps (within 3 minutes of any previous punch)
                if (Math.abs(punchMinutes - lastMinutes) <= 3) {
                    results.processed++;
                    continue;
                }

                // 2. Prevent premature Check-Out:
                // If staff has checked in, but this subsequent punch happens within 30 minutes of check-in,
                // OR happens in the morning before shift midpoint (and less than 2 hours from check-in),
                // treat it as an arrival confirmation re-tap, NOT a check-out!
                const checkInMinutes = parseTimeToMinutes(attendance.checkInTime);
                const shiftMidpoint = Math.floor((shiftStartMinutes + shiftEndMinutes) / 2);
                const minutesSinceCheckIn = punchMinutes - checkInMinutes;

                if (!attendance.checkOutTime && (minutesSinceCheckIn < 30 || (punchMinutes < shiftMidpoint && minutesSinceCheckIn < 120))) {
                    // Confirmation re-tap during arrival/morning hours: keep check-in intact
                    results.processed++;
                    continue;
                }

                attendance.checkOutTime = punchTimeStr;
                attendance.status = "present";
                attendance.source = "biometric";

                // Calculate Early Departure
                if (punchMinutes < (shiftEndMinutes - checkOutGraceMins)) {
                    attendance.earlyDepartureMinutes = shiftEndMinutes - punchMinutes;
                } else {
                    attendance.earlyDepartureMinutes = 0;
                }

                // Calculate Overtime (if enabled)
                if (hrSettings?.overtimeEnabled && punchMinutes > shiftEndMinutes) {
                    const overtimeRaw = punchMinutes - shiftEndMinutes;
                    const buffer = hrSettings.overtimeBufferMins || 30;
                    if (overtimeRaw >= buffer) {
                        attendance.overtimeMinutes = overtimeRaw;
                    }
                }

                await attendance.save();
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
