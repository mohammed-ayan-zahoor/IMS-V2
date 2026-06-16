import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "@/models/User"; // Direct access to User model (aliased as Student) for bulk ops
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import { validateAndDeriveSession } from "@/middleware/sessionValidation";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// Smart parser to normalize legacy class names and Roman numerals to standard Courses and Batches
function parseClassString(classStr) {
    if (!classStr) return { courseName: "Unknown", batchName: "A" };
    
    let cleanStr = classStr.toString().trim();
    let coursePart = cleanStr;
    let batchPart = "A";
    
    // Pattern 1: Course(Batch) e.g., "1st(A)", "I(A)", "Nursery(B)"
    const bracketMatch = cleanStr.match(/^([^(]+)\(([^)]+)\)$/);
    if (bracketMatch) {
        coursePart = bracketMatch[1].trim();
        batchPart = bracketMatch[2].trim();
    } else {
        // Pattern 2: Course - Batch e.g., "1st Std - A"
        const hyphenMatch = cleanStr.match(/^([^-]+)-\s*([^-]+)$/);
        if (hyphenMatch) {
            coursePart = hyphenMatch[1].trim();
            batchPart = hyphenMatch[2].trim();
        }
    }
    
    let courseName = coursePart;
    const upperCourse = coursePart.toUpperCase();
    
    // Standard translation dictionary for Roman numerals and legacy shorthand
    const courseMap = {
        "I": "1st Std",
        "1": "1st Std",
        "1ST": "1st Std",
        "FIRST": "1st Std",
        
        "II": "2nd Std",
        "2": "2nd Std",
        "2ND": "2nd Std",
        "SECOND": "2nd Std",
        
        "III": "3rd Std",
        "3": "3rd Std",
        "3RD": "3rd Std",
        "THIRD": "3rd Std",
        
        "IV": "4th Std",
        "4": "4th Std",
        "4TH": "4th Std",
        "FOURTH": "4th Std",
        
        "V": "5th Std",
        "5": "5th Std",
        "5TH": "5th Std",
        "FIFTH": "5th Std",
        
        "VI": "6th Std",
        "6": "6th Std",
        "6TH": "6th Std",
        "SIXTH": "6th Std",
        
        "VII": "7th Std",
        "7": "7th Std",
        "7TH": "7th Std",
        "SEVENTH": "7th Std",
        
        "VIII": "8th Std",
        "8": "8th Std",
        "8TH": "8th Std",
        "EIGHTH": "8th Std",
        
        "IX": "9th Std",
        "9": "9th Std",
        "9TH": "9th Std",
        "NINTH": "9th Std",
        
        "X": "10th Std",
        "10": "10th Std",
        "10TH": "10th Std",
        "TENTH": "10th Std",
        
        "XI": "11th Std",
        "11": "11th Std",
        "11TH": "11th Std",
        "ELEVENTH": "11th Std",
        
        "XII": "12th Std",
        "12": "12th Std",
        "12TH": "12th Std",
        "TWELFTH": "12th Std",
        
        "NURSERY": "Nursery",
        "JRKG": "Jr.Kg",
        "JR.KG": "Jr.Kg",
        "JR KG": "Jr.Kg",
        "SRKG": "Sr.Kg",
        "SR.KG": "Sr.Kg",
        "SR KG": "Sr.Kg"
    };
    
    if (courseMap[upperCourse]) {
        courseName = courseMap[upperCourse];
    } else {
        // Fallback title casing capitalization
        courseName = coursePart.split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
    }
    
    return { courseName, batchName: batchPart };
}

// Self-healing course lookup & creation
async function resolveCourse(courseName, instituteId, userId) {
    const Course = (await import("@/models/Course")).default;
    
    let course = await Course.findOne({
        institute: instituteId,
        name: { $regex: new RegExp(`^${courseName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
        deletedAt: null
    });
    
    if (!course) {
        const code = courseName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "CL";
        course = await Course.create({
            institute: instituteId,
            name: courseName,
            code,
            description: `Auto-created during bulk import`,
            createdBy: userId
        });
        console.log(`[IMPORT] Self-Healing: Auto-created Course: ${courseName} (${code})`);
    }
    return course;
}

// Self-healing batch lookup & creation
async function resolveBatch(batchName, courseId, sessionId, instituteId, userId) {
    const Batch = (await import("@/models/Batch")).default;
    
    let batch = await Batch.findOne({
        institute: instituteId,
        course: courseId,
        session: sessionId,
        name: { $regex: new RegExp(`^${batchName}$`, 'i') },
        deletedAt: null
    });
    
    if (!batch) {
        const Session = (await import("@/models/Session")).default;
        const session = await Session.findById(sessionId);
        const startDate = session ? session.startDate : new Date();
        const endDate = session ? session.endDate : new Date(new Date().setFullYear(new Date().getFullYear() + 1));
        
        batch = await Batch.create({
            institute: instituteId,
            course: courseId,
            session: sessionId,
            name: batchName,
            schedule: {
                startDate,
                endDate,
                daysOfWeek: [1, 2, 3, 4, 5],
                timeSlot: { start: "09:00", end: "14:00" }
            },
            capacity: 40,
            enrolledStudents: [],
            createdBy: userId
        });
        console.log(`[IMPORT] Self-Healing: Auto-created Batch: ${batchName} for course ID ${courseId} in session ${sessionId}`);
    }
    return batch;
}

async function checkCourseExists(courseName, instituteId) {
    const Course = (await import("@/models/Course")).default;
    return await Course.findOne({
        institute: instituteId,
        name: { $regex: new RegExp(`^${courseName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
        deletedAt: null
    });
}

async function checkBatchExists(batchName, courseId, sessionId, instituteId) {
    const Batch = (await import("@/models/Batch")).default;
    return await Batch.findOne({
        institute: instituteId,
        course: courseId,
        session: sessionId,
        name: { $regex: new RegExp(`^${batchName}$`, 'i') },
        deletedAt: null
    });
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || !["admin", "super_admin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (scope.isSuperAdmin && !scope.instituteId) {
            return NextResponse.json({ error: "Institute must be specified for super_admin" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const isPreview = searchParams.get("preview") === "true";

        const formData = await req.formData();
        const file = formData.get("file");
        const globalTargetBatchId = formData.get("targetBatchId");

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }
        if (!globalTargetBatchId) {
            return NextResponse.json({ error: "No target class/section selected" }, { status: 400 });
        }

        // Parse file buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // 1. READ RAW CELLS TO AUTOMATICALLY DETECT HEADER OFFSET (Highly Premium SaaS Feature)
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        if (!rawRows || rawRows.length === 0) {
            return NextResponse.json({ error: "Excel file is empty" }, { status: 400 });
        }

        let headerRowIndex = 0;
        let bestMatchCount = 0;
        const knownHeaders = ["student name", "admission no", "class", "gender", "mobile number", "mothers name", "gr number", "aadhar", "pen number"];
        
        // Scan first 5 rows to identify the exact column headers
        for (let r = 0; r < Math.min(5, rawRows.length); r++) {
            const rowCells = rawRows[r].map(c => String(c || "").trim().toLowerCase());
            let matchCount = 0;
            rowCells.forEach(cell => {
                if (knownHeaders.some(kh => cell.includes(kh))) {
                    matchCount++;
                }
            });
            if (matchCount > bestMatchCount) {
                bestMatchCount = matchCount;
                headerRowIndex = r;
            }
        }

        console.log(`[IMPORT] Detected header row at index: ${headerRowIndex} with ${bestMatchCount} match counts.`);
        
        const headers = rawRows[headerRowIndex].map(h => String(h || "").trim());
        const dataRows = rawRows.slice(headerRowIndex + 1);

        // 2. LOOSE COLUMN INDEX MAPPING (Alias Engine)
        const getColIndex = (aliases) => {
            return headers.findIndex(h => {
                const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
                return aliases.some(alias => {
                    const normAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
                    return norm.includes(normAlias) || normAlias.includes(norm);
                });
            });
        };

        const idxAdmissionNo = getColIndex(["Admission No", "Admission Number", "Student ID", "Enrollment Number", "Roll No", "Roll Number", "Student List"]);
        const idxName = getColIndex(["Student Name", "StudentName", "Name", "Full Name", "FullName"]);
        const idxRollNo = getColIndex(["Roll No", "Roll Number", "RollNo"]);
        const idxClass = getColIndex(["Class", "Standard", "Std", "Grade", "Course"]);
        const idxDOB = getColIndex(["Date Of Birth", "DateOfBirth", "DOB", "Birth Date"]);
        const idxGender = getColIndex(["Gender", "Sex"]);
        const idxCategory = getColIndex(["Category", "Caste", "SubCaste"]);
        const idxPhone = getColIndex(["Mobile Number", "Mobile", "Phone", "Phone Number", "Contact"]);
        const idxMotherName = getColIndex(["Mothers Name", "Mother Name", "Mother's Name"]);
        const idxAadhar = getColIndex(["Aadhar", "Aadhar No", "Aadhar Number"]);
        const idxPEN = getColIndex(["PEN Number", "PEN No", "PEN"]);
        const idxAPAAR = getColIndex(["APAAR ID", "APAAR", "APAAR ID"]);
        const idxGRNo = getColIndex(["GR Number", "GR No", "GR"]);

        const getValByColIndex = (row, colIndex) => {
            if (colIndex === -1 || colIndex >= row.length) return "";
            return String(row[colIndex] || "").trim();
        };

        // Derive active session for the imported students
        let sessionId = null;
        try {
            const sessionResult = await validateAndDeriveSession(req, scope);
            sessionId = sessionResult.sessionId;
        } catch (err) {
            console.error("[IMPORT_SESSION_ERROR]", err.message);
        }

        const successResults = [];
        const errors = [];
        const previewRows = [];
        const seenEmails = new Set();
        const seenEnrollments = new Set();

        const existingStudents = await Student.find({
            institute: scope.instituteId,
            isDeleted: { $ne: true }
        }).select("email enrollmentNumber").lean();

        const existingEmailSet = new Set(
            existingStudents
                .filter(s => s.email)
                .map(s => s.email.toLowerCase())
        );

        const existingEnrollmentSet = new Set(
            existingStudents
                .filter(s => s.enrollmentNumber)
                .map(s => s.enrollmentNumber.toUpperCase())
        );

        // Fetch Institute Type & Code
        const Institute = (await import("@/models/Institute")).default;
        const instDoc = await Institute.findById(scope.instituteId).select("type code").lean();
        const isVocational = instDoc?.type === "VOCATIONAL";
        const instCode = instDoc?.code || "INST";
        const emailDomain = `${instCode.toLowerCase()}.edu`;

        // 3. PROCESS ROWS & DYNAMIC INFRASTRUCTURE RESOLUTION
        const studentBatchMappings = []; // array of { studentIdx, batchId }
        const resolvedBatches = {}; // cache to speed up row parsing

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowNum = headerRowIndex + i + 2;

            const admissionNo = getValByColIndex(row, idxAdmissionNo);
            const studentName = getValByColIndex(row, idxName);
            const rawClass = getValByColIndex(row, idxClass);
            const rawDOB = getValByColIndex(row, idxDOB);
            const gender = getValByColIndex(row, idxGender);
            const category = getValByColIndex(row, idxCategory);
            const rawPhone = getValByColIndex(row, idxPhone);
            const phone = rawPhone ? rawPhone.toString().trim().replace(/[^0-9+\-()\s]/g, "").trim() : undefined;
            const motherName = getValByColIndex(row, idxMotherName);
            const rawAadhar = getValByColIndex(row, idxAadhar);
            const penNumber = getValByColIndex(row, idxPEN);
            const apaarId = getValByColIndex(row, idxAPAAR);
            const grNumber = getValByColIndex(row, idxGRNo);

            const rowErrors = [];

            // Basic checks
            if (!studentName) {
                rowErrors.push("Student Name is required");
            }

            // Clean Name
            const nameParts = studentName ? studentName.trim().split(/\s+/) : [];
            const firstName = nameParts[0] || "";
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "";
            if (studentName && !lastName) {
                rowErrors.push("Last Name is required");
            }

            // Generate clean unique enrollment ID
            let enrollmentNumber = admissionNo ? admissionNo.toUpperCase() : null;
            
            // Check unique enrollment (In File)
            if (enrollmentNumber) {
                if (seenEnrollments.has(enrollmentNumber)) {
                    rowErrors.push(`Duplicate Admission No "${enrollmentNumber}" in spreadsheet`);
                } else {
                    seenEnrollments.add(enrollmentNumber);
                }

                // Check unique enrollment (In DB)
                if (existingEnrollmentSet.has(enrollmentNumber)) {
                    rowErrors.push(`Admission No "${enrollmentNumber}" already exists in database`);
                }
            }

            // Generate unique professional school email (SaaS Standard)
            const lastNamePart = lastName ? `${lastName.toLowerCase().replace(/[^a-z]/g, "")}.` : "";
            let email = enrollmentNumber 
                ? `${enrollmentNumber.toLowerCase()}@${emailDomain}`
                : `${firstName.toLowerCase()}.${lastNamePart}${rowNum}@${emailDomain}`;

            if (seenEmails.has(email) || existingEmailSet.has(email)) {
                // Add unique timestamp sequence suffix if collision
                const suffix = Math.floor(Math.random() * 10000);
                email = email.replace(`@${emailDomain}`, `${suffix}@${emailDomain}`);
            }
            seenEmails.add(email);

            // Parse Date of Birth cleanly (DD-MM-YYYY or general format)
            let dateOfBirth = null;
            if (rawDOB) {
                const parts = rawDOB.split('-');
                if (parts.length === 3) {
                    const day = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1; // 0-indexed
                    const year = parseInt(parts[2], 10);
                    dateOfBirth = new Date(year, month, day);
                } else {
                    dateOfBirth = new Date(rawDOB);
                }
                if (isNaN(dateOfBirth.getTime())) dateOfBirth = null;
            }

            // Clean Aadhar Number
            const cleanAadhar = rawAadhar ? rawAadhar.replace(/\s+/g, '') : "";

            // Use the global targetBatchId provided by the user in the UI
            let targetBatchId = globalTargetBatchId;
            let batchStatus = "Assigned Manually";

            if (isPreview) {
                previewRows.push({
                    row: rowNum,
                    studentName: studentName || "N/A",
                    firstName,
                    lastName,
                    admissionNo: enrollmentNumber || "Auto-generated",
                    className: rawClass || "N/A",
                    phone: phone || "N/A",
                    gender: gender || "Not Specified",
                    batchStatus,
                    errors: rowErrors,
                    isValid: rowErrors.length === 0
                });
                continue;
            }

            // Actual Import Mode: Skip row if it has validation errors
            if (rowErrors.length > 0) {
                errors.push({ 
                    row: rowNum, 
                    identifier: studentName || 'N/A', 
                    reason: rowErrors.join(', ') 
                });
                continue;
            }

            const studentObject = {
                fullName: `${firstName} ${lastName}`,
                email: email,
                password: "Welcome@123",
                institute: scope.instituteId,
                role: "student",
                profile: {
                    firstName,
                    lastName,
                    phone: phone || undefined,
                    gender: gender || "Not Specified",
                    dateOfBirth: dateOfBirth || undefined
                },
                enrollmentNumber: enrollmentNumber,
                
                // Metadata details
                grNumber,
                aadharNumber: cleanAadhar || null,
                apaarId,
                penNumber,
                caste: category || null,
                motherName,
                
                isActive: true,
                createdBy: session.user.id,
                activeSession: isVocational ? null : (sessionId || null),
                promotionHistory: (!isVocational && sessionId) ? [{ 
                    session: sessionId, 
                    promotedAt: new Date(), 
                    promotedBy: session.user.id 
                }] : [],
                activeSessions: (!isVocational && sessionId) ? [sessionId] : []
            };

            const idx = successResults.length;
            successResults.push(studentObject);
            
            if (targetBatchId) {
                studentBatchMappings.push({ studentIdx: idx, batchId: targetBatchId });
            }
        }

        if (isPreview) {
            return NextResponse.json({
                success: true,
                isPreview: true,
                rows: previewRows,
                totalRows: previewRows.length,
                validRows: previewRows.filter(r => r.isValid).length,
                invalidRows: previewRows.filter(r => !r.isValid).length
            });
        }

        // 4. BULK UPLOAD EXECUTION
        if (successResults.length > 0) {
            // A. Auto-generate Enrollment IDs for students missing one
            const studentsMissingId = successResults.filter(s => !s.enrollmentNumber);
            if (studentsMissingId.length > 0) {
                const year = new Date().getFullYear();
                const counterId = `student_enrollment_${year}`;
                const Counter = (await import("@/models/Counter")).default;

                const counter = await Counter.findByIdAndUpdate(
                    counterId,
                    { $inc: { seq: studentsMissingId.length } },
                    { new: true, upsert: true }
                );

                if (!counter) throw new Error("Failed to generate enrollment sequence");

                let currentSeq = counter.seq - studentsMissingId.length + 1;
                studentsMissingId.forEach(s => {
                    s.enrollmentNumber = `STU${year}${String(currentSeq).padStart(4, '0')}`;
                    // Update email based on generated enrollment ID
                    s.email = `${s.enrollmentNumber.toLowerCase()}@${emailDomain}`;
                    currentSeq++;
                });
            }

            // B. Parallel Password Hashing
            const hashedPasswords = await Promise.all(
                successResults.map(s => bcrypt.hash(s.password, 10))
            );

            successResults.forEach((s, idx) => {
                s.passwordHash = hashedPasswords[idx];
                delete s.password;
            });

            // C. Bulk Insert Students
            const insertedDocs = await Student.insertMany(successResults);
            console.log(`[IMPORT] Successfully bulk-inserted ${insertedDocs.length} students into User collection.`);

            // C2. Bulk Insert Memberships for the new students
            const Membership = (await import("@/models/Membership")).default;
            const membershipDocs = insertedDocs.map(doc => ({
                user: doc._id,
                institute: scope.instituteId,
                role: 'student',
                isActive: true
            }));
            await Membership.insertMany(membershipDocs);
            console.log(`[IMPORT] Successfully bulk-inserted ${membershipDocs.length} memberships.`);

            // D. High-Performance Bulk Enrollment in Batches
            if (studentBatchMappings.length > 0) {
                const batchGroups = {}; // batchId -> Array of student ObjectId strings
                studentBatchMappings.forEach(mapping => {
                    const studentId = insertedDocs[mapping.studentIdx]._id.toString();
                    if (!batchGroups[mapping.batchId]) {
                        batchGroups[mapping.batchId] = [];
                    }
                    batchGroups[mapping.batchId].push(studentId);
                });

                const Batch = (await import("@/models/Batch")).default;
                for (const batchId in batchGroups) {
                    const studentIds = batchGroups[batchId];
                    await Batch.findByIdAndUpdate(batchId, {
                        $addToSet: {
                            enrolledStudents: {
                                $each: studentIds.map(id => ({
                                    student: new mongoose.Types.ObjectId(id),
                                    enrolledAt: new Date(),
                                    status: "active"
                                }))
                            }
                        }
                    });
                    console.log(`[IMPORT] Enrolled ${studentIds.length} students in Batch ID: ${batchId}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            importedCount: successResults.length,
            failedCount: errors.length,
            errors: errors
        });

    } catch (error) {
        console.error("[IMPORT_FATAL]", error);
        return NextResponse.json({ error: "Import failed: " + error.message }, { status: 500 });
    }
}
