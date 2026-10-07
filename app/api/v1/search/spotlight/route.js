import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Fee from "@/models/Fee";
import Batch from "@/models/Batch";
import { getInstituteScope } from "@/middleware/instituteScope";

import { APP_PAGES } from "@/lib/spotlightPages";

// Static quick actions and navigation routes
const STATIC_ACTIONS = [
    {
        id: "act-new-admission",
        type: "action",
        title: "New Student Admission",
        metadata: "Open admission form · Action",
        icon: "user-plus",
        url: "/admin/students?add=true",
        keywords: ["new", "admission", "student", "add", "enroll"]
    },
    {
        id: "act-collect-fee",
        type: "action",
        title: "Collect Student Fee",
        metadata: "Fee collection & receipts · Action",
        icon: "credit-card",
        url: "/admin/fees",
        keywords: ["fee", "collect", "payment", "receipt", "money", "pay"]
    },
    {
        id: "act-mark-attendance",
        type: "action",
        title: "Mark Staff Attendance",
        metadata: "Daily attendance register · Action",
        icon: "calendar-check",
        url: "/admin/hr/attendance",
        keywords: ["attendance", "present", "absent", "punch", "biometric", "checkin"]
    },
    {
        id: "act-generate-id",
        type: "action",
        title: "Generate ID Cards",
        metadata: "Print student & staff ID cards · Action",
        icon: "id-card",
        url: "/admin/idcard/generate",
        keywords: ["id", "card", "generate", "print", "badge"]
    },
    {
        id: "act-create-notice",
        type: "action",
        title: "Publish Notice / Announcement",
        metadata: "Circulars & notices · Action",
        icon: "megaphone",
        url: "/admin/notices",
        keywords: ["notice", "announcement", "circular", "publish"]
    },
    {
        id: "act-sign-out",
        type: "action",
        title: "Sign Out",
        metadata: "Log out of your account · Shortcut Ctrl+L",
        icon: "log-out",
        url: "/api/auth/signout",
        keywords: ["logout", "signout", "exit", "leave", "quit", "log out", "sign out"]
    }
];

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || !["admin", "super_admin", "instructor", "staff"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const scope = await getInstituteScope(req);
        if (!scope || (!scope.instituteId && !scope.isSuperAdmin)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = session.user.role;
        const { searchParams } = new URL(req.url);
        let rawQuery = (searchParams.get("q") || "").trim();
        const limit = Math.min(8, Math.max(1, parseInt(searchParams.get("limit")) || 8));

        // Prefix filters
        let filterMode = "all"; // 'action' | 'page' | 'staff' | 'receipt' | 'student' | 'all'
        if (rawQuery.startsWith(">")) {
            filterMode = "action";
            rawQuery = rawQuery.slice(1).trim();
        } else if (rawQuery.startsWith("/")) {
            filterMode = "page";
            rawQuery = rawQuery.slice(1).trim();
        } else if (rawQuery.startsWith("@")) {
            filterMode = "staff";
            rawQuery = rawQuery.slice(1).trim();
        } else if (rawQuery.startsWith("#")) {
            filterMode = "receipt";
            rawQuery = rawQuery.slice(1).trim();
        }

        const tenantFilter = scope.isSuperAdmin && !scope.instituteId
            ? { deletedAt: null }
            : { institute: scope.instituteId, deletedAt: null };

        // Filter APP_PAGES by user role
        const accessiblePages = APP_PAGES.filter(p => !p.roles || p.roles.includes(userRole));

        // 1. If empty query, show respective category defaults or overall top items
        if (!rawQuery) {
            if (filterMode === "action") {
                return NextResponse.json({ results: STATIC_ACTIONS.slice(0, limit) });
            }
            if (filterMode === "page") {
                return NextResponse.json({ results: accessiblePages.slice(0, limit) });
            }
            if (filterMode === "staff") {
                const staffList = await User.find({ ...tenantFilter, role: { $in: ["instructor", "admin", "staff"] } })
                    .select("profile email hrDetails role")
                    .populate("hrDetails.designation", "title name")
                    .limit(limit)
                    .lean();
                const items = staffList.map(st => {
                    const fullName = `${st.profile?.firstName || ""} ${st.profile?.lastName || ""}`.trim() || st.email || "Staff Member";
                    const desig = st.hrDetails?.designation?.title || st.hrDetails?.designation?.name || (st.role === "instructor" ? "Faculty" : "Staff");
                    const bioId = st.hrDetails?.biometricId ? ` · ID: ${st.hrDetails.biometricId}` : "";
                    return {
                        id: `staff-${st._id}`,
                        type: "staff",
                        title: fullName,
                        metadata: `${desig}${bioId} · Faculty/Staff`,
                        icon: "briefcase",
                        url: `/admin/hr/staff/${st._id}`
                    };
                });
                return NextResponse.json({ results: items });
            }
            if (filterMode === "receipt") {
                const fees = await Fee.find(tenantFilter)
                    .select("receiptNo invoiceNumber finalAmount paidAmount status student")
                    .populate("student", "profile email")
                    .limit(limit)
                    .lean();
                const items = fees.map(f => {
                    const rNum = f.receiptNo || f.invoiceNumber || "Receipt";
                    const studentName = f.student ? `${f.student.profile?.firstName || ""} ${f.student.profile?.lastName || ""}`.trim() : "";
                    const amount = f.paidAmount != null ? `₹${f.paidAmount.toLocaleString("en-IN")}` : "";
                    return {
                        id: `fee-${f._id}`,
                        type: "receipt",
                        title: `Receipt #${rNum} · ${amount}`,
                        metadata: `${studentName ? `Paid by ${studentName} · ` : ""}${f.status.toUpperCase()} · Fee`,
                        icon: "receipt",
                        url: `/admin/receipts/${f._id}`
                    };
                });
                return NextResponse.json({ results: items });
            }

            const defaults = [
                ...STATIC_ACTIONS.slice(0, 3),
                ...accessiblePages.slice(0, 3)
            ];
            return NextResponse.json({ results: defaults.slice(0, limit) });
        }

        const queryLower = rawQuery.toLowerCase();
        const escaped = queryLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const results = [];

        // 2. Client-side static filter for Actions & Pages
        if (filterMode === "all" || filterMode === "action") {
            for (const act of STATIC_ACTIONS) {
                if (act.title.toLowerCase().includes(queryLower) || act.keywords.some(k => k.includes(queryLower))) {
                    results.push(act);
                }
            }
        }

        if (filterMode === "all" || filterMode === "page") {
            for (const page of accessiblePages) {
                const titleMatch = page.title.toLowerCase().includes(queryLower);
                const metaMatch = page.metadata.toLowerCase().includes(queryLower);
                const keywordMatch = page.keywords.some(k => k.includes(queryLower));
                if (titleMatch || metaMatch || keywordMatch) {
                    // Match score: title match first, then keyword, then meta
                    const score = titleMatch ? 3 : (keywordMatch ? 2 : 1);
                    results.push({ ...page, _score: score });
                }
            }
            results.sort((a, b) => (b._score || 0) - (a._score || 0));
        }

        // 3. Search Students (if mode is all or student)
        if (filterMode === "all" || filterMode === "student") {
            const studentFilter = {
                ...tenantFilter,
                role: "student",
                $or: [
                    { "profile.firstName": { $regex: escaped, $options: "i" } },
                    { "profile.lastName": { $regex: escaped, $options: "i" } },
                    { enrollmentNumber: { $regex: escaped, $options: "i" } },
                    { "profile.phone": { $regex: escaped, $options: "i" } },
                    { email: { $regex: escaped, $options: "i" } }
                ]
            };

            const students = await User.find(studentFilter)
                .select("profile email enrollmentNumber status")
                .limit(4)
                .lean();

            for (const s of students) {
                const fullName = `${s.profile?.firstName || ""} ${s.profile?.lastName || ""}`.trim() || s.email || "Student";
                const roll = s.enrollmentNumber ? `Roll #${s.enrollmentNumber}` : "Enrolled";
                const phone = s.profile?.phone ? ` · ${s.profile.phone}` : "";
                results.push({
                    id: `stu-${s._id}`,
                    type: "student",
                    title: fullName,
                    metadata: `${roll}${phone} · Student`,
                    icon: "graduation-cap",
                    url: `/admin/students/${s._id}`
                });
            }
        }

        // 4. Search Staff (if mode is all or staff)
        // Note: hrDetails.designation and department are ObjectIds, so regex search is only applied to string fields!
        if (filterMode === "all" || filterMode === "staff") {
            const staffFilter = {
                ...tenantFilter,
                role: { $in: ["instructor", "admin", "staff"] },
                $or: [
                    { "profile.firstName": { $regex: escaped, $options: "i" } },
                    { "profile.lastName": { $regex: escaped, $options: "i" } },
                    { "hrDetails.biometricId": { $regex: escaped, $options: "i" } },
                    { "profile.phone": { $regex: escaped, $options: "i" } },
                    { email: { $regex: escaped, $options: "i" } }
                ]
            };

            const staffList = await User.find(staffFilter)
                .select("profile email hrDetails role")
                .populate("hrDetails.designation", "title name")
                .limit(4)
                .lean();

            for (const st of staffList) {
                const fullName = `${st.profile?.firstName || ""} ${st.profile?.lastName || ""}`.trim() || st.email || "Staff Member";
                const desig = st.hrDetails?.designation?.title || st.hrDetails?.designation?.name || (st.role === "instructor" ? "Faculty" : "Staff");
                const bioId = st.hrDetails?.biometricId ? ` · ID: ${st.hrDetails.biometricId}` : "";
                results.push({
                    id: `staff-${st._id}`,
                    type: "staff",
                    title: fullName,
                    metadata: `${desig}${bioId} · Faculty/Staff`,
                    icon: "briefcase",
                    url: `/admin/hr/staff/${st._id}`
                });
            }
        }

        // 5. Search Fee Receipts (if mode is all or receipt)
        if (filterMode === "all" || filterMode === "receipt") {
            const feeFilter = {
                ...tenantFilter,
                $or: [
                    { receiptNo: { $regex: escaped, $options: "i" } },
                    { invoiceNumber: { $regex: escaped, $options: "i" } }
                ]
            };

            const fees = await Fee.find(feeFilter)
                .select("receiptNo invoiceNumber finalAmount paidAmount status student")
                .populate("student", "profile email")
                .limit(3)
                .lean();

            for (const f of fees) {
                const rNum = f.receiptNo || f.invoiceNumber || "Receipt";
                const studentName = f.student ? `${f.student.profile?.firstName || ""} ${f.student.profile?.lastName || ""}`.trim() : "";
                const amount = f.paidAmount != null ? `₹${f.paidAmount.toLocaleString("en-IN")}` : "";
                results.push({
                    id: `fee-${f._id}`,
                    type: "receipt",
                    title: `Receipt #${rNum} · ${amount}`,
                    metadata: `${studentName ? `Paid by ${studentName} · ` : ""}${f.status.toUpperCase()} · Fee`,
                    icon: "receipt",
                    url: `/admin/receipts/${f._id}`
                });
            }
        }

        // 6. Search Academic Batches / Classes (if mode is all)
        if (filterMode === "all") {
            const batchFilter = {
                ...tenantFilter,
                name: { $regex: escaped, $options: "i" }
            };

            const batches = await Batch.find(batchFilter)
                .select("name")
                .limit(2)
                .lean();

            for (const b of batches) {
                results.push({
                    id: `batch-${b._id}`,
                    type: "batch",
                    title: b.name,
                    metadata: "Class / Academic Batch · Academics",
                    icon: "book-open",
                    url: `/admin/batches`
                });
            }
        }

        // Limit to 6 items strictly per Spotlight spec
        return NextResponse.json({ results: results.slice(0, limit) });
    } catch (error) {
        console.error("Spotlight Search API Error:", error);
        return NextResponse.json({ error: error.message || "Search failed" }, { status: 500 });
    }
}
