import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import StaffAttendance from "@/models/StaffAttendance";
import User from "@/models/User";
import HRSettings from "@/models/HRSettings";
import Department from "@/models/Department";
import * as XLSX from "xlsx";
import { parse, isValid, format } from "date-fns";

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

function normalizeName(name) {
    if (!name) return "";
    return String(name).toLowerCase()
        .replace(/\b(dr|mr|mrs|prof|miss|ms)\b/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

// ponytail: Parses ONtime / Secureye attendance reports directly from PDF in runtime.
// Uses colon coordinate offsets to accurately bind in/out times to calendar days (1-31).
async function parsePdfAttendance(buffer) {
    if (!global.DOMMatrix) {
        global.DOMMatrix = class DOMMatrix {
            constructor() {
                this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
            }
        };
    }

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;

    let detectedMonth = null;
    let detectedYear = null;
    const monthNames = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const employeeMap = new Map();

    for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        const items = content.items.map(it => ({ x: it.transform[4], y: it.transform[5], str: it.str }));

        if (p === 1) {
            const fullText = items.map(it => it.str).join(" ");
            const pMatch = fullText.match(/To\s+(\d{1,2})\s*[\-\/]\s*([a-z]{3}|\d{1,2})\s*[\-\/]\s*(\d{4})/i) ||
                           fullText.match(/(\d{1,2})\s*[\-\/]\s*([a-z]{3}|\d{1,2})\s*[\-\/]\s*(\d{4})/i);
            if (pMatch) {
                const rawM = pMatch[2].toLowerCase();
                detectedMonth = monthNames[rawM] || parseInt(rawM, 10);
                detectedYear = parseInt(pMatch[3], 10);
            }
        }

        const day1Item = items.find(it => Math.abs(it.y - 529) < 5 && it.str.trim() === "1");
        const day1X = day1Item ? day1Item.x : 108.7;

        const empCodeItems = items
            .filter(it => it.x < 45 && it.y < 525 && /^\d{4,5}$/.test(it.str.trim()))
            .sort((a, b) => b.y - a.y);

        empCodeItems.forEach(empItem => {
            const empCode = empItem.str.trim();
            const empY = empItem.y;

            const nameItems = items.filter(it => it.x >= 45 && it.x < 100 && Math.abs(it.y - empY) < 10);
            nameItems.sort((a, b) => b.y - a.y || a.x - b.x);
            const empName = nameItems.map(it => it.str.trim()).filter(Boolean).join(" ");

            const empItems = items.filter(it => it.x >= 100 && it.y >= empY - 12 && it.y <= empY + 6);

            const days = {};
            for (let d = 1; d <= 31; d++) days[d] = { in: "", out: "", code: "" };

            const colons = empItems.filter(it => it.str.includes(":"));
            colons.forEach(colItem => {
                const dayNum = Math.round((colItem.x - day1X) / 21) + 1;
                if (dayNum >= 1 && dayNum <= 31) {
                    const isTop = colItem.y >= empY - 3;
                    const sameLineItems = empItems.filter(it => Math.abs(it.y - colItem.y) < 2);
                    sameLineItems.sort((a, b) => a.x - b.x);
                    
                    const nearby = sameLineItems.filter(it => Math.abs(it.x - colItem.x) < 18);
                    const localStr = nearby.map(it => it.str).join("").replace(/\s+/g, "");
                    const timeMatch = localStr.match(/(\d{1,2}):(\d{2})/);
                    if (timeMatch) {
                        const timeStr = `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
                        if (isTop) {
                            days[dayNum].in = timeStr;
                        } else {
                            days[dayNum].out = timeStr;
                        }
                    }
                }
            });

            const codeCandidates = empItems.filter(it => /WO|MIS|\bA\b|\bP\b/i.test(it.str));
            codeCandidates.forEach(cand => {
                const dayNum = Math.round((cand.x - day1X) / 21) + 1;
                if (dayNum >= 1 && dayNum <= 31 && !days[dayNum].in && !days[dayNum].out) {
                    const c = cand.str.trim();
                    if (/WO/i.test(c)) days[dayNum].code = "WO-I";
                    else if (/MIS/i.test(c)) days[dayNum].code = "MIS";
                    else if (c === "A") days[dayNum].code = "A";
                    else if (c === "P") days[dayNum].code = "P";
                }
            });

            employeeMap.set(empCode, { empCode, empName, days });
        });
    }

    const rows = [];
    rows.push(["Monthly Attendance Report with (In\\Out) Time", `For Period : 01/${detectedMonth || 8}/${detectedYear || 2026} To 31/${detectedMonth || 8}/${detectedYear || 2026}`]);
    rows.push([""]);
    rows.push([""]);
    const headerRow = ["Emp Code", "", "Emp Name", ""];
    for (let d = 1; d <= 31; d++) headerRow.push(String(d));
    rows.push(headerRow);

    for (const emp of employeeMap.values()) {
        const row = [emp.empCode, "", emp.empName, ""];
        for (let d = 1; d <= 31; d++) {
            const entry = emp.days[d];
            if (entry.in && entry.out) {
                row.push(`${entry.in}\n${entry.out}`);
            } else if (entry.in) {
                row.push(entry.in);
            } else if (entry.out) {
                row.push(entry.out);
            } else if (entry.code) {
                row.push(entry.code);
            } else {
                row.push("");
            }
        }
        rows.push(row);
    }

    return { rows, detectedYear, detectedMonth };
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute not found" }, { status: 400 });
        }

        const formData = await req.formData();
        const file = formData.get("file");

        if (!file || typeof file === "string") {
            return NextResponse.json({ error: "Please upload a valid file (.xlsx, .xls, or .pdf)." }, { status: 400 });
        }

        const fileName = (file.name || "").toLowerCase();
        const isPdf = fileName.endsWith(".pdf") || file.type === "application/pdf";
        const buffer = Buffer.from(await file.arrayBuffer());

        let rows = [];
        let pdfDetectedYear = null;
        let pdfDetectedMonth = null;

        if (isPdf) {
            const pdfData = await parsePdfAttendance(buffer);
            rows = pdfData.rows;
            pdfDetectedYear = pdfData.detectedYear;
            pdfDetectedMonth = pdfData.detectedMonth;
        } else {
            const workbook = XLSX.read(buffer, { type: "buffer" });
            const firstSheetName = workbook.SheetNames[0];
            if (!firstSheetName) {
                return NextResponse.json({ error: "Uploaded workbook contains no sheets." }, { status: 400 });
            }

            const worksheet = workbook.Sheets[firstSheetName];
            // Read sheet rows as raw 2D array
            rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        }

        if (!rows || rows.length < 3) {
            return NextResponse.json({ error: "Uploaded file has insufficient data." }, { status: 400 });
        }

        await connectDB();

        // 1. Detect Year and Month from file headers or query params
        let detectedYear = pdfDetectedYear || null;
        let detectedMonth = pdfDetectedMonth || null; // 1-12

        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const line = rows[i].join(" ");
            // Match "For Period : 01/08/2026 To 31/08/2026" or "01-08-2026 To 31-08-2026"
            const periodMatch = line.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            if (periodMatch) {
                detectedMonth = parseInt(periodMatch[2], 10);
                detectedYear = parseInt(periodMatch[3], 10);
                break;
            }
        }

        // Fallbacks if not auto-detected from text
        if (!detectedYear || !detectedMonth) {
            const now = new Date();
            detectedYear = parseInt(formData.get("year") || String(now.getFullYear()), 10);
            detectedMonth = parseInt(formData.get("month") || String(now.getMonth() + 1), 10);
        }

        // 2. Fetch Institute Staff & HR Settings
        const [staffMembers, hrSettings] = await Promise.all([
            User.find({
                institute: instituteId,
                role: { $in: ['admin', 'instructor', 'staff'] },
                deletedAt: null
            }).populate("department", "name shiftTimings"),
            HRSettings.findOne({ institute: instituteId }).lean()
        ]);

        // Build Staff Lookup maps
        const byBiometricId = new Map();
        const byName = new Map();

        staffMembers.forEach(s => {
            const bId = s.hrDetails?.biometricId;
            if (bId) {
                const raw = String(bId).trim();
                const stripped = raw.replace(/^0+/, "");
                byBiometricId.set(raw, s);
                byBiometricId.set(stripped, s);
                // Also pad to 4 digits (e.g. 0058)
                byBiometricId.set(stripped.padStart(4, "0"), s);
            }

            const fullName = `${s.profile?.firstName || ""} ${s.profile?.lastName || ""}`.trim();
            if (fullName) {
                byName.set(normalizeName(fullName), s);
            }
        });

        // 3. Find table column positions
        // Look for the row containing "Emp Code" or "EmpCode" or "Code"
        let headerRowIndex = -1;
        let empCodeCol = 0;
        let empNameCol = 1;
        const dayCols = []; // array of { colIndex, dayNumber }

        for (let r = 0; r < Math.min(rows.length, 15); r++) {
            const row = rows[r];
            for (let c = 0; c < row.length; c++) {
                const val = String(row[c]).toLowerCase().replace(/[^a-z0-9]/g, "");
                if (val.includes("empcode") || val === "code") {
                    headerRowIndex = r;
                    empCodeCol = c;
                    break;
                }
            }
            if (headerRowIndex !== -1) break;
        }

        if (headerRowIndex === -1) {
            // Default to row index 4 (standard OnTime format)
            headerRowIndex = 4;
            empCodeCol = 0;
            empNameCol = 1;
        } else {
            // Determine empName column (usually right next to empCode)
            for (let c = empCodeCol + 1; c < rows[headerRowIndex].length; c++) {
                const val = String(rows[headerRowIndex][c]).toLowerCase();
                if (val.includes("name")) {
                    empNameCol = c;
                    break;
                }
            }
        }

        // Map day columns (1, 2, 3 ... 31)
        const headerRow = rows[headerRowIndex] || [];
        for (let c = 0; c < headerRow.length; c++) {
            const cellVal = String(headerRow[c]).trim();
            const dayNum = parseInt(cellVal, 10);
            if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
                dayCols.push({ colIndex: c, dayNumber: dayNum });
            }
        }

        if (dayCols.length === 0) {
            // If day numbers weren't in header row, infer sequential days starting after empName
            const daysInMonth = new Date(detectedYear, detectedMonth, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                dayCols.push({ colIndex: empNameCol + d, dayNumber: d });
            }
        }

        // 4. Parse Employee Rows
        const bulkOperations = [];
        const matchedStaffIds = new Set();
        const unmatchedList = [];
        let totalPunchesImported = 0;

        for (let r = headerRowIndex + 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.length === 0) continue;

            const rawCode = String(row[empCodeCol] || "").trim();
            const rawName = String(row[empNameCol] || "").trim();

            // Skip page break headers or summaries
            if (!rawCode || rawCode.toLowerCase().includes("company") || rawCode.toLowerCase().includes("location") || rawCode.toLowerCase().includes("emp")) {
                continue;
            }

            // Match staff member
            let staff = byBiometricId.get(rawCode) || byBiometricId.get(rawCode.replace(/^0+/, ""));
            if (!staff && rawName) {
                staff = byName.get(normalizeName(rawName));
            }

            if (!staff) {
                unmatchedList.push({ code: rawCode, name: rawName });
                continue;
            }

            matchedStaffIds.add(staff._id.toString());

            // Resolve effective shift timings
            const deptShift = staff.department?.shiftTimings;
            const hasCustomDeptShift = Boolean(deptShift?.useCustomShift);
            const shiftStart = hasCustomDeptShift ? (deptShift.shiftStart || "09:00") : (hrSettings?.shiftStart || "09:00");
            const shiftEnd = hasCustomDeptShift ? (deptShift.shiftEnd || "18:00") : (hrSettings?.shiftEnd || "18:00");
            const checkInGraceMins = hasCustomDeptShift ? (deptShift.checkInGraceMins ?? 15) : (hrSettings?.checkInGraceMins ?? 15);
            const checkOutGraceMins = hasCustomDeptShift ? (deptShift.checkOutGraceMins ?? 10) : (hrSettings?.checkOutGraceMins ?? 10);

            const shiftStartMins = parseTimeToMinutes(shiftStart);
            const shiftEndMins = parseTimeToMinutes(shiftEnd);

            // Process each day in this row
            for (const { colIndex, dayNumber } of dayCols) {
                if (colIndex >= row.length) continue;
                const cellRaw = String(row[colIndex] || "").trim();
                if (!cellRaw) continue;

                // Build query date
                const dateObj = new Date(detectedYear, detectedMonth - 1, dayNumber);
                if (isNaN(dateObj.getTime()) || dateObj.getMonth() !== (detectedMonth - 1)) {
                    continue; // invalid day for this month (e.g. Feb 30)
                }
                dateObj.setHours(0, 0, 0, 0);

                let status = "present";
                let checkInTime = "";
                let checkOutTime = "";
                let lateMinutes = 0;
                let earlyDepartureMinutes = 0;
                let overtimeMinutes = 0;
                let remarks = "Imported from Biometric Excel (ONtime)";

                const upperCell = cellRaw.toUpperCase();

                // Case 1: Standard Summary Codes (P, A, WO-I, MIS, HL)
                if (upperCell === "P") {
                    status = "present";
                } else if (upperCell === "A") {
                    status = "absent";
                } else if (upperCell.includes("WO") || upperCell.includes("W/O")) {
                    status = "holiday";
                    remarks = "Week Off";
                } else if (upperCell === "MIS") {
                    status = "half_day";
                    remarks = "Biometric Missed Punch (MIS)";
                } else if (upperCell === "HL" || upperCell === "HD") {
                    status = "half_day";
                } else if (["CL", "EL", "SL", "L", "LV"].includes(upperCell)) {
                    status = "on_leave";
                } else {
                    // Case 2: In/Out Times (e.g. "09:31\n15:07" or "09:31" or "09:31 15:07")
                    const timeMatches = cellRaw.match(/\b\d{1,2}:\d{2}\b/g);
                    if (timeMatches && timeMatches.length > 0) {
                        status = "present";
                        checkInTime = timeMatches[0];
                        if (timeMatches.length > 1) {
                            checkOutTime = timeMatches[1];
                        }

                        const inMins = parseTimeToMinutes(checkInTime);
                        if (inMins > (shiftStartMins + checkInGraceMins)) {
                            lateMinutes = inMins - shiftStartMins;
                        }

                        if (checkOutTime) {
                            const outMins = parseTimeToMinutes(checkOutTime);
                            if (outMins < (shiftEndMins - checkOutGraceMins)) {
                                earlyDepartureMinutes = shiftEndMins - outMins;
                            }
                            if (hrSettings?.overtimeEnabled && outMins > shiftEndMins) {
                                const rawOt = outMins - shiftEndMins;
                                const buffer = hrSettings.overtimeBufferMins || 30;
                                overtimeMinutes = rawOt >= buffer ? rawOt : 0;
                            }
                        }

                        remarks = `Biometric In: ${checkInTime}${checkOutTime ? ` Out: ${checkOutTime}` : ""}`;
                    } else {
                        // Unknown text - default to present if non-empty
                        status = "present";
                    }
                }

                bulkOperations.push({
                    updateOne: {
                        filter: {
                            institute: instituteId,
                            staff: staff._id,
                            date: dateObj
                        },
                        update: {
                            $set: {
                                status,
                                checkInTime,
                                checkOutTime,
                                lateMinutes,
                                earlyDepartureMinutes,
                                overtimeMinutes,
                                remarks,
                                source: "biometric"
                            }
                        },
                        upsert: true
                    }
                });

                totalPunchesImported++;
            }
        }

        if (bulkOperations.length > 0) {
            await StaffAttendance.bulkWrite(bulkOperations);
        }

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const periodLabel = `${monthNames[detectedMonth - 1]} ${detectedYear}`;

        return NextResponse.json({
            success: true,
            period: periodLabel,
            matchedStaffCount: matchedStaffIds.size,
            totalRecordsImported: totalPunchesImported,
            unmatchedCount: unmatchedList.length,
            unmatchedStaff: unmatchedList.slice(0, 20)
        });

    } catch (error) {
        console.error("Biometric Excel Import Error:", error);
        return NextResponse.json({ error: "Failed to process Excel file: " + error.message }, { status: 500 });
    }
}
