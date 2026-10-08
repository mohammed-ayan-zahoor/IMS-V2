"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const CONTACT = {
  company: "Quantech Infosystem LLP",
  registeredOffice: "Maharashtra, India",
  supportEmail: "admin@quantechinfosystemllp.com",
  grievanceOfficer: "Grievance Officer",
  grievanceEmail: "admin@quantechinfosystemllp.com",
  phone: "+91-XXXXXXXXXX",
};

export const TERMS_META = {
  version: "1.0",
  effectiveDate: "July 2026",
  lastUpdated: "October 2026",
};

export const SECTIONS = [
  /* ───────────────────────── 1. OVERVIEW ───────────────────────── */
  {
    id: "overview",
    label: "Overview",
    callout: {
      title: "Welcome!",
      body:
        "These Terms and Conditions govern your use of our educational ERP application and related services. Please read these Terms carefully. By accessing, logging in, or using our Platform, you agree to be bound by these Terms.",
    },
    clauses: [
      {
        heading: "1. Acceptance of Terms",
        paragraphs: [
          "By accessing or using this app, you agree to comply with these Terms and all applicable laws and regulations. If you are using the app on behalf of an organization or institution, you represent that you have the authority to bind that organization to these Terms.",
        ],
      },
      {
        heading: "2. Eligibility",
        paragraphs: [
          "You must be at least 18 years old or have the verified consent of a parent, guardian, or educational institution to use the app. By using the app, you affirm that you meet these eligibility requirements.",
        ],
      },
      {
        heading: "3. Account Registration",
        paragraphs: ["Some features may require creating an account. You agree to:"],
        items: [
          "Provide accurate, complete, and current information.",
          "Keep your login credentials confidential and secure.",
          "Promptly notify institution administrators of any unauthorized access.",
        ],
      },
      {
        heading: "4. Who We Are",
        paragraphs: [
          "Quantech Institute Management System (“Quantech IMS” or the “Platform”) is provided by Quantech Infosystem LLP (“Quantech”, “we”, “us”), a limited liability partnership registered in Maharashtra, India.",
          "Quantech licenses the Platform to schools, colleges and other educational institutions (each an “Institution”). Institutions then give access to their staff, faculty, students, parents, guardians and drivers (together, “Users”).",
        ],
      },
      {
        heading: "5. How Responsibility Is Shared",
        paragraphs: [
          "Your Institution decides what information is collected about you, why it is collected, and what happens with it. Quantech hosts, secures and processes that information only on the Institution's instructions.",
          "For questions about your records, admission, fees, discipline or employment, please contact your Institution first.",
        ],
      },
      {
        heading: "6. What the Platform Includes",
        paragraphs: [
          "The Platform is a web portal with companion Android and iOS apps for parents, students, faculty and bus drivers. Depending on the role your Institution gives you, you may use:",
        ],
        items: [
          "Admissions, student records and statutory identifiers.",
          "Fee structures, online payments, receipts and cash collection.",
          "Online and proctored examinations, marksheets and certificates.",
          "Transport with live bus tracking, hostel, library and inventory management.",
          "Staff records, attendance, leave and payroll.",
          "Alerts and documents sent by WhatsApp, SMS, email and push notification.",
        ],
      },
      {
        heading: "7. Changes to These Terms",
        paragraphs: [
          "We may update these Terms from time to time, for example when the law changes or when we add features. For a material change, we will tell you through the Platform or through your Institution before it takes effect.",
          "If you keep using the Platform after the effective date, you accept the updated Terms. If you do not agree, please stop using the Platform and speak to your Institution.",
        ],
      },
      {
        heading: "8. Contact Us",
        paragraphs: [
          `Questions about these Terms can be sent to ${CONTACT.company}, ${CONTACT.registeredOffice}, or by email to ${CONTACT.supportEmail}.`,
        ],
      },
    ],
  },

  /* ───────────────────────── 2. PRIVACY ───────────────────────── */
  {
    id: "privacy",
    label: "Privacy Policy",
    callout: {
      title: "Privacy at a glance",
      body:
        "Your Institution decides why your data is collected. Quantech stores and processes it securely, only on the Institution's instructions. We do not use children's data for tracking, advertising, profiling or commercial data mining.",
    },
    clauses: [
      {
        heading: "1. Roles Under the DPDP Act, 2023",
        paragraphs: [
          "Under India's Digital Personal Data Protection Act, 2023 (the “DPDP Act”), your Institution is the Data Fiduciary: it decides why and how your personal data is processed.",
          "Quantech Infosystem LLP is the Data Processor. We host, encrypt and process data strictly under the Institution's contractual instructions, and we do not use it for our own purposes.",
        ],
      },
      {
        heading: "2. Laws We Follow",
        paragraphs: [
          "Our handling of personal data is guided by the Information Technology Act, 2000 and the rules made under it, including the IT Rules, 2011 on reasonable security practices, and by the DPDP Act, 2023.",
        ],
      },
      {
        heading: "3. How We Protect Your Data",
        paragraphs: ["We use layered safeguards:"],
        items: [
          "Encryption at rest (AES-256) and in transit (TLS 1.3) for data in our primary database.",
          "Application-level encryption for Aadhaar numbers, so they are not stored in readable form.",
          "Passwords stored only as bcrypt hashes, and sessions protected by encrypted cookies.",
          "Role-based access control, so each person sees only what their role allows.",
          "Logical separation of every Institution's records, so one Institution cannot see another's.",
        ],
      },
      {
        heading: "4. Children's Data",
        paragraphs: [
          "Many Platform users are under 18. For them, verifiable consent is taken from a parent or guardian at admission (see Consent & Permissions).",
          "We do not carry out behavioural tracking, advertising, profiling or commercial data mining of children. Exam integrity monitoring and bus location, described in these Terms, exist only for education and safety purposes set by the Institution.",
        ],
      },
      {
        heading: "5. Who Can See Your Data",
        paragraphs: [
          "Access is limited by role. Teachers, administrators, accountants, medical officers, drivers and parents each see only the information their role needs. Medical records have stricter rules (see Health Data Confidentiality).",
          "Quantech personnel access Institution data only as needed to operate, secure and support the Platform, under the Institution's instructions.",
        ],
      },
      {
        heading: "6. Our Sub-Processors",
        paragraphs: [
          "We use trusted service providers for cloud database, media storage, payments, messaging, notifications and telephony. They process data only to deliver their part of the service. The full list is in Data Collection & Usage.",
        ],
      },
      {
        heading: "7. How Long We Keep Data",
        paragraphs: ["Retention depends on the type of data:"],
        items: [
          "Institution records are kept while the Institution's subscription is active.",
          "After termination, the Institution has a 30-day grace period to export its records. After that, all records, user credentials and uploaded media are permanently deleted from our production servers and backups.",
          "Security and audit logs are kept for 90 days and then deleted automatically.",
        ],
      },
      {
        heading: "8. Your Rights",
        paragraphs: ["Under the DPDP Act you can ask:"],
        items: [
          "For a summary of the personal data processed about you and who it has been shared with.",
          "To correct, complete or update your data.",
          "To erase your data when it is no longer needed and the law does not require it to be kept.",
          "To have a complaint or grievance addressed.",
          "To nominate someone to exercise your rights if you die or cannot act for yourself.",
        ],
      },
      {
        heading: "9. Making a Request or Complaint",
        paragraphs: [
          "Because your Institution is the Data Fiduciary, please send requests to the Institution first. We will help it respond promptly. For students under 18, a parent or guardian exercises these rights.",
          `If you cannot reach your Institution or are not satisfied, write to our Grievance Officer, ${CONTACT.grievanceOfficer}, at ${CONTACT.grievanceEmail}. We will respond within the time the law requires.`,
        ],
      },
      {
        heading: "10. Security Incidents",
        paragraphs: [
          "If we become aware of a personal data breach affecting an Institution's data, we will notify the Institution without undue delay so that it can meet its own legal duties, including informing affected people and the Data Protection Board of India where required.",
        ],
      },
    ],
  },

  /* ───────────────────────── 3. USER AGREEMENT ───────────────────────── */
  {
    id: "user-agreement",
    label: "User Agreement",
    callout: null,
    clauses: [
      {
        heading: "1. Permitted Use",
        paragraphs: [
          "Quantech grants each subscribing Institution a limited, non-exclusive, non-transferable and revocable right to use the Platform for its own educational administration and campus operations during the subscription term.",
          "The Platform may not be used for any other purpose or for the benefit of any other organization.",
        ],
      },
      {
        heading: "2. Institutional Governance",
        paragraphs: [
          "The Institution is responsible for how the Platform is used inside its organization. In particular, the Institution:",
        ],
        items: [
          "Appoints administrators and decides who gets an account and which role.",
          "Decides what data is collected and why, and gives people the privacy notices the law requires.",
          "Obtains and records the consent required for students under 18 before their data is entered.",
          "Is responsible for the admission, disciplinary, academic and employment decisions it makes using the Platform.",
          "Removes access promptly when a staff member leaves or a role changes.",
        ],
      },
      {
        heading: "3. Subscription Slots and Quota",
        paragraphs: [
          "Access is sold as capacity “slots”. One slot covers 10 active student records.",
          "If adding students would take the Institution above its purchased capacity, adding new students is locked until the quota is renewed or increased. This check is automatic.",
        ],
      },
      {
        heading: "4. Fees, Tax and Payments",
        paragraphs: [
          "Subscription fees are set out in the Institution's order or invoice. Goods and Services Tax (GST) is charged on SaaS slot billing at the standard rate of 18%, or the rate in force at the time of invoicing.",
          "Payments to Quantech are processed through Razorpay.",
        ],
      },
      {
        heading: "5. Fee Collection Between Institutions and Families",
        paragraphs: [
          "The Platform lets Institutions collect tuition, transport, hostel and other fees online or at cash counters, and issues numbered, tamper-evident PDF receipts.",
          "These fees are a matter between the Institution and the payer. Quantech is not a party to them and is not responsible for the Institution's fee policies, discounts, refunds or cash handling. Online payments are processed by Razorpay.",
        ],
      },
      {
        heading: "6. Ownership",
        paragraphs: [
          "The Institution keeps all ownership and intellectual property rights in the student records, grades and media it uploads (“Institutional Data”). Quantech uses Institutional Data only to provide the Platform.",
          "Quantech owns the Platform, including its source code, database architecture, and user interface and design. These Terms do not transfer any of those rights to you.",
        ],
      },
      {
        heading: "7. Availability and Disclaimers",
        paragraphs: [
          "We work to keep the Platform available and secure, but we cannot promise uninterrupted or error-free service. Except as these Terms state, the Platform is provided “as is” and “as available”, and we disclaim implied warranties to the extent the law allows.",
        ],
      },
      {
        heading: "8. Termination",
        paragraphs: [
          "The subscription may be ended by giving 30 days' written notice.",
          "We may suspend access sooner if there is serious misuse, a security risk or non-payment. Where we can, we will tell the Institution why.",
        ],
      },
      {
        heading: "9. Data Export and Deletion After Termination",
        paragraphs: [
          "After termination, the Institution has a 30-day grace period to export its administrative records using the Platform's Excel and PDF exporters.",
          "When the grace period ends, all database records, user credentials and Cloudinary media assets are permanently deleted from our production servers and backups. Deleted data cannot be recovered, so please export before the period ends.",
        ],
      },
      {
        heading: "10. Limitation of Liability",
        paragraphs: [
          "To the extent permitted by law, Quantech's total liability arising out of or relating to the Platform is limited to the subscription fees the Institution paid in the three (3) months immediately before the event that gave rise to the claim.",
          "Quantech is not liable for indirect or consequential loss, or for decisions an Institution makes using the Platform. Nothing in these Terms limits liability that cannot be limited under Indian law.",
        ],
      },
      {
        heading: "11. Governing Law and Disputes",
        paragraphs: [
          "These Terms are governed by the laws of India. The courts at Dhule, Maharashtra have exclusive jurisdiction over any dispute arising from them.",
        ],
      },
    ],
  },

  /* ───────────────────────── 4. DATA COLLECTION & USAGE ───────────────────────── */
  {
    id: "data-collection",
    label: "Data Collection & Usage",
    callout: null,
    clauses: [
      {
        heading: "1. Student and Admission Records",
        paragraphs: ["Institutions use the Platform to hold:"],
        items: [
          "Full legal name, date of birth and gender.",
          "Blood group, place of birth and nationality.",
          "Previous academic records.",
          "Caste or category, only where needed for statutory reservation compliance.",
          "Student photographs.",
        ],
      },
      {
        heading: "2. National and Statutory Identifiers",
        paragraphs: [
          "Only where the law requires or permits an Institution to collect them, the Platform can store:",
        ],
        items: [
          "Aadhaar number, encrypted at application level before it is stored.",
          "APAAR ID (Automated Permanent Academic Account Registry).",
          "PEN (Permanent Education Number).",
          "UDISE code (Unified District Information System for Education).",
        ],
      },
      {
        heading: "3. Academic and Examination Records",
        paragraphs: [
          "Marks, grades, marksheets, transfer certificates, timed online tests, question banks and answers.",
          "During proctored exams the Platform also records integrity events, described in User Responsibilities.",
        ],
      },
      {
        heading: "4. Fee and Financial Records",
        paragraphs: [
          "Fee structures, instalments, discount coupons, payments, serial-numbered receipts, and records of cash collected at staff counters and reconciled at the end of each day. Online payments are processed by Razorpay.",
        ],
      },
      {
        heading: "5. Transport, Hostel and Library",
        paragraphs: [
          "Bus tracking follows the vehicle, not individual students. The Platform also holds:",
        ],
        items: [
          "Transport: live GPS location of school buses during trips, vehicle records, driver licence details, and student boarding and deboarding records.",
          "Hostel: block, floor and room allocation, visitor check-in logs and time-stamped digital gate passes.",
          "Library: catalogue, barcodes, book transactions, holds and overdue fines.",
        ],
      },
      {
        heading: "6. Staff, Attendance and Payroll",
        paragraphs: ["For staff, Institutions can hold:"],
        items: [
          "Designation, department and employment contract.",
          "Bank account details for salary payments.",
          "Check-in records from biometric or geofenced attendance, and leave requests and approvals.",
          "Salary, allowances, deductions such as Provident Fund and tax, and payslips.",
        ],
      },
      {
        heading: "7. Documents and Media",
        paragraphs: [
          "Scanned admission documents, student and staff photographs, medical certificates and institutional media are held with our storage sub-processor, Cloudinary.",
        ],
      },
      {
        heading: "8. Account and Security Data",
        paragraphs: [
          "Login credentials (stored as bcrypt hashes), encrypted session information, and audit logs of security-relevant activity. Audit logs are deleted automatically after 90 days.",
        ],
      },
      {
        heading: "9. How We Use It",
        paragraphs: [
          "We use this data only to run the Platform for the Institution: to provide features, keep them secure, support the Institution and meet legal obligations.",
          "We do not sell personal data, and we do not use children's data for advertising, profiling or commercial data mining.",
        ],
      },
      {
        heading: "10. Sub-Processors",
        paragraphs: [
          "These providers help us run the Platform. Each processes data only for the purpose shown:",
        ],
        items: [
          "MongoDB Atlas: primary encrypted cloud database.",
          "Cloudinary: storage for scanned documents, photographs, medical certificates and media.",
          "Razorpay: payment gateway for student fees and subscription purchases.",
          "OpenWA / WhatsApp multi-device gateway: delivery of receipts, attendance alerts, exam schedules and payslips to verified phone numbers.",
          "Pusher and Pusher Beams: real-time updates and mobile push notifications.",
          "Exotel and Msg91: telephony, IVR, SMS alerts and OTP verification.",
        ],
      },
      {
        heading: "11. Transfers and Changes",
        paragraphs: [
          "Where a sub-processor stores or processes data outside India, this happens only as the DPDP Act allows, including any restrictions the Central Government notifies.",
          "We will update this list when our sub-processors change.",
        ],
      },
    ],
  },

  /* ───────────────────────── 5. HEALTH DATA CONFIDENTIALITY ───────────────────────── */
  {
    id: "health-confidentiality",
    label: "Health Data Confidentiality",
    callout: null,
    clauses: [
      {
        heading: "1. What Medical Data the Platform Holds",
        paragraphs: ["An Institution may record the following for its students:"],
        items: [
          "Medical history and chronic condition disclosures.",
          "Vaccination records and blood group.",
          "Emergency doctor contacts.",
          "Physical exemption certificates for sports or exams.",
        ],
      },
      {
        heading: "2. Sensitive by Default",
        paragraphs: [
          "We treat all medical data as sensitive personal data. It receives stricter access controls than ordinary records, and it is never used for any purpose other than the one the Institution collected it for.",
        ],
      },
      {
        heading: "3. Who Can See It",
        paragraphs: [
          "Medical data is visible only to the Institution's authorized medical officers and school administrators, enforced by role-based access control.",
          "It is not visible to general staff, other users or third parties. A teacher, for example, sees only what the Institution chooses to share, such as an exemption notice.",
        ],
      },
      {
        heading: "4. Why It Is Collected",
        paragraphs: [
          "The Institution collects medical data to look after student welfare, respond to emergencies and decide on exemptions. Emergency doctor contacts are held so authorized staff can reach the right person quickly.",
          "Quantech only hosts and secures this data for the Institution.",
        ],
      },
      {
        heading: "5. Medical Documents",
        paragraphs: [
          "Medical certificates are stored with our storage sub-processor, Cloudinary. Access to them follows the same role-based rules as the rest of the medical record.",
        ],
      },
      {
        heading: "6. No Secondary Use",
        paragraphs: [
          "Medical data is never used for advertising, profiling, analytics or commercial purposes, and it is not shared with third parties. Our infrastructure providers host it but are not given access to it for any other reason.",
        ],
      },
      {
        heading: "7. Your Choices",
        paragraphs: [
          "Parents and guardians can ask the Institution to correct or update a child's medical information, or to withdraw consent for its use.",
          "Please note that withdrawing consent may limit the Institution's ability to make accommodations that depend on that information.",
        ],
      },
    ],
  },

  /* ───────────────────────── 6. CONSENT & PERMISSIONS ───────────────────────── */
  {
    id: "consent-permissions",
    label: "Consent & Permissions",
    callout: null,
    clauses: [
      {
        heading: "1. Parental Consent for Students Under 18",
        paragraphs: [
          "Under Section 9 of the DPDP Act, 2023, a child's personal data may be processed only with the verifiable consent of a parent or lawful guardian.",
          "At admission, the parent or guardian gives this consent electronically when the application is submitted, before the student's data is processed.",
        ],
      },
      {
        heading: "2. What You Are Agreeing To",
        paragraphs: ["By giving consent, a parent or guardian agrees that the Institution may process, through the Platform:"],
        items: [
          "The student's admission, academic and examination records.",
          "National and statutory identifiers, where required.",
          "Health and medical information provided to the Institution.",
          "Fee, transport and hostel records.",
          "Photographs and documents uploaded for the student.",
        ],
      },
      {
        heading: "3. How Consent Is Recorded",
        paragraphs: [
          "Each consent is recorded with the date, time and the account that gave it. The Institution keeps this record for as long as it needs it to show that processing is lawful.",
        ],
      },
      {
        heading: "4. Messages You Will Receive",
        paragraphs: [
          "The Platform sends service messages by WhatsApp, SMS, email, push notification and IVR call. These include:",
        ],
        items: [
          "Fee receipts as PDF documents.",
          "Attendance alerts.",
          "Exam schedules and results notices.",
          "Salary payslips, for staff.",
          "One-time passwords (OTPs) for verification.",
        ],
      },
      {
        heading: "5. No Marketing Messages",
        paragraphs: [
          "These messages are sent to verified parent and staff phone numbers for Institution purposes only. We do not use them for advertising or promotions.",
        ],
      },
      {
        heading: "6. Phone Number Verification",
        paragraphs: [
          "A phone number is verified by OTP before alerts begin. If your number changes, please tell your Institution so that messages do not reach someone else.",
        ],
      },
      {
        heading: "7. Device Permissions",
        paragraphs: ["Some features ask for permission on your device:"],
        items: [
          "Notifications: to deliver alerts and updates.",
          "Location: for bus drivers during trips, and for staff using geofenced attendance.",
          "Camera: for proctored online exams.",
        ],
      },
      {
        heading: "8. Withdrawing Consent",
        paragraphs: [
          "You can withdraw consent at any time through your Institution. Withdrawing should be as easy as giving it.",
          "Withdrawal does not affect processing that already took place. It may mean that features depending on that data can no longer be used, and your data will be erased unless the law requires it to be kept.",
        ],
      },
      {
        heading: "9. If You Decline",
        paragraphs: [
          "If you decline these Terms, we will not create your account or process your data. For a student under 18, please speak to the Institution about how else to complete admission formalities.",
        ],
      },
    ],
  },

  /* ───────────────────────── 7. USER RESPONSIBILITIES ───────────────────────── */
  {
    id: "user-responsibilities",
    label: "User Responsibilities",
    callout: null,
    clauses: [
      {
        heading: "1. Keep Your Account Secure",
        paragraphs: ["Your account is yours alone. You agree to:"],
        items: [
          "Never share your password or one-time passwords.",
          "Log out on shared or public devices.",
          "Tell your Institution's administrators straight away if you suspect someone else has used your account.",
        ],
      },
      {
        heading: "2. Keep Records Accurate",
        paragraphs: [
          "Staff and administrators who enter marks, attendance, fees or other records must enter them accurately and correct mistakes promptly.",
          "Parents and guardians must give accurate and current information, including contact numbers. Quantech does not check the content that Institutions and Users enter.",
        ],
      },
      {
        heading: "3. Handle Other People's Data with Care",
        paragraphs: ["If your role gives you access to other people's information, you agree to:"],
        items: [
          "Look only at what your job needs.",
          "Not copy, screenshot, forward or share student, staff, medical or identity data outside the Institution's approved processes.",
          "Follow your Institution's data protection policies.",
        ],
      },
      {
        heading: "4. Online Exams and Academic Integrity",
        paragraphs: [
          "Students taking proctored exams must follow the exam rules and complete the exam on their own.",
          "During a proctored exam, the Platform records tab switches, window blur events, fullscreen exits, drops in camera connection, and the times at which they happen.",
          "This data is used only to check academic integrity and is shown to the Institution's exam controller. It is not used for any other purpose.",
          "A recorded event is not by itself proof of misconduct. The Institution is responsible for reviewing events fairly and giving the student a chance to respond before acting.",
        ],
      },
      {
        heading: "5. Be Ready for Exams",
        paragraphs: [
          "Use a stable internet connection and a working device camera, and keep the exam in fullscreen. Technical problems can look like integrity events, so tell your invigilator or exam controller if something goes wrong.",
        ],
      },
      {
        heading: "6. Fee Collectors",
        paragraphs: [
          "Staff who collect fees must record every payment in the Platform at the time it is received and complete the end-of-day cash reconciliation and any transfers accurately.",
        ],
      },
      {
        heading: "7. Drivers and Transport Staff",
        paragraphs: [
          "Drivers must keep the app running during trips so live location works, and must record boarding and deboarding accurately.",
        ],
      },
      {
        heading: "8. Institution Administrators",
        paragraphs: ["Administrators carry additional duties. You agree to:"],
        items: [
          "Collect and record parental consent before entering a student's data.",
          "Assign roles on a least-access basis.",
          "Remove access for staff who leave.",
          "Export any records you need before your subscription ends.",
        ],
      },
      {
        heading: "9. Reporting a Concern",
        paragraphs: [
          `If you notice a security problem, misuse or a mistake in your data, tell your Institution first. You can also write to us at ${CONTACT.supportEmail}.`,
        ],
      },
    ],
  },

  /* ───────────────────────── 8. PROHIBITED ACTIVITIES ───────────────────────── */
  {
    id: "prohibited-activities",
    label: "Prohibited Activities",
    callout: null,
    clauses: [
      {
        heading: "1. Reverse Engineering",
        paragraphs: [
          "You must not decompile, disassemble or reverse engineer the Platform, or try to derive its source code, database structure or internal workings. You must not copy its user interface or design.",
        ],
      },
      {
        heading: "2. Scraping and Automated Access",
        paragraphs: [
          "You must not use bots, crawlers, scripts or other automated tools to extract data from the Platform, except through the exporters and interfaces we provide. Bulk harvesting of records, contact details or documents is prohibited.",
        ],
      },
      {
        heading: "3. Unauthorized Access",
        paragraphs: ["You must not:"],
        items: [
          "Try to access another Institution's data or another person's account.",
          "Bypass or weaken role-based access controls, or raise your own access level.",
          "Probe, scan or test the Platform for vulnerabilities without our written permission.",
          "Share or sell login credentials.",
        ],
      },
      {
        heading: "4. Misuse of Personal Data",
        paragraphs: ["You must not:"],
        items: [
          "Sell, rent or disclose personal data held on the Platform, or use it outside your role.",
          "Use children's data for tracking, advertising, profiling or commercial purposes.",
          "Disclose medical records or identity numbers such as Aadhaar to anyone not authorized to see them.",
        ],
      },
      {
        heading: "5. Abuse of Messaging",
        paragraphs: [
          "You must not use the WhatsApp, SMS, email, push or IVR features to send spam, advertising, harassment or anything unrelated to the Institution's work.",
        ],
      },
      {
        heading: "6. Interfering with the Platform",
        paragraphs: [
          "You must not introduce malware, overload or disrupt the Platform, or tamper with audit logs. You must not try to get around quota limits or billing controls.",
        ],
      },
      {
        heading: "7. Falsifying Records and Cheating",
        paragraphs: ["You must not:"],
        items: [
          "Create or alter receipts, marks, attendance or certificates to misrepresent the facts.",
          "Impersonate another student, staff member or parent.",
          "Use tools or other people to defeat exam proctoring, or tamper with the integrity events the Platform records.",
        ],
      },
      {
        heading: "8. Resale and Sharing",
        paragraphs: [
          "You must not resell, sublicense, white-label or rent the Platform, or run one organization's data under another organization's subscription.",
        ],
      },
      {
        heading: "9. Consequences",
        paragraphs: [
          "If we believe these rules have been broken, we may suspend or end access, tell the affected Institution, remove content, report the matter to the authorities, and take legal action. We will act proportionately and, where we can, explain why.",
        ],
      },
    ],
  },
];

export default function TermsSheet({
    onAccept,
    onDecline,
    onBack,
    initialSectionId = "overview"
}) {
    const router = useRouter();
    const [activeSectionId, setActiveSectionId] = useState(initialSectionId);
    const [accepted, setAccepted] = useState(false);
    const [travelDirection, setTravelDirection] = useState(1);
    const [scrollTop, setScrollTop] = useState(0);
    
    const scrollPositionsRef = useRef({});
    const readingPaneRef = useRef(null);

    const activeIndex = SECTIONS.findIndex((s) => s.id === activeSectionId);
    const activeSection = SECTIONS[activeIndex] || SECTIONS[0];

    const handleSelectSection = (newId) => {
        if (newId === activeSectionId) return;
        const newIndex = SECTIONS.findIndex((s) => s.id === newId);
        
        if (readingPaneRef.current) {
            scrollPositionsRef.current[activeSectionId] = readingPaneRef.current.scrollTop;
        }

        setTravelDirection(newIndex > activeIndex ? 1 : -1);
        setActiveSectionId(newId);
    };

    useEffect(() => {
        if (readingPaneRef.current) {
            const saved = scrollPositionsRef.current[activeSectionId] || 0;
            readingPaneRef.current.scrollTop = saved;
            setScrollTop(saved);
        }
    }, [activeSectionId]);

    const handleScroll = (e) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.push("/login");
        }
    };

    const handleDeclineClick = () => {
        try {
            localStorage.removeItem("quantech_terms_agreed");
        } catch (e) {
            console.error("Failed to clear terms agreement:", e);
        }
        if (onDecline) {
            onDecline();
        } else {
            router.push("/login?declined=true");
        }
    };

    const handleAcceptClick = () => {
        setAccepted(true);
        try {
            localStorage.setItem("quantech_terms_agreed", "true");
        } catch (e) {
            console.error("Failed to save terms agreement:", e);
        }
        setTimeout(() => {
            if (onAccept) {
                onAccept();
            } else {
                router.push("/login?accepted=true");
            }
        }, 600);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            handleBack();
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            const nextIdx = (activeIndex + 1) % SECTIONS.length;
            handleSelectSection(SECTIONS[nextIdx].id);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            const prevIdx = (activeIndex - 1 + SECTIONS.length) % SECTIONS.length;
            handleSelectSection(SECTIONS[prevIdx].id);
        }
    };

    return (
        <div 
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            className="h-screen w-screen flex flex-col bg-white font-sans antialiased text-[#151515] outline-none select-none overflow-hidden"
        >
            <style jsx global>{`
                :root {
                    --tc-page: #FBEDE6;
                    --tc-surface: #FFFFFF;
                    --tc-hairline: #DEDEDE;
                    --tc-nav-selected: #E8E8E8;
                    --tc-nav-hover: #F3F3F3;
                    --tc-text: #151515;
                    --tc-text-nav: #333333;
                    --tc-text-body: #4F4F4F;
                    --tc-tint: #FDF6F1;
                    --tc-tint-strong: #FCEFEA;
                    --tc-accent-text: #BE371D;
                    --tc-accept-from: #CC4A27;
                    --tc-accept-to: #B63A1D;
                    --tc-r-callout: 12px;
                }
                .tc-fade-mask {
                    mask-image: linear-gradient(
                        to bottom,
                        transparent 0,
                        #000 var(--tc-fade-top, 0px),
                        #000 calc(100% - 98px),
                        transparent calc(100% - 66px)
                    );
                    -webkit-mask-image: linear-gradient(
                        to bottom,
                        transparent 0,
                        #000 var(--tc-fade-top, 0px),
                        #000 calc(100% - 98px),
                        transparent calc(100% - 66px)
                    );
                }
            `}</style>

            {/* Header (Full Width Top Bar) */}
            <header className="h-[44px] md:h-[48px] w-full flex items-center px-6 gap-3 bg-white border-b border-[#DEDEDE] z-20 shrink-0">
                <button
                    type="button"
                    onClick={handleBack}
                    aria-label="Go back"
                    className="p-1 -ml-1 text-[#151515] hover:opacity-75 active:scale-95 transition-all cursor-pointer rounded flex items-center justify-center"
                >
                    <ChevronLeft size={18} strokeWidth={1.75} />
                </button>
                <h1 className="text-[13px] md:text-[14px] font-medium text-[#151515] tracking-normal">
                    Terms &amp; Conditions
                </h1>
            </header>

            {/* Main Master-Detail Body */}
            <div className="flex-1 w-full grid grid-cols-[220px_1fr] sm:grid-cols-[240px_1fr] md:grid-cols-[270px_1fr] overflow-hidden">
                {/* Left Section Navigation */}
                <nav
                    role="tablist"
                    aria-orientation="vertical"
                    className="relative bg-white border-r border-[#DEDEDE] overflow-y-auto overflow-x-hidden z-10 select-none"
                >
                    {/* Shared Square Full-Bleed Selection Band */}
                    <motion.div
                        layoutId="tc-nav-highlight-fullscreen"
                        className="absolute left-0 right-0 h-[42px] bg-[#E8E8E8] pointer-events-none z-0"
                        style={{
                            top: `${activeIndex * 42}px`
                        }}
                        transition={{ type: "spring", bounce: 0, duration: 0.25 }}
                    />

                    {SECTIONS.map((sec) => {
                        const isSelected = sec.id === activeSectionId;
                        return (
                            <button
                                key={sec.id}
                                role="tab"
                                id={`tc-tab-${sec.id}`}
                                aria-selected={isSelected}
                                aria-controls={`tc-panel-${sec.id}`}
                                onClick={() => handleSelectSection(sec.id)}
                                className={`relative z-10 w-full h-[42px] px-[20px] flex items-center text-left text-[13.5px] md:text-[14px] leading-[42px] transition-colors cursor-pointer ${
                                    isSelected
                                        ? "font-semibold text-[#151515]"
                                        : "font-normal text-[#333333] hover:bg-[#F3F3F3]"
                                }`}
                            >
                                <span className="relative block truncate">
                                    {sec.label}
                                    <span
                                        aria-hidden="true"
                                        className="block h-0 font-semibold invisible overflow-hidden"
                                    >
                                        {sec.label}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {/* Right Reading Pane (Left-Aligned Layout) */}
                <main className="relative bg-white overflow-hidden flex flex-col justify-between">
                    <div
                        ref={readingPaneRef}
                        role="tabpanel"
                        id={`tc-panel-${activeSection.id}`}
                        aria-labelledby={`tc-tab-${activeSection.id}`}
                        onScroll={handleScroll}
                        style={{
                            "--tc-fade-top": scrollTop > 0 ? "24px" : "0px"
                        }}
                        className="tc-fade-mask flex-1 px-6 sm:px-10 md:px-14 lg:px-16 pt-7 pb-[90px] overflow-y-auto overscroll-contain select-text"
                    >
                        <div className="max-w-[760px] text-left">
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={activeSection.id}
                                    initial={{
                                        opacity: 0,
                                        y: travelDirection * 8
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0
                                    }}
                                    exit={{
                                        opacity: 0,
                                        y: travelDirection * -8
                                    }}
                                    transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                                    className="space-y-6"
                                >
                                    {/* Welcome Callout (If Section Has It) */}
                                    {activeSection.callout && (
                                        <div className="bg-[#FDF6F1] rounded-[12px] p-[15px_18px] shadow-[0_0_14px_4px_rgba(247,200,180,0.22)] mb-8">
                                            <h2 className="text-[13.5px] leading-[1.2] font-semibold text-[#BE371D] mb-1.5">
                                                {activeSection.callout.title}
                                            </h2>
                                            <p className="text-[12px] leading-[17px] text-[#4F4F4F]">
                                                {activeSection.callout.body}
                                            </p>
                                        </div>
                                    )}

                                    {/* Clauses List */}
                                    <div className="space-y-7">
                                        {activeSection.clauses?.map((clause, idx) => (
                                            <div key={idx} className="space-y-2">
                                                <h2 className="text-[13.5px] md:text-[14px] leading-[1.3] font-semibold text-[#151515]">
                                                    {clause.heading}
                                                </h2>
                                                
                                                {clause.paragraphs?.map((p, pIdx) => (
                                                    <p
                                                        key={pIdx}
                                                        className="text-[12px] md:text-[12.5px] leading-[19px] text-[#4F4F4F] text-pretty max-w-[72ch]"
                                                    >
                                                        {p}
                                                    </p>
                                                ))}

                                                {clause.items && (
                                                    <ul
                                                        role="list"
                                                        className="mt-2.5 space-y-1 pl-4 list-disc marker:text-slate-400 max-w-[72ch]"
                                                    >
                                                        {clause.items.map((item, lIdx) => (
                                                            <li
                                                                key={lIdx}
                                                                className="text-[12px] md:text-[12.5px] leading-[19px] text-[#4F4F4F] text-pretty pl-1"
                                                            >
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Right-Aligned Action Footer (Pinned Bottom Row) */}
                    <footer className="absolute bottom-0 right-0 left-0 h-[68px] flex items-center justify-end px-6 sm:px-10 md:px-14 pb-3.5 pointer-events-none z-20 bg-gradient-to-t from-white via-white/95 to-transparent">
                        <div className="flex items-center gap-3 pointer-events-auto">
                            {/* Decline Button */}
                            <button
                                type="button"
                                onClick={handleDeclineClick}
                                className="h-[38px] w-[109px] rounded-full bg-[#FCEFEA] text-[#BE371D] font-semibold text-[13px] shadow-[0_0_12px_3px_rgba(247,200,180,0.35)] hover:opacity-90 active:scale-[0.97] transition-all cursor-pointer flex items-center justify-center"
                            >
                                Decline
                            </button>

                            {/* Accept Button */}
                            <button
                                type="button"
                                onClick={handleAcceptClick}
                                className="h-[38px] w-[109px] rounded-full bg-gradient-to-br from-[#CC4A27] to-[#B63A1D] text-white font-semibold text-[13px] shadow-[0_4px_10px_-4px_rgba(200,74,39,0.30)] hover:brightness-105 active:scale-[0.97] transition-all cursor-pointer flex items-center justify-center"
                            >
                                <AnimatePresence mode="wait" initial={false}>
                                    {accepted ? (
                                        <motion.span
                                            key="accepted"
                                            initial={{ opacity: 0, scale: 0.7 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ type: "spring", bounce: 0, duration: 0.25 }}
                                            className="flex items-center gap-1.5"
                                        >
                                            <Check size={14} strokeWidth={2.5} />
                                            <span>Accepted</span>
                                        </motion.span>
                                    ) : (
                                        <motion.span
                                            key="accept"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            Accept
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </button>
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    );
}
