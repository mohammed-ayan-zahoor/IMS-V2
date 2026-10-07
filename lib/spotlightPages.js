// Canonical directory of all accessible application pages for Spotlight Search navigation

export const APP_PAGES = [
    // --- Core & Dashboard ---
    {
        id: "nav-dashboard",
        type: "page",
        title: "Dashboard",
        metadata: "Overview & key metrics · Page",
        icon: "layout-dashboard",
        url: "/admin/dashboard",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["dashboard", "home", "stats", "overview", "analytics", "main"]
    },

    // --- Academic ---
    {
        id: "nav-students",
        type: "page",
        title: "Students Directory",
        metadata: "Student profiles & admissions · Academic",
        icon: "graduation-cap",
        url: "/admin/students",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["students", "directory", "admission", "enrollment", "pupil", "learner", "rolls"]
    },
    {
        id: "nav-courses",
        type: "page",
        title: "Courses & Classes",
        metadata: "Course syllabus & class list · Academic",
        icon: "book-open",
        url: "/admin/courses",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["courses", "classes", "programs", "syllabus", "grades", "standards"]
    },
    {
        id: "nav-subjects",
        type: "page",
        title: "Subjects",
        metadata: "Curriculum & syllabus mapping · Academic",
        icon: "book-open",
        url: "/admin/subjects",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["subjects", "curriculum", "syllabus", "topics", "modules", "units"]
    },
    {
        id: "nav-batches",
        type: "page",
        title: "Batches & Sections",
        metadata: "Class divisions & academic batches · Academic",
        icon: "layers",
        url: "/admin/batches",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["batches", "sections", "divisions", "groups", "cohorts", "classes"]
    },
    {
        id: "nav-departments",
        type: "page",
        title: "Departments & Shifts",
        metadata: "Academic departments & timing shifts · Academic",
        icon: "building",
        url: "/admin/departments",
        roles: ["admin", "super_admin"],
        keywords: ["departments", "shifts", "faculties", "streams", "wings", "timings"]
    },

    // --- Enquiries & Admissions ---
    {
        id: "nav-enquiries-new",
        type: "page",
        title: "New Enquiry / Lead",
        metadata: "Record prospective student lead · Enquiry",
        icon: "user-plus",
        url: "/admin/enquiries/new",
        roles: ["admin", "super_admin"],
        keywords: ["new enquiry", "add lead", "walk-in", "prospect", "admission enquiry", "lead capture"]
    },
    {
        id: "nav-enquiries-list",
        type: "page",
        title: "Enquiries & Leads",
        metadata: "Manage follow-ups & conversion pipeline · Enquiry",
        icon: "contact",
        url: "/admin/enquiries",
        roles: ["admin", "super_admin"],
        keywords: ["enquiries", "leads", "pipeline", "followups", "prospects", "calls"]
    },
    {
        id: "nav-enquiries-online",
        type: "page",
        title: "Online Applications",
        metadata: "Website admission applications · Enquiry",
        icon: "globe",
        url: "/admin/enquiries/applications",
        roles: ["admin", "super_admin"],
        keywords: ["online enquiry", "applications", "web forms", "registrations", "portal admissions"]
    },

    // --- Learning & Academics ---
    {
        id: "nav-attendance-student",
        type: "page",
        title: "Student Attendance",
        metadata: "Daily student register & status · Learning",
        icon: "calendar-check",
        url: "/admin/attendance",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["attendance", "student attendance", "absent", "present", "roll call", "register"]
    },
    {
        id: "nav-attendance-scan",
        type: "page",
        title: "Face / QR Attendance Scanner",
        metadata: "Quick kiosk scanner · Learning",
        icon: "scan",
        url: "/admin/attendance/scan",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["scan", "qr", "face scanner", "kiosk", "biometric scan", "fast attendance"]
    },
    {
        id: "nav-online-exams",
        type: "page",
        title: "Online Exams & Quizzes",
        metadata: "Computer-based testing & results · Learning",
        icon: "file-signature",
        url: "/admin/exams",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["exams", "online exams", "tests", "quizzes", "assessments", "cbt"]
    },
    {
        id: "nav-exams-create",
        type: "page",
        title: "Create Online Exam",
        metadata: "Configure new exam & schedule · Learning",
        icon: "file-signature",
        url: "/admin/exams/create",
        roles: ["admin", "super_admin", "instructor"],
        keywords: ["create exam", "new test", "schedule exam", "exam maker"]
    },
    {
        id: "nav-exams-offline-create",
        type: "page",
        title: "Create Offline Exam",
        metadata: "Pen & paper term exams and grade cards · Learning",
        icon: "file-signature",
        url: "/admin/exams/offline/create",
        roles: ["admin", "super_admin", "instructor"],
        keywords: ["offline exam", "paper exam", "midterm", "final exam", "unit test"]
    },
    {
        id: "nav-exams-grading-scales",
        type: "page",
        title: "Grading Scales & GPA",
        metadata: "Grading criteria & letter grades · Learning",
        icon: "award",
        url: "/admin/exams/grading-scales",
        roles: ["admin", "super_admin"],
        keywords: ["grading scales", "grades", "gpa", "marks scale", "grading system", "rubric"]
    },
    {
        id: "nav-question-bank",
        type: "page",
        title: "Question Bank",
        metadata: "MCQ & question repository · Learning",
        icon: "database",
        url: "/admin/question-bank",
        roles: ["admin", "super_admin", "instructor"],
        keywords: ["question bank", "questions", "mcq", "quiz bank", "test bank"]
    },
    {
        id: "nav-question-bank-create",
        type: "page",
        title: "Add Question",
        metadata: "New question for exams · Learning",
        icon: "database",
        url: "/admin/question-bank/create",
        roles: ["admin", "super_admin", "instructor"],
        keywords: ["add question", "new question", "create question", "mcq builder"]
    },
    {
        id: "nav-notices",
        type: "page",
        title: "Notices & Announcements",
        metadata: "Circulars, notice board & updates · Learning",
        icon: "megaphone",
        url: "/admin/notices",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["notices", "announcements", "circulars", "bulletin", "broadcast", "news"]
    },
    {
        id: "nav-materials",
        type: "page",
        title: "Study Materials & Notes",
        metadata: "Lecture notes, PDFs & assignments · Learning",
        icon: "file-text",
        url: "/admin/materials",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["materials", "study materials", "notes", "documents", "assignments", "homework", "pdfs"]
    },
    {
        id: "nav-calendar",
        type: "page",
        title: "School / Academic Calendar",
        metadata: "Holidays, events & academic schedule · Learning",
        icon: "calendar",
        url: "/admin/calendar",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["calendar", "events", "holidays", "schedule", "academic year", "vacation"]
    },

    // --- Finance & Fees ---
    {
        id: "nav-fees",
        type: "page",
        title: "Fees & Invoices",
        metadata: "Fee collection, dues & invoices · Finance",
        icon: "credit-card",
        url: "/admin/fees",
        roles: ["admin", "super_admin"],
        keywords: ["fees", "fee collection", "invoices", "tuition", "dues", "student fee", "payments"]
    },
    {
        id: "nav-fees-presets",
        type: "page",
        title: "Fee Structures & Presets",
        metadata: "Configure fee heads & templates · Finance",
        icon: "credit-card",
        url: "/admin/fees/presets",
        roles: ["admin", "super_admin"],
        keywords: ["fee presets", "fee structure", "templates", "fee heads", "installments"]
    },
    {
        id: "nav-collections",
        type: "page",
        title: "Collection History",
        metadata: "Receipt logs & cashier collection · Finance",
        icon: "receipt",
        url: "/admin/collections",
        roles: ["admin", "super_admin"],
        keywords: ["collection history", "receipts", "cashier", "paid receipts", "daily collection"]
    },
    {
        id: "nav-finance-ledger",
        type: "page",
        title: "Day Book & Ledger",
        metadata: "Double-entry accounts & cash book · Finance",
        icon: "receipt",
        url: "/admin/finance/ledger",
        roles: ["admin", "super_admin"],
        keywords: ["ledger", "day book", "cash book", "accounting", "balance sheet", "transactions"]
    },
    {
        id: "nav-accounts-master",
        type: "page",
        title: "Accounts Master",
        metadata: "Bank accounts & cash registers · Finance",
        icon: "building",
        url: "/admin/accounts",
        roles: ["admin", "super_admin"],
        keywords: ["accounts master", "bank accounts", "cash counter", "disbursing accounts", "collector"]
    },

    // --- Expenses ---
    {
        id: "nav-expenses-add",
        type: "page",
        title: "Add Expense",
        metadata: "Record outgoing payment · Expenses",
        icon: "receipt",
        url: "/admin/expenses/add",
        roles: ["admin", "super_admin"],
        keywords: ["add expense", "record expense", "new expense", "payment out", "cost"]
    },
    {
        id: "nav-expenses-report",
        type: "page",
        title: "Expense Report",
        metadata: "Summary & expenditure breakdown · Expenses",
        icon: "receipt",
        url: "/admin/expenses/report",
        roles: ["admin", "super_admin"],
        keywords: ["expense report", "spending", "expenditure", "costs", "analytics"]
    },
    {
        id: "nav-expenses-master",
        type: "page",
        title: "Expense Categories Master",
        metadata: "Expense heads & categories · Expenses",
        icon: "receipt",
        url: "/admin/expenses/master",
        roles: ["admin", "super_admin"],
        keywords: ["expense master", "expense categories", "expense heads", "types"]
    },

    // --- Incomes ---
    {
        id: "nav-incomes-add",
        type: "page",
        title: "Add Income",
        metadata: "Record miscellaneous revenue · Incomes",
        icon: "receipt",
        url: "/admin/incomes/add",
        roles: ["admin", "super_admin"],
        keywords: ["add income", "other income", "revenue", "deposit", "earnings"]
    },
    {
        id: "nav-incomes-report",
        type: "page",
        title: "Income Report",
        metadata: "Revenue breakdown & statement · Incomes",
        icon: "receipt",
        url: "/admin/incomes/report",
        roles: ["admin", "super_admin"],
        keywords: ["income report", "revenue report", "earnings statement"]
    },
    {
        id: "nav-incomes-master",
        type: "page",
        title: "Income Categories Master",
        metadata: "Income heads & sources · Incomes",
        icon: "receipt",
        url: "/admin/incomes/master",
        roles: ["admin", "super_admin"],
        keywords: ["income master", "income categories", "revenue heads"]
    },

    // --- Human Resources & Payroll ---
    {
        id: "nav-hr-staff",
        type: "page",
        title: "Staff Directory",
        metadata: "Faculty & employee profiles · HR",
        icon: "briefcase",
        url: "/admin/hr/staff",
        roles: ["admin", "super_admin"],
        keywords: ["staff", "faculty", "employees", "teachers", "directory", "instructors", "workers"]
    },
    {
        id: "nav-hr-attendance",
        type: "page",
        title: "Staff Attendance",
        metadata: "Daily biometric & manual punches · HR",
        icon: "calendar-check",
        url: "/admin/hr/attendance",
        roles: ["admin", "super_admin"],
        keywords: ["staff attendance", "punches", "biometric", "present staff", "absent staff", "overtime"]
    },
    {
        id: "nav-hr-payslips",
        type: "page",
        title: "Payslip Generator & Payroll",
        metadata: "Monthly salaries & disbursements · HR",
        icon: "receipt",
        url: "/admin/hr/payslips",
        roles: ["admin", "super_admin"],
        keywords: ["payslips", "payroll", "salary", "generate payslip", "compensation", "wages", "disburse"]
    },
    {
        id: "nav-hr-designations",
        type: "page",
        title: "HR Designations",
        metadata: "Job roles & designations · HR",
        icon: "briefcase",
        url: "/admin/hr/designations",
        roles: ["admin", "super_admin"],
        keywords: ["designations", "roles", "job titles", "positions"]
    },
    {
        id: "nav-hr-salary-components",
        type: "page",
        title: "Salary Earnings & Deductions",
        metadata: "Basic pay, allowances & PF · HR",
        icon: "receipt",
        url: "/admin/hr/salary-components",
        roles: ["admin", "super_admin"],
        keywords: ["salary components", "allowances", "deductions", "earnings", "hra", "da", "pf"]
    },
    {
        id: "nav-hr-leave-types",
        type: "page",
        title: "Leave Types",
        metadata: "Casual, sick & paid leave limits · HR",
        icon: "calendar",
        url: "/admin/hr/leave-types",
        roles: ["admin", "super_admin"],
        keywords: ["leave types", "leaves", "sick leave", "casual leave", "vacation days", "quota"]
    },
    {
        id: "nav-hr-leave-requests",
        type: "page",
        title: "Permissions & Leave Requests",
        metadata: "Pending leave approvals · HR",
        icon: "calendar",
        url: "/admin/hr/leave-requests",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["leave requests", "apply leave", "pending leaves", "permission", "time off"]
    },
    {
        id: "nav-hr-settings",
        type: "page",
        title: "HR Settings",
        metadata: "Payroll cycles & attendance policies · HR",
        icon: "settings",
        url: "/admin/hr/settings",
        roles: ["admin", "super_admin"],
        keywords: ["hr settings", "payroll settings", "work days", "grace period", "late penalty"]
    },

    // --- Front Office ---
    {
        id: "nav-fo-visitor-book",
        type: "page",
        title: "Visitor Book",
        metadata: "Campus visitors & gate passes · Front Office",
        icon: "contact",
        url: "/admin/front-office/visitor-book",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["visitor book", "visitors", "gate pass", "checkin", "guest"]
    },
    {
        id: "nav-fo-calls",
        type: "page",
        title: "Phone Call Log",
        metadata: "Inbound & outbound call records · Front Office",
        icon: "contact",
        url: "/admin/front-office/calls",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["phone call log", "calls", "telephone", "reception calls", "enquiries"]
    },
    {
        id: "nav-fo-postals",
        type: "page",
        title: "Postal Dispatch & Receive",
        metadata: "Courier & mail records · Front Office",
        icon: "contact",
        url: "/admin/front-office/postals",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["postals", "courier", "dispatch", "letters", "packages", "parcels"]
    },
    {
        id: "nav-fo-complaints",
        type: "page",
        title: "Complaints & Grievances",
        metadata: "Feedback & issue tracking · Front Office",
        icon: "contact",
        url: "/admin/front-office/complaints",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["complaints", "grievances", "tickets", "issues", "feedback", "support"]
    },

    // --- Inventory & Facilities ---
    {
        id: "nav-stock",
        type: "page",
        title: "Stock & Inventory",
        metadata: "Assets, supplies & item stocks · Inventory",
        icon: "boxes",
        url: "/admin/stock",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["stock", "inventory", "supplies", "stationery", "assets", "warehouse", "items"]
    },
    {
        id: "nav-library",
        type: "page",
        title: "Library Management",
        metadata: "Books, issues, returns & fines · Library",
        icon: "book-open",
        url: "/admin/library",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["library", "books", "borrow", "circulation", "fines", "catalog", "isbn"]
    },
    {
        id: "nav-transport",
        type: "page",
        title: "Transport & Fleet",
        metadata: "Buses, routes, drivers & stops · Transport",
        icon: "bus",
        url: "/admin/transport",
        roles: ["admin", "super_admin"],
        keywords: ["transport", "bus", "fleet", "routes", "drivers", "vehicles", "stops", "van"]
    },
    {
        id: "nav-hostel",
        type: "page",
        title: "Hostel & Rooms",
        metadata: "Rooms, beds & warden records · Hostel",
        icon: "building",
        url: "/admin/hostel",
        roles: ["admin", "super_admin"],
        keywords: ["hostel", "rooms", "beds", "dormitory", "warden", "accommodation", "residence"]
    },

    // --- Certificates & Identity ---
    {
        id: "nav-certificate-mgmt",
        type: "page",
        title: "Certificate Management",
        metadata: "Issue & customize student certificates · Records",
        icon: "award",
        url: "/admin/certificate-management",
        roles: ["admin", "super_admin"],
        keywords: ["certificate management", "certificates", "degrees", "diplomas", "templates", "awards"]
    },
    {
        id: "nav-id-cards",
        type: "page",
        title: "ID Card Management",
        metadata: "Design & bulk print ID cards · Records",
        icon: "contact",
        url: "/admin/id-cards",
        roles: ["admin", "super_admin"],
        keywords: ["id cards", "identity cards", "print id", "badges", "student id", "staff id"]
    },
    {
        id: "nav-id-cards-pdfme",
        type: "page",
        title: "ID Card Designer (PDFMe)",
        metadata: "Visual visual drag-and-drop ID editor · Records",
        icon: "contact",
        url: "/admin/id-cards-pdfme",
        roles: ["admin", "super_admin"],
        keywords: ["id card designer", "pdfme", "id templates", "badge designer"]
    },
    {
        id: "nav-completion-tracking",
        type: "page",
        title: "Completion Tracking",
        metadata: "Course completions & graduate tracking · Records",
        icon: "award",
        url: "/admin/completion-tracking",
        roles: ["admin", "super_admin"],
        keywords: ["completion tracking", "graduates", "alumni", "passed out", "course complete"]
    },
    {
        id: "nav-completion-analytics",
        type: "page",
        title: "Completion Analytics",
        metadata: "Vocational progress & completion rates · Records",
        icon: "award",
        url: "/admin/completion-analytics",
        roles: ["admin", "super_admin"],
        keywords: ["completion analytics", "completion stats", "dropouts", "retention"]
    },

    // --- Reports ---
    {
        id: "nav-reports-followups",
        type: "page",
        title: "Follow-up Queue Report",
        metadata: "Scheduled admissions & calls report · Reports",
        icon: "contact",
        url: "/admin/reports/follow-ups",
        roles: ["admin", "super_admin"],
        keywords: ["follow-up report", "pending calls", "overdue followups", "telecalling"]
    },
    {
        id: "nav-reports-attendance",
        type: "page",
        title: "Attendance Report",
        metadata: "Monthly aggregated attendance · Reports",
        icon: "calendar-check",
        url: "/admin/reports/attendance",
        roles: ["admin", "super_admin"],
        keywords: ["attendance report", "monthly attendance", "percentage", "defaulters"]
    },
    {
        id: "nav-reports-admissions",
        type: "page",
        title: "Admissions Report",
        metadata: "Enrollment metrics & intake trends · Reports",
        icon: "graduation-cap",
        url: "/admin/reports/admissions",
        roles: ["admin", "super_admin"],
        keywords: ["admissions report", "intake report", "student growth", "enrollment trends"]
    },

    // --- Website & CMS ---
    {
        id: "nav-website-builder",
        type: "page",
        title: "Website Builder & CMS",
        metadata: "Public school website & landing pages · CMS",
        icon: "globe",
        url: "/admin/website",
        roles: ["admin", "super_admin"],
        keywords: ["website builder", "cms", "portal", "pages", "homepage", "school website"]
    },
    {
        id: "nav-website-results",
        type: "page",
        title: "Website Results Portal",
        metadata: "Publish public exam results online · CMS",
        icon: "award",
        url: "/admin/website/results",
        roles: ["admin", "super_admin"],
        keywords: ["website results", "online results", "publish marks", "portal results"]
    },

    // --- Administration & Settings ---
    {
        id: "nav-approvals",
        type: "page",
        title: "Approvals & Audit Queue",
        metadata: "Pending transactions & critical approvals · Admin",
        icon: "shield-check",
        url: "/admin/approvals",
        roles: ["admin", "super_admin"],
        keywords: ["approvals", "pending approvals", "fee waivers", "refunds", "signoffs"]
    },
    {
        id: "nav-users",
        type: "page",
        title: "User Management & Permissions",
        metadata: "Admins, staff logins & access control · Admin",
        icon: "user-cog",
        url: "/admin/users",
        roles: ["admin", "super_admin"],
        keywords: ["user management", "users", "roles", "permissions", "access control", "logins", "passwords"]
    },
    {
        id: "nav-audit-logs",
        type: "page",
        title: "Audit Logs",
        metadata: "System activity & security audit trail · Admin",
        icon: "shield-alert",
        url: "/admin/audit-logs",
        roles: ["admin", "super_admin"],
        keywords: ["audit logs", "logs", "security logs", "activity history", "who deleted", "trail"]
    },
    {
        id: "nav-master-admin",
        type: "page",
        title: "Master Admin & Rules",
        metadata: "Campus rules, modules & policies · Admin",
        icon: "shield-alert",
        url: "/admin/settings/master-admin",
        roles: ["admin", "super_admin"],
        keywords: ["master admin", "policies", "rules", "system toggles", "configuration"]
    },
    {
        id: "nav-settings",
        type: "page",
        title: "Institute Settings",
        metadata: "General institute branding & academic year · Admin",
        icon: "settings",
        url: "/admin/settings",
        roles: ["admin", "super_admin"],
        keywords: ["settings", "general settings", "branding", "logo", "academic session", "preferences"]
    },
    {
        id: "nav-mou-tracker",
        type: "page",
        title: "MOU Tracker & Partnerships",
        metadata: "Corporate MOUs, internships & partners · Admin",
        icon: "file-signature",
        url: "/admin/mou-tracker",
        roles: ["super_admin"],
        keywords: ["mou tracker", "mou", "partnerships", "agreements", "contracts", "tieups"]
    },

    // --- Utilities & Communication ---
    {
        id: "nav-whatsapp",
        type: "page",
        title: "WhatsApp Broadcast",
        metadata: "Bulk WhatsApp alerts & templates · Utility",
        icon: "message-square",
        url: "/admin/utility/whatsapp-broadcast",
        roles: ["admin", "super_admin"],
        keywords: ["whatsapp", "whatsapp broadcast", "sms", "bulk message", "alerts", "notifications"]
    },
    {
        id: "nav-chat",
        type: "page",
        title: "Internal Staff Chat",
        metadata: "Direct messaging & campus chat · Utility",
        icon: "message-square",
        url: "/admin/chat",
        roles: ["admin", "super_admin", "instructor", "staff"],
        keywords: ["chat", "messages", "inbox", "team chat", "discussion"]
    },
    {
        id: "nav-backup",
        type: "page",
        title: "Database Backup",
        metadata: "Export campus database backup · Utility",
        icon: "database",
        url: "/admin/utility/backup",
        roles: ["super_admin"],
        keywords: ["backup", "database backup", "export data", "dump", "snapshot"]
    },
    {
        id: "nav-restore",
        type: "page",
        title: "Database Restore",
        metadata: "Restore database from backup file · Utility",
        icon: "database",
        url: "/admin/utility/restore",
        roles: ["super_admin"],
        keywords: ["restore", "restore database", "import backup", "recovery"]
    },

    // --- Super Admin Area ---
    {
        id: "nav-superadmin-dashboard",
        type: "page",
        title: "Super Admin Dashboard",
        metadata: "Multi-tenant cloud overview · Super Admin",
        icon: "layout-dashboard",
        url: "/super-admin",
        roles: ["super_admin"],
        keywords: ["super admin", "platform dashboard", "global metrics", "cloud"]
    },
    {
        id: "nav-superadmin-institutes",
        type: "page",
        title: "Institutes Directory",
        metadata: "All registered institutes & schools · Super Admin",
        icon: "building",
        url: "/super-admin/institutes",
        roles: ["super_admin"],
        keywords: ["institutes", "all schools", "tenants", "campuses", "branches", "colleges"]
    },
    {
        id: "nav-superadmin-coupons",
        type: "page",
        title: "Subscription Coupons",
        metadata: "Discount promo codes & billing · Super Admin",
        icon: "receipt",
        url: "/super-admin/coupons",
        roles: ["super_admin"],
        keywords: ["coupons", "promo codes", "discounts", "billing offers"]
    },
    {
        id: "nav-superadmin-shared-links",
        type: "page",
        title: "Shared Links & Access",
        metadata: "Public external links & resources · Super Admin",
        icon: "globe",
        url: "/super-admin/shared-links",
        roles: ["super_admin"],
        keywords: ["shared links", "public links", "external access"]
    }
];
