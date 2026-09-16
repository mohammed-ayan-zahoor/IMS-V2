# Quantech IMS — School Onboarding & Training Plan
### Standard Operating Procedure for MOU-Signed Institutions (Academic Year 2026–2027)

---

## 1. Executive Summary & Objectives

This document establishes the end-to-end Onboarding and Training Standard Operating Procedure (SOP) for all educational institutions that have signed a Memorandum of Understanding (MOU) for the **Quantech IMS / School ERP**.

### Primary Objectives
1. **Zero Data Bottlenecks**: Ingest complete student rosters, course structures, and faculty profiles prior to the live training sessions.
2. **Role-Specific Competency**: Deliver hands-on, role-tailored training sessions for School Leadership, Administrative Staff, and Teachers.
3. **Immediate Operational Adoption**: Transition school teachers from paper attendance to 30-second digital roll calls on Day 1.
4. **Fulfill MOU Commitments**: Deliver ID card generation, offline exam/report card workflows, fee tracking, and parent mobile app rollouts with verified sign-offs.

---

## 2. Onboarding Lifecycle Overview

```mermaid
flowchart TD
    subgraph PreTraining ["Phase 0: Pre-Training Setup (T-48h to T-12h)"]
        A1[Receive Signed MOU & UDISE] --> A2[Provision School Tenant & Code]
        A2 --> A3[Bulk Import Student Roster (.xlsx)]
        A3 --> A4[Provision Faculty & HOD Logins]
        A4 --> A5[Publish Annual Fixture & Calendar]
    end

    subgraph TrainingDay ["Phase 1: Training Day (3 Tracks)"]
        B1[Track A: Leadership & Admin / 60 Min]
        B2[Track B: Teachers & HODs / 60 Min]
        B3[Track C: Office & Transport / 45 Min]
    end

    subgraph GoLive ["Phase 2: Launch & Hypercare (Day 1 - Day 30)"]
        C1[Day 1-3: Live Morning Roll Call Standby]
        C2[Week 1: Friday Syllabus Check-off Audit]
        C3[Week 2: Fee & Receipt System Audit]
        C4[Day 30: First Unit Test & Report Cards]
    end

    PreTraining --> TrainingDay
    TrainingDay --> GoLive
```

---

## 3. Phase 0: Pre-Training Technical & Data Onboarding (T-48h to T-12h)

Training sessions must never be conducted on empty databases or raw demo setups. Before the trainers arrive on campus or launch the webinar, the school's actual tenant must be fully seeded and verified.

### 3.1 Tenant Provisioning
1. **Institute Identification**:
   * Create the institute in the database (or via Super-Admin portal `/super-admin/institutes`).
   * Configure Institute Code (e.g. `SHALOM01`, `AVIS01`, `QISDHL`).
   * Set Institute Type: `SCHOOL`.
   * Upload high-resolution school logo (used for ID cards and Report Cards).
2. **Academic Session Configuration**:
   * Set active academic session: `2026–2027` (Start: April 1, 2026 / June 1, 2026 to March 31, 2027).

### 3.2 Student Roster Ingestion
The ERP features an automated parser at `/api/v1/students/import` configured to ingest school spreadsheets (e.g., `Student List.xlsx`).

* **Required Columns in School Excel**:
  * `Admission No` (e.g., `SAES3556`)
  * `Student Name` (Full name)
  * `Class` (Supported syntax: `1st(A)`, `Grade 10 - A`, `X(B)`, `Jr.Kg(A)`)
  * `Date Of Birth` (DD-MM-YYYY)
  * `Gender` (`Male` / `Female`)
  * `Mobile Number` (Primary contact for parent login)
  * `Mothers Name`
  * `GR Number` (General Register number)
  * `Aadhar No` (Encrypted at rest with AES-256-GCM)
  * `PEN Number` & `APAAR ID` (Required for government UDISE+ compliance)
* **Self-Healing Automation**:
  * The ingestion engine dynamically detects and creates Courses (e.g., `1st Std`, `10th Std`) and Batches/Sections (e.g., `A`, `B`) without requiring pre-configuration.
  * Temporary passwords for students/parents default to `Student@123`.

### 3.3 Faculty & Staff Provisioning
* Create teacher accounts with role `instructor` (or via `scripts/seed-teacher.js`).
* Map teachers to their specific subjects and section batches (e.g., Mrs. Sharma → Grade 10-A Mathematics).
* Provide temporary credentials (e.g., `Teacher@123`).

### 3.4 Calendar & Annual Fixture Setup
* School fixtures (e.g., `ANNUAL FIXTURE 2026-2027.pdf` detailing term exams, holidays, and sports day) must be uploaded via **Admin → Notices**.
* Set Target Audience: `All Batches` and toggle `Is Pinned: true`.

---

## 4. Phase 1: Training Day Execution (Role-Based Tracks)

The training schedule is divided into three focused, hands-on tracks. Each participant works on their own device (laptop, tablet, or phone) during the session.

| Track | Target Audience | Duration | Key Outcome |
|---|---|---|---|
| **Track A** | Principal, Trustees, Headmaster, System Admins | 60 mins | Administrative oversight, ID card generation, notice broadcast, and fee policies |
| **Track B** | Teachers, Subject Faculty, Class Teachers, HODs | 60 mins | 30-sec attendance, syllabus check-off, exam marks entry, and report cards |
| **Track C** | Office Clerks, Accountants, Transport/Hostel Managers | 45 mins | Fee collection, manual receipts, dues follow-up, bus routes |

---

### 4.1 Track A: School Leadership & Administrative Office (60 Mins)

#### Agenda & Demonstration Script
1. **Master Student Directory & Verification (15 Mins)**:
   * Navigate to **Admin → Students**.
   * Demonstrate filtering by Class, Section, and Gender.
   * View complete student profiles including APAAR ID, PEN Number, and guardian contacts.
   * Highlight hardware-grade PII encryption (DPDP Act 2023 compliance).
2. **Bulk ID Card Generation & Printing (15 Mins)**:
   * Navigate to **Admin → ID Cards** (or `/admin/id-cards-pdfme`).
   * Select Batch (e.g. `Grade 1st - Section A`).
   * Preview generated ID cards containing school logo, student photo, emergency contacts, blood group, and unique verification QR code.
   * Demonstrate single-click PDF export ready for thermal/PVC card printers.
3. **Notices & Fixtures Management (15 Mins)**:
   * Navigate to **Admin → Notices → Create**.
   * Post a circular (e.g., "Parent-Teacher Meeting Schedule").
   * Attach PDFs; select target audiences (Whole School, Specific Class, or Staff Only).
   * Show that notices trigger real-time mobile push notifications.
4. **Leadership Analytics & Governance (15 Mins)**:
   * Executive Dashboard overview: live attendance rate today, total enrolled students, fee collections vs. dues.
   * HOD Syllabus Tracking view: identify which grade/subject is lagging behind the annual curriculum target.

---

### 4.2 Track B: Teachers & Faculty (Hands-On Workshop - 60 Mins)

Every teacher must execute each of the following four steps on their phone or laptop during this session.

#### Step 1: Daily Classroom Roll Call (10 Mins)
* **Objective**: Complete attendance for 40 students in under 30 seconds.
* **Execution**:
  1. Open **Admin → Attendance** (or Teacher Attendance Portal).
  2. Select Date, Class, and Section (e.g., `Grade 10 - Section A`).
  3. All students appear marked **"Present"** by default.
  4. Tap only the absent students to toggle them to **"Absent"** or **"Late"**.
  5. Click **Save Attendance**.
  6. *Live Verification*: Verify that absent students' parents immediately receive notification on the mobile app.

#### Step 2: Weekly Syllabus Progress Check-Off (15 Mins)
* **Objective**: Maintain dynamic syllabus coverage for HOD and Principal review.
* **Execution**:
  1. Open **Admin → Completion Tracking / Analytics**.
  2. Select assigned Subject (e.g. `Mathematics`).
  3. Expand Chapter → Topic (e.g. Chapter 1: Real Numbers → Topic 1.1: Euclid's Division Lemma).
  4. Check off the completed topic. Watch the progress bar dynamically recalculate from `0%` to `12%`.
  5. Add teaching notes: *"Completed exercise 1.1; additional practice problems scheduled for Friday."*

#### Step 3: Offline Exam Setup & Marks Entry (20 Mins)
* **Objective**: Create unit tests, input scores, add remarks, and handle absentees.
* **Execution**:
  1. Open **Admin → Exams → Offline → Create**.
  2. Title: `Unit Test 1 - July 2026`. Specify Maximum Marks (`50`) and Passing Marks (`18`).
  3. Go to **Marks Entry** tab.
  4. Enter marks for enrolled students:
     * Demonstrate numeric validation (scores cannot exceed maximum marks).
     * Demonstrate **Grace Marks** calculation.
     * Check **Absent** for students who missed the exam (system records zero with absent status).
  5. Enter Subjective Teacher Remarks per student (e.g., *"Excellent grasp of concepts; needs work on presentation"*).

#### Step 4: Instant Report Card Generation (15 Mins)
* **Objective**: Generate and print comprehensive CBSE/ICSE/State-board style report cards.
* **Execution**:
  1. Open **Admin → Exams → Offline → [Test ID] → Reports**.
  2. Click **Generate All Report Cards**.
  3. Inspect layout:
     * Scholastic subject-wise breakdown (Max Marks, Obtained, Grade).
     * Co-scholastic evaluation (Discipline, Attendance percentage, Conduct).
     * Overall Rank and Performance summary.
     * Teacher and Principal signature sections.
  4. Demonstrate PDF download and bulk print readiness.

---

### 4.3 Track C: Front Desk, Accounts & Operations (45 Mins)

#### Agenda & Demonstration Script
1. **Fee Presets & Fee Structure (15 Mins)**:
   * Open **Admin → Fees → Presets**.
   * Define fee slabs: Tuition Fee, Term Fee, Computer/Lab Fee, Transport Fee.
   * Setup installment schedules (Quarterly, Bi-annual, Annual).
2. **Fee Collection & Manual Receipt Generation (15 Mins)**:
   * Open **Admin → Receipts / Collect Fee**.
   * Search student by Name or Admission No (`SAES3556`).
   * Select installment, payment mode (`Cash`, `UPI`, `Cheque`, `Bank Transfer`).
   * Enter transaction reference / cheque number.
   * Issue instant printable receipt with school stamp and serial number.
3. **Overdue & Defaulter Tracking (15 Mins)**:
   * Filter fee ledger by status (`Overdue`, `Partial`).
   * Generate class-wise fee dues list.
   * Trigger SMS/Push payment reminder templates.

---

## 5. Phase 2: Parent & Student Launch (App Rollout)

Following staff training, the school rolls out the **Quantech Student App** to parents.

```
Parent receives Circular & SMS 
  → Downloads Quantech Student App from Play Store / App Store
  → Inputs Institute Code (e.g., SHALOM01)
  → Logs in with Registered Mobile Number & Default Password (Student@123)
  → Prompts for 1-time Password Reset
  → Instant access to Attendance, Timetable, Notices, Fees & Report Cards
```

### Rollout Collateral Provided to School:
1. **Parent Circular (Official Notice)**: Explains the digital transformation, login steps, and Play Store/App Store links.
2. **Printed Credential Slips**: Batch-generated slips distributed to class teachers to hand to students in their diaries.
3. **Parent Helpdesk FAQ**: Clear instructions for password recovery and multi-child switching.

---

## 6. Phase 3: Post-Training "Go-Live" Hypercare (Day 1 – Day 30)

To guarantee zero drop-off, the Quantech Implementation Team provides proactive monitoring and support:

```
Day 1 to Day 3:
  • Morning Standby (07:45 AM - 09:00 AM): Dedicated support engineer on WhatsApp/phone
  • Real-time check of attendance submission counts per batch
  • Immediate assistance for teachers facing login or roster questions

Day 7 (End of Week 1):
  • First Friday Syllabus Audit: Review completion check-offs with HODs
  • Review unassigned students or new transfer admissions

Day 14 (End of Week 2):
  • Fee reconciliation check with school accountant
  • Audit of ID cards printed vs. pending

Day 30 (End of Month 1):
  • Supervised execution of the first unit test marks entry
  • Batch export of first term progress report cards
  • Formal MOU Milestone Sign-off with Principal / Educational Head
```

---

## 7. Support Escalation Matrix

| Level | Responsible Party | Scope | Resolution Target |
|---|---|---|---|
| **Tier 1 (Campus)** | School System Admin / Head Clerk | Password resets, new student additions, device permissions | Immediate (< 15 mins) |
| **Tier 2 (ERP Lead)** | Quantech Account Manager & Dedicated Trainer | Data import corrections, fee slab adjustments, report template tweaks | < 2 hours |
| **Tier 3 (Core Engineering)** | Quantech Backend / DevOps Team | Server availability, DB synchronization, bug fixes | < 4 hours (Critical: < 1 hour) |

---

## 8. Onboarding & Training Deliverables Checklist

- [ ] **MOU Verification**: Confirmed student count, UDISE code, and primary contact.
- [ ] **Tenant Provisioned**: School code created, academic session `2026-27` activated, logo uploaded.
- [ ] **Student Data Ingested**: Full roster imported from Excel, verified across all grades and sections.
- [ ] **Faculty Credentials Issued**: All teachers assigned to courses/batches with verified login credentials.
- [ ] **Annual Fixture Uploaded**: Pinned notice published with school calendar PDF attached.
- [ ] **Track A (Leadership & Admin) Completed**: Principal and office staff trained on governance and ID cards.
- [ ] **Track B (Teachers) Completed**: 100% of teachers successfully marked mock/live attendance and entered sample marks.
- [ ] **Track C (Accounts) Completed**: Fee presets configured and sample receipt generated.
- [ ] **Parent Circular Dispatched**: App download instructions sent to parents.
- [ ] **MOU Milestone Sign-off**: Signed training completion certificate received from Principal.
