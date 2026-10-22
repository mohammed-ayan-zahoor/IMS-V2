import { connectDB } from "../mongodb.js";
import StaffAttendance from "../../models/StaffAttendance.js";
import User from "../../models/User.js";
import HRSettings from "../../models/HRSettings.js";

/**
 * Parses time string like "09:00", "09:00 AM", "06:00 PM" into total minutes from midnight.
 * @param {string} timeStr
 * @returns {number}
 */
export function parseTimeToMinutes(timeStr) {
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

/**
 * Resolves a Date or ISO string into exact Indian Standard Time (IST) calendar parts.
 * Prevents UTC vs IST calendar day and hour shifts across VPS servers.
 * @param {Date|string} dateInput
 * @returns {{ istDateObj: Date, istDateStr: string, istTimeStr: string, punchMinutes: number }}
 */
export function getISTDateTime(dateInput) {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) {
        throw new Error("Invalid date input provided to getISTDateTime");
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });

    const parts = formatter.formatToParts(d);
    const map = {};
    for (const p of parts) {
        map[p.type] = p.value;
    }

    const istDateStr = `${map.year}-${map.month}-${map.day}`;
    // Midnight Date object anchored in IST (+05:30)
    const istDateObj = new Date(`${istDateStr}T00:00:00.000+05:30`);

    const hour24 = parseInt(map.hour, 10);
    const minute = parseInt(map.minute, 10);
    const punchMinutes = hour24 * 60 + minute;

    const hour12 = hour24 % 12 || 12;
    const ampm = hour24 >= 12 ? "PM" : "AM";
    const istTimeStr = `${String(hour12).padStart(2, "0")}:${map.minute} ${ampm}`;

    return { istDateObj, istDateStr, istTimeStr, punchMinutes };
}

/**
 * Single Unified Attendance Punch Processor for IMS-V2.
 * Handles:
 *  - Timezone safety (IST calendar day & minute calculations)
 *  - Shift resolution (Department-level override vs Institute HRSettings fallback)
 *  - Debounce (3-minute rapid repeat tap prevention)
 *  - Arrival re-tap guard (30-minute confirmation protection)
 *  - Late, Early Departure & Overtime calculations
 *  - Device idempotency via punchId
 *  - Audit metrics (faceMatchDistance, snapshotRef)
 *
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.instituteId
 * @param {string|mongoose.Types.ObjectId} params.staffId
 * @param {Date|string} [params.timestamp]
 * @param {string} [params.source="face_scan"] - "face_scan" | "biometric" | "manual"
 * @param {string} [params.punchId] - Optional idempotency key from kiosk/device
 * @param {number} [params.faceMatchDistance]
 * @param {string} [params.snapshotRef]
 * @param {string} [params.forceAction] - Optional "IN" | "OUT" manual override
 * @param {string} [params.remarks]
 * @param {boolean} [params.dryRun=false]
 * @returns {Promise<Object>}
 */
export async function recordPunch({
    instituteId,
    staffId,
    timestamp = new Date(),
    source = "face_scan",
    punchId = null,
    faceMatchDistance = null,
    snapshotRef = null,
    forceAction = null,
    remarks = null,
    dryRun = false
}) {
    if (!instituteId || !staffId) {
        throw new Error("Both instituteId and staffId are required for recordPunch");
    }

    await connectDB();

    const punchDate = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const { istDateObj, istDateStr, istTimeStr, punchMinutes } = getISTDateTime(punchDate);

    // 1. Fetch Staff Member with department shift timings
    const staff = await User.findOne({
        _id: staffId,
        institute: instituteId,
        deletedAt: null
    }).populate("department", "name shiftTimings");

    if (!staff) {
        throw new Error("Staff member not found or inactive in this institute");
    }

    // 2. Fetch HR Settings for fallback shift timings
    const hrSettings = await HRSettings.findOne({ institute: instituteId }).lean();

    // 3. Resolve Effective Shift Timings (Department override wins over Institute default)
    const deptShift = staff.department?.shiftTimings;
    const hasCustomDeptShift = Boolean(deptShift?.useCustomShift);

    const shiftStart = hasCustomDeptShift ? (deptShift.shiftStart || "09:00") : (hrSettings?.shiftStart || "09:00");
    const shiftEnd = hasCustomDeptShift ? (deptShift.shiftEnd || "18:00") : (hrSettings?.shiftEnd || "18:00");
    const checkInGraceMins = hasCustomDeptShift ? (deptShift.checkInGraceMins ?? 15) : (hrSettings?.checkInGraceMins ?? 15);
    const checkOutGraceMins = hasCustomDeptShift ? (deptShift.checkOutGraceMins ?? 10) : (hrSettings?.checkOutGraceMins ?? 10);

    const shiftStartMinutes = parseTimeToMinutes(shiftStart);
    const shiftEndMinutes = parseTimeToMinutes(shiftEnd);
    const shiftMidpoint = Math.floor((shiftStartMinutes + shiftEndMinutes) / 2);

    // 4. Query existing attendance record for today (anchored in IST midnight)
    let attendance = await StaffAttendance.findOne({
        institute: instituteId,
        staff: staffId,
        date: istDateObj
    });

    // 5. Idempotency Check: if punchId already registered, return previous state
    if (attendance && punchId && attendance.punchIds?.includes(punchId)) {
        return {
            action: "IDEMPOTENT_REPEAT",
            message: `Punch ${punchId} already processed`,
            attendance,
            time: attendance.checkOutTime || attendance.checkInTime,
            punchType: attendance.checkOutTime ? "OUT" : "IN",
            date: istDateStr
        };
    }

    // 6. Punch Resolution Logic
    if (!attendance || (forceAction === "IN" && !attendance.checkInTime)) {
        // --- FIRST PUNCH OF THE DAY: CHECK-IN ---
        let lateMinutes = 0;
        if (punchMinutes > (shiftStartMinutes + checkInGraceMins)) {
            lateMinutes = punchMinutes - shiftStartMinutes;
        }

        const initialRemarks = remarks || (lateMinutes > 0 ? `Late check-in via ${source} (${lateMinutes}m)` : `Check-in via ${source}`);

        const recordData = {
            institute: instituteId,
            staff: staffId,
            date: istDateObj,
            status: "present",
            checkInTime: istTimeStr,
            checkInAt: punchDate,
            lastPunchAt: punchDate,
            lateMinutes,
            source,
            faceMatchDistance: faceMatchDistance ?? undefined,
            snapshotRef: snapshotRef ?? undefined,
            remarks: initialRemarks,
            punchIds: punchId ? [punchId] : []
        };

        let savedRecord = recordData;
        if (!dryRun) {
            savedRecord = await StaffAttendance.findOneAndUpdate(
                { institute: instituteId, staff: staffId, date: istDateObj },
                { $set: recordData },
                { returnDocument: "after", upsert: true }
            );
        }

        return {
            action: "IN",
            message: `Clock-in recorded at ${istTimeStr}`,
            attendance: savedRecord,
            punchType: "IN",
            time: istTimeStr,
            date: istDateStr,
            lateMinutes,
            earlyDepartureMinutes: 0,
            overtimeMinutes: 0
        };
    } else {
        // --- SUBSEQUENT PUNCH: CHECK-OUT OR DEBOUNCE/RETAP ---
        const lastPunchTime = attendance.lastPunchAt || attendance.checkOutAt || attendance.checkInAt;
        const lastMinutes = parseTimeToMinutes(attendance.checkOutTime || attendance.checkInTime);

        // A. Debounce: Ignore rapid repeat taps within 3 minutes
        const timeDiffSeconds = lastPunchTime ? Math.abs((punchDate.getTime() - new Date(lastPunchTime).getTime()) / 1000) : 999;
        const minutesDiff = Math.abs(punchMinutes - lastMinutes);

        if (timeDiffSeconds < 180 || minutesDiff <= 3) {
            return {
                action: "IGNORED_DUPLICATE",
                message: "Repeat scan ignored (within 3 minutes)",
                attendance,
                punchType: attendance.checkOutTime ? "OUT" : "IN",
                time: istTimeStr,
                date: istDateStr
            };
        }

        // B. Morning Arrival Re-tap Guard (Unless explicitly forced OUT):
        // If staff has checked in, but scans within 30 minutes of check-in, OR before shift midpoint and < 2h from check-in:
        // Treat as arrival confirmation re-tap, keeping check-in intact!
        const checkInMinutes = parseTimeToMinutes(attendance.checkInTime);
        const minutesSinceCheckIn = punchMinutes - checkInMinutes;

        if (forceAction !== "OUT" && !attendance.checkOutTime && (minutesSinceCheckIn < 30 || (punchMinutes < shiftMidpoint && minutesSinceCheckIn < 120))) {
            return {
                action: "ARRIVAL_RETAP",
                message: `Arrival already confirmed at ${attendance.checkInTime}`,
                attendance,
                punchType: "IN",
                time: istTimeStr,
                date: istDateStr
            };
        }

        // C. Record / Update CHECK-OUT
        let earlyDepartureMinutes = 0;
        if (punchMinutes < (shiftEndMinutes - checkOutGraceMins)) {
            earlyDepartureMinutes = shiftEndMinutes - punchMinutes;
        }

        let overtimeMinutes = 0;
        if (hrSettings?.overtimeEnabled && punchMinutes > shiftEndMinutes) {
            const overtimeRaw = punchMinutes - shiftEndMinutes;
            const buffer = hrSettings.overtimeBufferMins ?? 30;
            if (overtimeRaw >= buffer) {
                overtimeMinutes = overtimeRaw;
            }
        }

        const outRemarks = remarks || [
            `Check-out via ${source}`,
            earlyDepartureMinutes > 0 ? `(Early: ${earlyDepartureMinutes}m)` : "",
            overtimeMinutes > 0 ? `(OT: ${overtimeMinutes}m)` : ""
        ].filter(Boolean).join(" ");

        const updateFields = {
            checkOutTime: istTimeStr,
            checkOutAt: punchDate,
            lastPunchAt: punchDate,
            earlyDepartureMinutes,
            overtimeMinutes,
            remarks: outRemarks
        };

        if (faceMatchDistance != null) updateFields.faceMatchDistance = faceMatchDistance;
        if (snapshotRef) updateFields.snapshotRef = snapshotRef;

        let updatedRecord = { ...attendance.toObject?.() || attendance, ...updateFields };
        if (!dryRun) {
            const updateOp = { $set: updateFields };
            if (punchId) {
                updateOp.$addToSet = { punchIds: punchId };
            }
            updatedRecord = await StaffAttendance.findByIdAndUpdate(attendance._id, updateOp, { returnDocument: "after" });
        }

        return {
            action: "OUT",
            message: `Clock-out recorded at ${istTimeStr}`,
            attendance: updatedRecord,
            punchType: "OUT",
            time: istTimeStr,
            date: istDateStr,
            lateMinutes: attendance.lateMinutes || 0,
            earlyDepartureMinutes,
            overtimeMinutes
        };
    }
}
