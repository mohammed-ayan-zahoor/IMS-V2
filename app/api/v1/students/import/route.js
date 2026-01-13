import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "@/models/User"; // Direct access to User model (aliased as Student) for bulk ops
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstituteScope } from "@/middleware/instituteScope";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";

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

        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Buffer the file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Parse Excel
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet);

        if (!rawData || rawData.length === 0) {
            return NextResponse.json({ error: "Excel file is empty" }, { status: 400 });
        }

        const successResults = [];
        const errors = [];
        const seenEmails = new Set();

        const existingStudents = await Student.find({
            institute: scope.instituteId,
            isDeleted: { $ne: true }
        }).select("email").lean();

        const existingEmailSet = new Set(
            existingStudents
                .filter(s => s.email)
                .map(s => s.email.toLowerCase())
        );

        // Process Loop
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            const rowNum = i + 2;

            const firstName = row.FirstName || row["First Name"];
            const lastName = row.LastName || row["Last Name"];
            const email = (row.Email || row["Email Address"])?.toString().toLowerCase().trim();
            const phone = row.Phone?.toString();
            const password = row.Password?.toString();
            const enrollmentNumber = row.EnrollmentNumber?.toString();
            const gender = row.Gender;

            // 1. Basic Validation
            if (!firstName || !lastName || !email) {
                errors.push({ row: rowNum, identifier: email || 'N/A', reason: "Missing required fields (Name or Email)" });
                continue;
            }

            // 2. Email Validation
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                errors.push({ row: rowNum, identifier: email, reason: "Invalid Email Format" });
                continue;
            }

            // 3. Duplicate Check (In File)
            if (seenEmails.has(email)) {
                errors.push({ row: rowNum, identifier: email, reason: "Duplicate Email in file" });
                continue;
            }
            seenEmails.add(email);

            // 4. Duplicate Check (In DB)
            if (existingEmailSet.has(email)) {
                errors.push({ row: rowNum, identifier: email, reason: "Student already exists" });
                continue;
            }

            // Valid -> Prepare Object
            // OPTIMIZATION: Store raw password temporarily, hash later in parallel
            successResults.push({
                fullName: `${firstName} ${lastName}`,
                email: email,
                password: password || "Welcome@123",
                institute: scope.instituteId,
                role: "student",
                items: [],
                profile: {
                    firstName,
                    lastName,
                    phone: phone || "",
                    gender: gender || "Not Specified"
                },
                enrollmentNumber: enrollmentNumber || null,
                isActive: true,
                createdBy: session.user.id
            });
        }

        // Bulk Insert if any valid
        if (successResults.length > 0) {
            // 1. Auto-generate Enrollment IDs for students who are missing one
            const studentsMissingId = successResults.filter(s => !s.enrollmentNumber);

            if (studentsMissingId.length > 0) {
                const year = new Date().getFullYear();
                const counterId = `student_enrollment_${year}`;

                // Atomically reserve a block of IDs
                // Note: We need to import Counter model dynamically or at top-level
                // Ideally import Counter from '@/models/Counter'; at top
                const Counter = (await import("@/models/Counter")).default;

                const counter = await Counter.findByIdAndUpdate(
                    counterId,
                    { $inc: { seq: studentsMissingId.length } },
                    { new: true, upsert: true }
                );

                if (!counter) throw new Error("Failed to generate enrollment sequence");

                // Calculate starting sequence for this batch
                // If current seq is 105 and we reserved 5, valid IDs are 101, 102, 103, 104, 105
                let currentSeq = counter.seq - studentsMissingId.length + 1;

                // Assign IDs
                studentsMissingId.forEach(s => {
                    s.enrollmentNumber = `STU${year}${String(currentSeq).padStart(4, '0')}`;
                    currentSeq++;
                });
            }

            // 2. Parallel Password Hashing
            const hashedPasswords = await Promise.all(
                successResults.map(s => bcrypt.hash(s.password, 10))
            );

            // Assign hashes back
            successResults.forEach((s, idx) => {
                s.passwordHash = hashedPasswords[idx]; // Map to correct DB field
                delete s.password; // Remove temp field
            });

            await Student.insertMany(successResults);
        }

        return NextResponse.json({
            success: true,
            importedCount: successResults.length,
            failedCount: errors.length,
            errors: errors
        });

    } catch (error) {
        console.error("Import Error:", error);
        return NextResponse.json({ error: "Import failed: " + error.message }, { status: 500 });
    }
}
