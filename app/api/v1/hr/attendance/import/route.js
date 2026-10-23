import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import StaffAttendance from "@/models/StaffAttendance";
import User from "@/models/User";
import HRSettings from "@/models/HRSettings";
import Payslip from "@/models/Payslip";
import { createAuditLog } from "@/services/auditService";
import {
    detectFileType,
    extractArchive,
    findBestAttendanceFile,
    parsePdfAttendance,
    parseTimeToMinutes,
    normalizeName
} from "@/lib/attendance/biometricParser";
import * as XLSX from "xlsx";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
        }

        const instituteId = session?.user?.institute?.id;
        if (!instituteId) {
            return NextResponse.json({ error: "Institute identifier not found in session" }, { status: 400 });
        }

        const formData = await req.formData();
        const file = formData.get("file");
        const overwriteManual = formData.get("overwriteManual") === "true";

        if (!file || typeof file === "string") {
            return NextResponse.json({ error: "Please upload a valid biometric file (.rar, .zip, .pdf, .xlsx, or .xls)." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        if (!buffer || buffer.length === 0) {
            return NextResponse.json({ error: "The uploaded file is empty (0 bytes)." }, { status: 400 });
        }

        // 1. Identify File Type via Magic Bytes
        const detectedType = detectFileType(buffer);
        let targetBuffer = buffer;
        let isPdf = false;
        let isExcel = false;
        let importNotice = null;

        if (detectedType === "rar" || detectedType === "zip") {
            // Extract archive in-memory
            let extractedFiles;
            try {
                extractedFiles = await extractArchive(buffer, detectedType);
            } catch (archiveErr) {
                return NextResponse.json({ error: archiveErr.message }, { status: 400 });
            }

            // Find best file inside archive (preferring In/Out PDF)
            let bestTarget;
            try {
                bestTarget = await findBestAttendanceFile(extractedFiles);
            } catch (findErr) {
                return NextResponse.json({ error: findErr.message }, { status: 400 });
            }

            targetBuffer = bestTarget.file.data;
            if (bestTarget.type === "excel_summary") {
                isExcel = true;
                importNotice = "Imported from summary Excel. Exact In/Out timestamps were not available in this report.";
            } else {
                isPdf = true;
            }
        } else if (detectedType === "pdf" || (file.name || "").toLowerCase().endsWith(".pdf")) {
            isPdf = true;
        } else if (detectedType === "xls" || (file.name || "").toLowerCase().endsWith(".xls") || (file.name || "").toLowerCase().endsWith(".xlsx")) {
            isExcel = true;
        } else {
            return NextResponse.json({
                error: "Unsupported file format. Please upload a .rar, .zip, .pdf, or Excel (.xlsx, .xls) file."
            }, { status: 400 });
        }

        await connectDB();

        let detectedYear = null;
        let detectedMonth = null;
        let parsedEmployees = [];

        // 2. Parse Attendance Data (PDF or Excel)
        if (isPdf) {
            try {
                const pdfResult = await parsePdfAttendance(targetBuffer);
                detectedYear = pdfResult.detectedYear;
                detectedMonth = pdfResult.detectedMonth;
                parsedEmployees = pdfResult.employees;
            } catch (pdfErr) {
                return NextResponse.json({ error: `Failed to parse PDF attendance: ${pdfErr.message}` }, { status: 400 });
            }
        } else {
            // Parse Excel
            try {
                const workbook = XLSX.read(targetBuffer, { type: "buffer" });
                const firstSheetName = workbook.SheetNames[0];
                if (!firstSheetName) {
                    return NextResponse.json({ error: "Uploaded Excel workbook contains no sheets." }, { status: 400 });
                }
                const worksheet = workbook.Sheets[firstSheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                // Detect month/year from header
                for (let i = 0; i < Math.min(rows.length, 10); i++) {
                    const line = rows[i].join(" ");
                    const periodMatch = line.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
                    if (periodMatch) {
                        detectedMonth = parseInt(periodMatch[2], 10);
                        detectedYear = parseInt(periodMatch[3], 10);
                        break;
                    }
                }

                // Detect employee header row
                let headerRowIdx = -1;
                let codeCol = 0;
                let nameCol = 2;
                for (let r = 0; r < Math.min(rows.length, 15); r++) {
                    const rStr = rows[r].join(" ").toLowerCase();
                    if (rStr.includes("emp code") || rStr.includes("empcode")) {
                        headerRowIdx = r;
                        break;
                    }
                }
                if (headerRowIdx === -1) headerRowIdx = 8; // standard fallback

                const daysInMonth = new Date(detectedYear || new Date().getFullYear(), detectedMonth || 8, 0).getDate();

                for (let r = headerRowIdx + 1; r < rows.length; r++) {
                    const row = rows[r];
                    if (!row || !row[codeCol]) continue;
                    const empCode = String(row[codeCol]).trim();
                    if (!/^\d{2,6}$/.test(empCode)) continue;
                    const empName = String(row[nameCol] || "").trim();

                    const days = {};
                    for (let d = 1; d <= daysInMonth; d++) {
                        const cellVal = String(row[nameCol + 1 + d] || "").trim();
                        days[d] = { in: "", out: "", code: cellVal };
                    }
                    parsedEmployees.push({ empCode, empName, days });
                }
            } catch (xlErr) {
                return NextResponse.json({ error: `Failed to parse Excel file: ${xlErr.message}` }, { status: 400 });
            }
        }

        // Period Fallbacks
        const effectiveYear = detectedYear || parseInt(formData.get("year") || String(new Date().getFullYear()), 10);
        const effectiveMonth = detectedMonth || parseInt(formData.get("month") || String(new Date().getMonth() + 1), 10);
        const daysInMonth = new Date(effectiveYear, effectiveMonth, 0).getDate();

        // 3. Check If Payslips Already Exist for This Month
        const existingPayslipsCount = await Payslip.countDocuments({
            institute: instituteId,
            month: effectiveMonth,
            year: effectiveYear
        });
        const payslipWarning = existingPayslipsCount > 0
            ? `Payslips for ${effectiveMonth}/${effectiveYear} have already been generated (${existingPayslipsCount} payslips found). Re-importing attendance may make existing payroll calculations stale.`
            : null;

        // 4. Fetch Staff & HR Shift Settings
        const [staffMembers, hrSettings] = await Promise.all([
            User.find({
                institute: instituteId,
                role: { $in: ['admin', 'instructor', 'staff'] },
                deletedAt: null
            }).populate("department", "name shiftTimings").lean(),
            HRSettings.findOne({ institute: instituteId }).lean()
        ]);

        // Build Staff Lookup Maps with Collision Detection
        const byExactBioId = new Map();
        const byStrippedBioId = new Map(); // stripped -> array of users (to detect ambiguity!)
        const byNormalizedName = new Map(); // normalizedName -> array of users (to detect ambiguity!)

        staffMembers.forEach(s => {
            const rawBioId = s.hrDetails?.biometricId ? String(s.hrDetails.biometricId).trim() : null;
            if (rawBioId) {
                byExactBioId.set(rawBioId, s);
                const stripped = rawBioId.replace(/^0+/, "") || "0";
                if (!byStrippedBioId.has(stripped)) byStrippedBioId.set(stripped, []);
                byStrippedBioId.get(stripped).push(s);
            }

            const fullName = `${s.profile?.firstName || ""} ${s.profile?.lastName || ""}`.trim();
            if (fullName) {
                const norm = normalizeName(fullName);
                if (norm) {
                    if (!byNormalizedName.has(norm)) byNormalizedName.set(norm, []);
                    byNormalizedName.get(norm).push(s);
                }
            }
        });

        // 5. Fetch Existing Attendance to Protect Manual Edits and Approved Leaves
        const monthStart = new Date(Date.UTC(effectiveYear, effectiveMonth - 1, 1, 0, 0, 0, 0));
        const monthEnd = new Date(Date.UTC(effectiveYear, effectiveMonth - 1, daysInMonth, 23, 59, 59, 999));

        const existingAttendance = await StaffAttendance.find({
            institute: instituteId,
            date: { $gte: monthStart, $lte: monthEnd }
        }).lean();

        const existingAttendanceMap = new Map();
        existingAttendance.forEach(rec => {
            const staffId = rec.staff.toString();
            const dateKey = new Date(rec.date).toISOString().split("T")[0];
            existingAttendanceMap.set(`${staffId}_${dateKey}`, rec);
        });

        // 6. Match Staff and Build Attendance Upserts
        const bulkOperations = [];
        const matchedStaffIds = new Set();
        const unmatchedList = [];
        const autoBoundStaff = [];
        let totalPunchesImported = 0;

        for (const emp of parsedEmployees) {
            const rawCode = emp.empCode;
            const strippedCode = rawCode.replace(/^0+/, "") || "0";
            const rawName = emp.empName;
            const normName = normalizeName(rawName);

            let staff = null;
            let matchType = "none";

            // Stage 1: Exact Biometric ID match
            if (byExactBioId.has(rawCode)) {
                staff = byExactBioId.get(rawCode);
                matchType = "exact_biometric";
            }
            // Stage 2: Stripped zero match (guarded against collisions)
            else if (byStrippedBioId.has(strippedCode)) {
                const candidates = byStrippedBioId.get(strippedCode);
                if (candidates.length === 1) {
                    staff = candidates[0];
                    matchType = "stripped_biometric";
                } else {
                    unmatchedList.push({
                        code: rawCode,
                        name: rawName,
                        reason: "Ambiguous biometric ID (multiple staff matched after stripping leading zeros)"
                    });
                    continue;
                }
            }
            // Stage 3: Normalized name match with strict safety guards
            else if (normName && byNormalizedName.has(normName)) {
                const candidates = byNormalizedName.get(normName);
                if (candidates.length === 1) {
                    const candidate = candidates[0];
                    const existingCode = candidate.hrDetails?.biometricId;

                    // Safety guard: Never overwrite if user already has a different biometric ID
                    if (existingCode && String(existingCode).trim() !== rawCode) {
                        unmatchedList.push({
                            code: rawCode,
                            name: rawName,
                            reason: `Staff matched by name (${rawName}), but already has a different Biometric ID (${existingCode}). Auto-bind skipped for safety.`
                        });
                        continue;
                    }

                    // Safety guard: Code must not be claimed by another staff member
                    if (byExactBioId.has(rawCode) && byExactBioId.get(rawCode)._id.toString() !== candidate._id.toString()) {
                        unmatchedList.push({
                            code: rawCode,
                            name: rawName,
                            reason: `Biometric Code (${rawCode}) is already assigned to another staff member.`
                        });
                        continue;
                    }

                    staff = candidate;
                    matchType = "name_fallback";

                    // Auto-bind biometric ID in database
                    if (!existingCode) {
                        User.updateOne({ _id: staff._id }, { $set: { "hrDetails.biometricId": rawCode } }).exec();
                        autoBoundStaff.push({ id: staff._id, name: rawName, code: rawCode });
                    }
                } else {
                    unmatchedList.push({
                        code: rawCode,
                        name: rawName,
                        reason: "Ambiguous staff name (multiple staff members share this name)"
                    });
                    continue;
                }
            }

            if (!staff) {
                unmatchedList.push({
                    code: rawCode,
                    name: rawName,
                    reason: "No staff found with matching Biometric ID or Name"
                });
                continue;
            }

            matchedStaffIds.add(staff._id.toString());

            // Resolve Effective Shift Rules
            const deptShift = staff.department?.shiftTimings;
            const hasCustomDeptShift = Boolean(deptShift?.useCustomShift);
            const shiftStart = hasCustomDeptShift ? (deptShift.shiftStart || "09:00") : (hrSettings?.shiftStart || "09:00");
            const shiftEnd = hasCustomDeptShift ? (deptShift.shiftEnd || "18:00") : (hrSettings?.shiftEnd || "18:00");
            const checkInGraceMins = hasCustomDeptShift ? (deptShift.checkInGraceMins ?? 15) : (hrSettings?.checkInGraceMins ?? 15);
            const checkOutGraceMins = hasCustomDeptShift ? (deptShift.checkOutGraceMins ?? 10) : (hrSettings?.checkOutGraceMins ?? 10);
            const overtimeBufferMins = hrSettings?.overtimeBufferMins ?? 30;
            const overtimeEnabled = hrSettings?.overtimeEnabled !== false;

            const shiftStartMins = parseTimeToMinutes(shiftStart);
            const shiftEndMins = parseTimeToMinutes(shiftEnd);

            // Process Each Day in Month
            for (let d = 1; d <= daysInMonth; d++) {
                const dayEntry = emp.days[d];
                if (!dayEntry) continue;

                // Timezone safe UTC date
                const dateObj = new Date(Date.UTC(effectiveYear, effectiveMonth - 1, d, 0, 0, 0, 0));
                const dateKey = dateObj.toISOString().split("T")[0];
                const existingRec = existingAttendanceMap.get(`${staff._id.toString()}_${dateKey}`);

                // Guard 1: Protect Manual Admin Edits (unless overwriteManual toggle is active)
                if (existingRec && existingRec.source === "manual" && !overwriteManual) {
                    continue; // Skip overwriting manual corrections
                }

                // Guard 2: Protect Pre-Approved Leaves from Being Overwritten as Absent
                if (existingRec && existingRec.status === "on_leave" && !dayEntry.in && !dayEntry.out) {
                    continue; // Keep approved leave intact
                }

                let status = "present";
                let checkInTime = dayEntry.in || "";
                let checkOutTime = dayEntry.out || "";
                let lateMinutes = 0;
                let earlyDepartureMinutes = 0;
                let overtimeMinutes = 0;
                let remarks = "";

                const code = (dayEntry.code || "").toUpperCase();

                if (checkInTime || checkOutTime) {
                    status = "present";

                    // Check-In Lateness Calculation
                    if (checkInTime) {
                        const inMins = parseTimeToMinutes(checkInTime);
                        if (inMins > (shiftStartMins + checkInGraceMins)) {
                            lateMinutes = Math.max(0, inMins - shiftStartMins);
                        }
                    }

                    // Check-Out Early Departure & Overtime Calculation
                    if (checkOutTime) {
                        const outMins = parseTimeToMinutes(checkOutTime);
                        if (outMins < (shiftEndMins - checkOutGraceMins)) {
                            earlyDepartureMinutes = Math.max(0, shiftEndMins - outMins);
                        } else if (overtimeEnabled && outMins >= (shiftEndMins + overtimeBufferMins)) {
                            overtimeMinutes = outMins - shiftEndMins;
                        }
                    }

                    // Punch anomalies
                    if (checkInTime && !checkOutTime) {
                        remarks = `Biometric In: ${checkInTime} (Missed Punch Out)`;
                    } else if (!checkInTime && checkOutTime) {
                        remarks = `Biometric Out: ${checkOutTime} (Missed Punch In)`;
                    } else if (code.includes("WO")) {
                        remarks = `Worked on Week Off (${checkInTime} - ${checkOutTime})`;
                    } else {
                        remarks = `Biometric In: ${checkInTime} Out: ${checkOutTime}`;
                    }
                } else if (code === "A") {
                    status = "absent";
                    remarks = "Biometric Absent";
                } else if (code.includes("WO") || code.includes("W/O")) {
                    status = "holiday";
                    remarks = "Week Off";
                } else if (code === "MIS") {
                    status = "half_day";
                    remarks = "Biometric Missed Punch (MIS)";
                } else if (code === "HD" || code === "HL") {
                    status = "half_day";
                    remarks = "Biometric Half Day";
                } else if (["CL", "EL", "SL", "L", "LV"].includes(code)) {
                    status = "on_leave";
                    remarks = "On Leave";
                } else if (code === "P") {
                    status = "present";
                    remarks = "Present (Summary Log)";
                } else {
                    // Blank day without punches or codes
                    status = "absent";
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

        // 7. Execute Bulk Write
        if (bulkOperations.length > 0) {
            await StaffAttendance.bulkWrite(bulkOperations, { ordered: false });
        }

        // 8. Audit Logging
        try {
            await createAuditLog({
                actor: session.user.id,
                action: "hr.attendance.biometric_import",
                resource: { type: "StaffAttendance" },
                institute: instituteId,
                details: {
                    fileName: file.name,
                    period: `${effectiveMonth}/${effectiveYear}`,
                    totalPunchesImported,
                    matchedStaffCount: matchedStaffIds.size,
                    unmatchedCount: unmatchedList.length,
                    autoBoundCount: autoBoundStaff.length
                }
            });
        } catch (auditErr) {
            console.error("Audit log failed during biometric import:", auditErr);
        }

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const periodLabel = `${monthNames[effectiveMonth - 1]} ${effectiveYear}`;

        return NextResponse.json({
            success: true,
            period: periodLabel,
            year: effectiveYear,
            month: effectiveMonth,
            matchedStaffCount: matchedStaffIds.size,
            totalRecordsImported: totalPunchesImported,
            unmatchedCount: unmatchedList.length,
            unmatchedStaff: unmatchedList,
            autoBoundCount: autoBoundStaff.length,
            payslipWarning,
            notice: importNotice
        });

    } catch (error) {
        console.error("Biometric Attendance Import Error:", error);
        return NextResponse.json({
            error: "Failed to process attendance file: " + (error.message || "Internal server error")
        }, { status: 500 });
    }
}
