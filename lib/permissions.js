// Centralized, granular permissions registry for role-based access control (RBAC) in IMS-V2

export const PERMISSION_CATEGORIES = [
    {
        id: "front_office",
        label: "Front Office",
        description: "Front desk reception, visitor registers, call logs, complaints",
        permissions: [
            {
                id: "front_office_visitor_book",
                label: "Visitor Book",
                description: "Record visitor check-ins, purposes, and departure logs",
                legacyKeys: ["view_front_office"]
            },
            {
                id: "front_office_calls",
                label: "Phone Call Logs",
                description: "Log incoming and outgoing front desk calls",
                legacyKeys: ["view_front_office"]
            },
            {
                id: "front_office_postals",
                label: "Postal Records",
                description: "Track incoming and outgoing couriers and official letters",
                legacyKeys: ["view_front_office"]
            },
            {
                id: "front_office_complaints",
                label: "Complaints & Grievances",
                description: "Log, assign, and resolve student/parent complaints",
                legacyKeys: ["view_front_office"]
            }
        ]
    },
    {
        id: "enquiries",
        label: "Enquiries & Admissions Desk",
        description: "Prospect management, lead captures, walk-in inquiries",
        permissions: [
            {
                id: "enquiries_new",
                label: "New Enquiry Entry",
                description: "Register new prospective student walk-in inquiries",
                legacyKeys: ["manage_enquiries"]
            },
            {
                id: "enquiries_view",
                label: "View & Manage Enquiries",
                description: "View enquiry pipeline, log follow-ups, update lead stages",
                legacyKeys: ["manage_enquiries"]
            },
            {
                id: "enquiries_applications",
                label: "Online Enquiries & Applications",
                description: "Review web applications and admission requests",
                legacyKeys: ["manage_enquiries"]
            }
        ]
    },
    {
        id: "finance",
        label: "Finance & Accounts",
        description: "Student fee payments, collections history, cash ledger, expenses",
        permissions: [
            {
                id: "finance_fees",
                label: "Fee Collection",
                description: "Collect course/tuition fees and issue student receipts",
                legacyKeys: ["manage_fees"]
            },
            {
                id: "finance_collections",
                label: "Collection History",
                description: "View receipt transaction logs and payment breakdown",
                legacyKeys: ["manage_fees"]
            },
            {
                id: "finance_ledger",
                label: "Day Book & Ledger",
                description: "Daily accounting transactions and income summaries",
                legacyKeys: ["manage_fees"]
            },
            {
                id: "expenses_add",
                label: "Add Expenses",
                description: "Record operational expenses, bills, and vouchers"
            },
            {
                id: "expenses_report",
                label: "Expense Reports",
                description: "View expense analytics and categorization summaries"
            },
            {
                id: "expenses_master",
                label: "Expense Head Master",
                description: "Manage expense categories and accounting heads"
            },
            {
                id: "incomes_add",
                label: "Add Miscellaneous Income",
                description: "Record other institution revenues and non-fee deposits"
            },
            {
                id: "incomes_report",
                label: "Income Reports",
                description: "Analyze non-fee revenues and financial summaries"
            },
            {
                id: "incomes_master",
                label: "Income Head Master",
                description: "Manage revenue heads and classification categories"
            }
        ]
    },
    {
        id: "academic",
        label: "Academic Management",
        description: "Student directory, batches, courses, subjects, departments",
        permissions: [
            {
                id: "academic_students",
                label: "Students & Admissions",
                description: "View student directory and enroll new students",
                legacyKeys: ["manage_students"]
            },
            {
                id: "academic_courses",
                label: "Class & Course Management",
                description: "Configure academic courses, syllabi, and programs"
            },
            {
                id: "academic_subjects",
                label: "Subjects & Modules",
                description: "Manage course curriculum and assigned subjects"
            },
            {
                id: "academic_batches",
                label: "Sections & Batches",
                description: "Manage classroom batches, sections, and allocations"
            },
            {
                id: "academic_departments",
                label: "Departments",
                description: "Manage academic departments and shift timings"
            }
        ]
    },
    {
        id: "learning",
        label: "Learning & Classroom Operations",
        description: "Attendance, exams, study materials, notices, calendar",
        permissions: [
            {
                id: "learning_attendance",
                label: "Student Attendance",
                description: "Mark and verify daily classroom attendance"
            },
            {
                id: "learning_exams",
                label: "Online Examinations",
                description: "Schedule tests, publish question papers, record grades",
                legacyKeys: ["manage_exams"]
            },
            {
                id: "learning_question_bank",
                label: "Question Bank",
                description: "Create and manage question repository for exams"
            },
            {
                id: "learning_notices",
                label: "Notices & Circulars",
                description: "Publish circulars and announcements to students/staff",
                legacyKeys: ["manage_notices"]
            },
            {
                id: "learning_materials",
                label: "Study Materials",
                description: "Upload notes, assignments, and digital learning content"
            },
            {
                id: "learning_calendar",
                label: "Academic Calendar",
                description: "Schedule term holidays, exam dates, and institute events"
            }
        ]
    },
    {
        id: "facilities",
        label: "Facilities & Inventory",
        description: "Library, stock, transport routes, and hostel allocations",
        permissions: [
            {
                id: "facility_library",
                label: "Library Management",
                description: "Catalog books, process issues/returns, track fines",
                legacyKeys: ["manage_library"]
            },
            {
                id: "facility_stock",
                label: "Stock & Inventory",
                description: "Storekeeper inventory, supplier purchases, stock issues",
                legacyKeys: ["manage_stock"]
            },
            {
                id: "facility_transport",
                label: "Transport & Vehicles",
                description: "Manage bus routes, stops, and student transit",
                legacyKeys: ["manage_transport"]
            },
            {
                id: "facility_hostel",
                label: "Hostel & Rooms",
                description: "Manage hostel rooms, bed assignments, and dues",
                legacyKeys: ["manage_hostel"]
            }
        ]
    },
    {
        id: "hr",
        label: "Human Resources",
        description: "Staff directory, attendance logs, leave approvals, payroll",
        permissions: [
            {
                id: "hr_staff_directory",
                label: "Staff Directory",
                description: "View and manage faculty, office, and support staff"
            },
            {
                id: "hr_attendance",
                label: "Staff Attendance Logs",
                description: "Review staff biometric punches and daily attendance"
            },
            {
                id: "hr_leave_management",
                label: "Leave & Gate Pass Approvals",
                description: "Review and approve staff leaves and hourly exit passes"
            },
            {
                id: "hr_payslips",
                label: "Payslip Generator",
                description: "Calculate monthly payroll and generate staff payslips"
            },
            {
                id: "hr_salary_components",
                label: "Earnings & Deductions Master",
                description: "Configure allowances, PF, ESI, and tax components"
            },
            {
                id: "hr_designations",
                label: "Designations & Shift Timings",
                description: "Configure job titles, department shifts, and timings"
            },
            {
                id: "hr_settings",
                label: "HR Settings",
                description: "Institutional HR rules, work days, and punch limits"
            }
        ]
    },
    {
        id: "reports",
        label: "Reports & Analytics",
        description: "Institution reports, admissions metrics, attendance logs",
        permissions: [
            {
                id: "reports_followups",
                label: "Follow-up Queue Report",
                description: "Review enquiry call histories and overdue follow-ups",
                legacyKeys: ["view_reports"]
            },
            {
                id: "reports_attendance",
                label: "Attendance Analytics",
                description: "Comprehensive class and student attendance reports",
                legacyKeys: ["view_reports"]
            },
            {
                id: "reports_admissions",
                label: "Admissions Report",
                description: "Track enrollment trends and admission statistics",
                legacyKeys: ["view_reports"]
            }
        ]
    },
    {
        id: "admin_utilities",
        label: "Administration & Utilities",
        description: "ID cards, certificates, broadcast messaging, website builder",
        permissions: [
            {
                id: "admin_id_cards",
                label: "ID Card Management",
                description: "Design and print student & staff identity cards",
                legacyKeys: ["generate_id_cards"]
            },
            {
                id: "admin_certificates",
                label: "Certificates Management",
                description: "Issue and verify course completion certificates"
            },
            {
                id: "admin_completion_tracking",
                label: "Completion Tracking",
                description: "Track vocational module completion and progress"
            },
            {
                id: "admin_whatsapp",
                label: "WhatsApp Broadcast",
                description: "Send broadcast notifications to batches or contacts"
            },
            {
                id: "admin_approvals",
                label: "Approvals Queue",
                description: "Review pending administrative approvals"
            },
            {
                id: "admin_website",
                label: "Website Builder",
                description: "Edit public portal pages, banners, and institute details"
            },
            {
                id: "admin_website_results",
                label: "Website Results Publisher",
                description: "Publish board and institutional results on the public site"
            }
        ]
    }
];

// Flat list of all available permissions
export const ALL_PERMISSIONS = PERMISSION_CATEGORIES.flatMap(cat => 
    cat.permissions.map(p => ({ ...p, category: cat.id, categoryLabel: cat.label }))
);

// Backward-compatible alias for page imports
export const AVAILABLE_PERMISSIONS = ALL_PERMISSIONS;

/**
 * Checks whether a user's permissions array grants access to a required permission.
 * Supports legacy keys (e.g. 'view_front_office' grants 'front_office_visitor_book').
 */
export function hasUserPermission(userPermissions, requiredPermission) {
    if (!requiredPermission) return true;
    if (!userPermissions || !Array.isArray(userPermissions)) return false;

    // Direct match
    if (userPermissions.includes(requiredPermission)) return true;

    // Check if user has a legacy key that covers this permission
    const permDef = ALL_PERMISSIONS.find(p => p.id === requiredPermission);
    if (permDef?.legacyKeys?.some(key => userPermissions.includes(key))) {
        return true;
    }

    return false;
}
