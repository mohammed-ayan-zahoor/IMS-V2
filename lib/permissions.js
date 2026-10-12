// Standardized permissions registry for role-based access control (RBAC) in IMS-V2
export const AVAILABLE_PERMISSIONS = [
    {
        id: "view_front_office",
        label: "Front Office",
        description: "Visitor book, call logs, postal dispatches, and complaints"
    },
    {
        id: "manage_fees",
        label: "Finance & Fee Collection",
        description: "Collect fees, issue receipts, and view payment ledger"
    },
    {
        id: "manage_enquiries",
        label: "Enquiries Desk",
        description: "Walk-in inquiries, applicant leads, and follow-ups"
    },
    {
        id: "manage_students",
        label: "Student Admissions & Records",
        description: "Student directory access and register new admissions"
    },
    {
        id: "manage_library",
        label: "Library Management",
        description: "Book catalog, issue/return books, and track fines"
    },
    {
        id: "manage_stock",
        label: "Stock & Inventory",
        description: "Store supplies, stock tracking, and item requisitions"
    },
    {
        id: "manage_notices",
        label: "Notices & Circulars",
        description: "Create and publish campus notices and announcements"
    },
    {
        id: "generate_id_cards",
        label: "ID Card Generation",
        description: "Generate and print student & staff identity cards"
    },
    {
        id: "manage_exams",
        label: "Exams & Results",
        description: "Online exams management and student marks entries"
    },
    {
        id: "manage_hostel",
        label: "Hostel Management",
        description: "Room allocations, warden registers, and hostel charges"
    },
    {
        id: "manage_transport",
        label: "Transport Management",
        description: "Bus routes, transport allocations, and driver records"
    },
    {
        id: "view_reports",
        label: "Reports & Summaries",
        description: "Institutional attendance and follow-up queue reports"
    }
];
