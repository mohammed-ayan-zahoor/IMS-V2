# IMS V2 - Architecture & Data Flow Diagrams

## 1. Current Student Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STUDENT LIFECYCLE FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: ENQUIRY
┌──────────────┐
│  Enquiry DB  │  status: 'Pending'|'Confirmed'|'Rejected'
│  - Student   │  ↓ Manual follow-up process
│  - Contact   │
│  - Course    │
└──────────────┘
       ↓
       
Step 2: ADMISSION APPLICATION
┌─────────────────────────────┐
│ AdmissionApplication DB     │  status: 'pending'|'converted'|'cancelled'
│ - First Name, Last Name     │  ↓ Admin converts application
│ - Email, Phone              │
│ - Date of Birth             │
│ - Course & Learning Mode    │
│ - Guardian Details          │
│ - Address                   │
└─────────────────────────────┘
       ↓
       ↓ [Admin Action: Convert]
       ↓ POST /api/v1/admissions/convert
       
Step 3: USER/STUDENT CREATED
┌─────────────────────────────┐
│     User (Student)          │  role: 'student'
│ - Enrollment #: STU2024XXXX │  ↓ Auto-generated on creation
│ - Email (unique)            │
│ - Password Hash             │
│ - Profile (name, DOB, etc)  │
│ - Guardian Details          │
│ - Institute ID              │
│ - createdAt timestamp       │
│                             │  STATUS: 'enrolled' (PLANNED - MISSING)
└─────────────────────────────┘
       ↓
       
Step 4: BATCH ENROLLMENT
┌─────────────────────────────┐
│     Batch Document          │
│ ├─ enrolledStudents: []     │
│ │  ├─ student: ObjectId     │
│ │  ├─ enrolledAt: Date      │
│ │  └─ status: 'active'      │
│ ├─ course: ObjectId         │
│ ├─ capacity: 30             │
│ └─ institute: ObjectId      │
└─────────────────────────────┘
       ↓
       
Step 5: FEE RECORD CREATED
┌─────────────────────────────┐
│     Fee Document            │
│ ├─ student: ObjectId        │
│ ├─ batch: ObjectId          │
│ ├─ totalAmount: 5000        │
│ ├─ installments: [...]      │
│ ├─ status: 'not_started'    │
│ └─ deletedAt: null (active) │
└─────────────────────────────┘
       ↓
       
Step 6: PAYMENT TRACKING
│ Installments updated as payments received
│ status: 'pending' → 'paid'
│ Fee.status: 'not_started' → 'partial' → 'paid'
       ↓
       
Step 7: ⚠️ MISSING COMPLETION TRACKING
│ No completion check
│ No certificate issuance
│ No completion status update
│ Batch status stays 'active' forever
       ↓
       
THE GAP (WHAT WE'RE BUILDING):
│
├─ ✓ Check completion eligibility
│  └─ Attendance >= 75%
│  └─ Fees paid (status: 'paid')
│  └─ Exams passed (if applicable)
│
├─ ✓ Mark as completed
│  └─ Update batch enrollment status: 'completed'
│  └─ Update User.lifecycleStatus: 'completed'
│
├─ ✓ Generate certificate
│  └─ Create Certificate document
│  └─ Generate PDF with template
│  └─ Generate QR code for verification
│
└─ ✓ Verify certificate
   └─ Public endpoint with verification code
```

---

## 2. Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DATABASE RELATIONSHIPS                               │
└─────────────────────────────────────────────────────────────────────────┘

                              Institute (Multiple)
                                    ↑
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ↓               ↓               ↓
    
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │       User       │  │      Batch       │  │      Course      │
    │                  │  │                  │  │                  │
    │ (Students +      │  │ enrolledStudents │  │ fees: {amount}   │
    │  Staff)          │  │    (ref User)    │  │ subjects: []     │
    │                  │  │                  │  │                  │
    │ role: 'student'  │  │ course (ref)     │  │                  │
    │                  │  │ instructor (ref) │  │                  │
    │ ← Membership     │  │ capacity: 30     │  │                  │
    │   (per inst)     │  │                  │  │                  │
    └──────────────────┘  └──────────────────┘  └──────────────────┘
            ↑                      ↑                      ↑
            │                      │                      │
            └──────────┬───────────┘                      │
                       ↓                                  │
                  ┌─────────────┐                        │
                  │    Fee      │                        │
                  │             │ (Many per Student)    │
                  │ student (─) │                        │
                  │ batch (ref) ├────────────────────────┘
                  │ status: ... │
                  │             │
                  └─────────────┘
                       ↑
                       │ (Will reference)
                       │
                  ┌─────────────────┐
                  │  Certificate    │ (NEW MODEL)
                  │                 │
                  │ student (ref)   │
                  │ batch (ref)     │
                  │ status: issued  │
                  │ pdfUrl: ...     │
                  └─────────────────┘

    Supporting Models:
    ┌─────────────────────┐  ┌─────────────────┐  ┌──────────────────┐
    │ AdmissionApplication│  │    Enquiry      │  │    Exam          │
    │                     │  │                 │  │                  │
    │ status: 'pending'   │  │ status:         │  │ batches: []      │
    │        ↓ (convert)  │  │  'Pending'      │  │ passingMarks: 50 │
    │        'converted'  │  │ followUpDate    │  │ totalMarks: 100  │
    │                     │  │                 │  │                  │
    └─────────────────────┘  └─────────────────┘  └──────────────────┘
             ↓                                            ↑
             │ (becomes)                                 │
             └────────────────────────┬──────────────────┘
                                      ↓
                            ┌──────────────────────┐
                            │  ExamSubmission      │
                            │                      │
                            │ student (ref)        │
                            │ exam (ref)           │
                            │ score: 85            │
                            │ percentage: 85       │
                            │ status: 'evaluated'  │
                            └──────────────────────┘
```

---

## 3. API Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          API REQUEST FLOW                                │
└──────────────────────────────────────────────────────────────────────────┘

CLIENT (Admin Dashboard)
  ↓
  │ GET /api/v1/dashboard/stats
  ↓
MIDDLEWARE: getInstituteScope()
  │ ├─ Verify JWT token
  │ ├─ Check user role (admin/super_admin)
  │ ├─ Get institute context (from Membership)
  │ └─ Return scope object
  ↓ [scope object contains: { instituteId, isSuperAdmin, userId }]
  │
  ├─ Query 1: Count Students
  │  └─ User.countDocuments({ 
  │       role: 'student', 
  │       deletedAt: null, 
  │       institute: instituteId 
  │     })
  │
  ├─ Query 2: Count Enrollments
  │  └─ Batch.aggregate([
  │       { $match: { institute: instituteId } },
  │       { $project: { 
  │           enrollmentCount: { $size: { $ifNull: ["$enrolledStudents", []] } } 
  │         }},
  │       { $group: { _id: null, total: { $sum: "$enrollmentCount" } } }
  │     ])
  │
  ├─ Query 3: Top Courses
  │  └─ Batch.aggregate([GROUP BY course, SORT BY enrollment count])
  │
  ├─ Query 4: Recent Admissions
  │  └─ User.find({ role: 'student', institute: id })
  │       .sort({ createdAt: -1 })
  │       .limit(5)
  │
  └─ Query 5: Revenue Trends
     └─ Fee.aggregate([GROUP BY month, SUM installments.amount WHERE paid])

  ↓ [All queries executed in parallel with Promise.all()]

  ↓ Format Response
  {
    counts: { students, coursesEnrolled, staff, enquiries },
    trends: { student: %, enquiry: %, enrollment: % },
    topCourses: [...],
    recentAdmissions: [...],
    revenueTrends: [{label, total}],
    totalRevenue: number
  }

  ↓
RESPONSE → CLIENT
  └─ Dashboard renders with data
     ├─ StatCard displays: 47 STUDENTS, +5%
     ├─ RecentAdmissions list
     ├─ Top Performing Courses
     └─ Admission Revenue Trends chart
```

---

## 4. Student Creation Flow (Admission → Enrollment)

```
┌───────────────────────────────────────────────────────────────────────┐
│              CONVERSION FLOW: APPLICATION → STUDENT                   │
└───────────────────────────────────────────────────────────────────────┘

Admin clicks "Convert to Student" on Admission Application
│
↓
POST /api/v1/admissions/convert
│
├─ Body: { applicationId, batchId }
│
├─ Authentication: admin/super_admin only
│
├─ Find AdmissionApplication by ID
│  └─ Verify status === 'pending'
│
├─ Map application data → student data
│  {
│    email: application.email,
│    institute: application.institute,
│    profile: {
│      firstName: application.firstName,
│      lastName: application.lastName,
│      phone: application.phone,
│      address: application.address,
│      avatar: application.photo
│    },
│    guardianDetails: {
│      name: application.guardian.name,
│      phone: application.guardian.phone,
│      relation: application.guardian.relation
│    },
│    referredBy: application.referredBy
│  }
│
├─ Call StudentService.createStudent(studentData, adminId)
│  │
│  ├─ Check user exists (skip if email already exists)
│  │
│  ├─ Hash password (use DEFAULT_STUDENT_PASSWORD from env)
│  │
│  ├─ Create User document
│  │  └─ role: 'student'
│  │  └─ institute: passed in data
│  │  └─ enrollmentNumber: AUTO-GENERATED
│  │     ├─ Find/Create Counter: student_enrollment_2024
│  │     ├─ Increment sequence
│  │     └─ Generate: STU2024[0001]
│  │
│  ├─ Create Membership record
│  │  ├─ user: newly created user._id
│  │  ├─ institute: same
│  │  ├─ role: 'student'
│  │  └─ isActive: true
│  │
│  └─ Log audit entry: 'student.create'
│
├─ Call StudentService.enrollInBatch(userId, batchId, adminId, instituteId)
│  │
│  ├─ Verify student exists & is active (deletedAt: null)
│  │
│  ├─ Verify batch exists & has capacity
│  │
│  ├─ Add to batch.enrolledStudents[]
│  │  {
│  │    student: userId,
│  │    enrolledAt: Date.now(),
│  │    status: 'active'
│  │  }
│  │
│  ├─ Create Fee record
│  │  {
│  │    student: userId,
│  │    batch: batchId,
│  │    institute: instituteId,
│  │    totalAmount: batch.course.fees.amount,
│  │    installments: [],
│  │    status: 'not_started'
│  │  }
│  │
│  └─ Log audit entry: 'batch.enroll'
│
├─ Update AdmissionApplication
│  ├─ status: 'converted'
│  └─ notes: append "[System]: Converted to student on [timestamp]"
│
↓
RESPONSE: Success
{
  success: true,
  message: "Student created and enrolled successfully",
  studentId: "64abc123..."
}

↓
UI Updates:
├─ Redirect to student profile page
├─ Show success toast notification
├─ Dashboard reflects new student count (+1)
└─ Student can now log in with credentials
```

---

## 5. Current Student Model Fields

```
User Collection (Students)

┌─ IDENTIFICATION
│  ├─ _id: ObjectId (MongoDB generated)
│  ├─ email: String (unique per institute)
│  ├─ enrollmentNumber: String (STU2024XXXX, unique per institute)
│  └─ role: 'student' (enum)
│
├─ AUTHENTICATION
│  ├─ passwordHash: String (bcrypt hashed)
│  ├─ passwordResetToken: String
│  ├─ passwordResetExpires: Date
│  ├─ passwordChangeRequested: Boolean
│  └─ lastLogin: Date
│
├─ PROFILE
│  └─ profile: Object
│     ├─ firstName: String (required)
│     ├─ lastName: String (required)
│     ├─ phone: String
│     ├─ gender: Enum ['Male','Female','Other','Not Specified']
│     ├─ avatar: String (URL)
│     ├─ dateOfBirth: Date
│     └─ address: Object
│        ├─ street: String
│        ├─ city: String
│        ├─ state: String
│        └─ pincode: String
│
├─ GUARDIAN
│  └─ guardianDetails: Object
│     ├─ name: String
│     ├─ phone: String
│     └─ relation: Enum ['father','mother','guardian','other']
│
├─ INSTITUTIONAL
│  ├─ institute: ObjectId (ref: Institute) - PRIMARY INSTITUTE
│  └─ referredBy: String
│
├─ RBAC (for non-students, ignored for students)
│  └─ assignments: Object
│     ├─ batches: [ObjectId]
│     └─ courses: [ObjectId]
│
├─ SOFT DELETE
│  ├─ deletedAt: Date (null = active, Date = deleted)
│  └─ deletedBy: ObjectId (ref: User)
│
└─ TIMESTAMPS
   ├─ createdAt: Date (auto)
   └─ updatedAt: Date (auto)

VIRTUALS (Computed):
├─ fullName: `${firstName} ${lastName}`
└─ isActive: deletedAt === null
```

---

## 6. Proposed Certificate System Integration

```
┌──────────────────────────────────────────────────────────────────────┐
│                    CERTIFICATE SYSTEM (NEW)                          │
└──────────────────────────────────────────────────────────────────────┘

User (Student) [EXTENDED]
│
├─ + lifecycleStatus: Enum
│  └─ 'enquiry'|'applicant'|'enrolled'|'active'|'completed'|'dropped'|'graduated'
│
├─ + enrollmentMetadata: Object
│  ├─ firstEnrollmentDate: Date
│  ├─ completionDate: Date
│  ├─ completionNotes: String
│  └─ certificateId: ObjectId (ref: Certificate)
│
└─ Virtual: canGenerateCertificate

  ↓ [eligibility check]
  
CompletionService.checkEligibility(studentId, batchId)
│
├─ Check 1: Enrollment Status
│  └─ batch.enrolledStudents.status === 'active'
│
├─ Check 2: Attendance >= 75%
│  └─ Count attendance records / total classes
│
├─ Check 3: Fees Paid
│  └─ Fee.status === 'paid'
│
├─ Check 4: Exam Passed (if applicable)
│  └─ ExamSubmission.score >= passingMarks
│
└─ Check 5: Course Duration Completed
   └─ Now > batch.schedule.endDate

  ↓ [if all checks pass]

POST /api/v1/students/[id]/complete
│
├─ Mark Student as Completed
│  ├─ User.lifecycleStatus: 'completed'
│  ├─ User.enrollmentMetadata.completionDate: Date.now()
│  └─ Batch.enrolledStudents.status: 'completed'
│
└─ Log audit: 'student.completed'

  ↓

POST /api/v1/students/[id]/certificate
│
├─ Generate Certificate
│  │
│  ├─ Create Certificate document
│  │  ├─ student: studentId
│  │  ├─ batch: batchId
│  │  ├─ course: courseId
│  │  ├─ institute: instituteId
│  │  ├─ certificateNumber: AUTO-GENERATED (CERT2024XXXX)
│  │  ├─ issuedDate: Date.now()
│  │  ├─ issuedBy: adminId
│  │  ├─ status: 'issued'
│  │  ├─ verificationCode: RANDOM_TOKEN
│  │  └─ pdfUrl: generated
│  │
│  ├─ Collect eligibility data
│  │  ├─ attendancePercentage
│  │  ├─ avgScore
│  │  ├─ feesPaid: true
│  │  └─ examPassed: true
│  │
│  ├─ Generate PDF
│  │  ├─ Use template
│  │  ├─ Fill in student data
│  │  └─ Save to cloud storage (Cloudinary)
│  │
│  ├─ Generate QR Code
│  │  └─ Encodes: /verify/{verificationCode}
│  │
│  ├─ Update User
│  │  └─ enrollmentMetadata.certificateId: newCertificateId
│  │
│  └─ Log audit: 'certificate.issued'
│
└─ Return Certificate data with download URL

  ↓

GET /api/v1/certificates/verify/[code] [PUBLIC]
│
├─ Find Certificate by verificationCode
│
├─ Return (no sensitive data)
│  ├─ studentName
│  ├─ courseName
│  ├─ issuedDate
│  ├─ certificateNumber
│  └─ status
│
└─ No authentication required (public verification)

  ↓

GET /api/v1/students/[id]/certificate/download [AUTHENTICATED]
│
└─ Serve PDF file from cloud storage (Cloudinary)
```

---

## 7. File Organization for Certificate Feature

```
New Files to Create:
│
├─ models/
│  └─ Certificate.js (NEW)
│     └─ Defines certificate schema with all fields
│
├─ services/
│  ├─ completionService.js (NEW)
│  │  ├─ checkEligibility()
│  │  ├─ markAsCompleted()
│  │  └─ generateCertificate()
│  │
│  └─ studentService.js (MODIFY)
│     └─ Add: updateLifecycleStatus()
│
├─ app/api/v1/
│  ├─ students/[id]/complete/route.js (NEW)
│  ├─ students/[id]/certificate/route.js (NEW)
│  ├─ certificates/verify/[code]/route.js (NEW)
│  └─ students/[id]/certificate/download/route.js (NEW)
│
├─ app/admin/
│  ├─ students/[id]/completion/page.jsx (NEW)
│  ├─ certificates/page.jsx (NEW)
│  └─ certificates/verify/page.jsx (NEW)
│
├─ components/admin/
│  ├─ CompletionChecker.jsx (NEW)
│  ├─ CertificateGenerator.jsx (NEW)
│  └─ CertificateList.jsx (NEW)
│
└─ scripts/
   └─ migrate_lifecycle_status.js (NEW)
      └─ One-time migration to set existing student status
```

---

## 8. Database Index Recommendations

```
CURRENT INDEXES (Good):
User
├─ { email: 1 } - unique, partial (deletedAt null)
├─ { institute: 1, enrollmentNumber: 1 } - unique, partial
└─ { role: 1, deletedAt: 1 }

Batch
├─ { course: 1 }
├─ { institute: 1, course: 1, deletedAt: 1 }
└─ { enrolledStudents.student: 1 }

Fee
├─ { institute: 1, student: 1, batch: 1 } - unique, partial
└─ { student: 1 }

RECOMMENDED TO ADD:
User
├─ { lifecycleStatus: 1, deletedAt: 1 } [NEW]
└─ { institute: 1, lifecycleStatus: 1 } [NEW]

Certificate [NEW MODEL]
├─ { certificateNumber: 1 } - unique
├─ { verificationCode: 1 } - unique
├─ { student: 1 }
├─ { student: 1, batch: 1, status: 1 }
└─ { status: 1, issuedDate: -1 }

Attendance (existing)
├─ { student: 1, batch: 1 }
└─ { batch: 1, attendanceDate: 1 }

ExamSubmission (existing)
├─ { exam: 1, student: 1 }
└─ { student: 1, status: 1 }
```

---

## 9. State Transition Diagram

```
STUDENT LIFECYCLE STATE TRANSITIONS:

                    ┌──────────────┐
                    │   Enquiry    │
                    │  (Prospective)
                    └──────┬───────┘
                           │
                    (Enquiry Follow-up)
                           │
                           ↓
                    ┌──────────────────┐
                    │    Applicant     │
                    │ (Application in  │
                    │  Progress)       │
                    └──────┬───────────┘
                           │
                    (Admission Approved)
                           │
                           ↓
                    ┌──────────────────┐
                    │    Enrolled      │  ← User created, not in any batch
                    │  (No Batch Yet)  │
                    └──────┬───────────┘
                           │
                    (Batch Assigned)
                           │
                           ↓
                    ┌──────────────────────┐
                    │      Active          │  ← Enrolled in batch, status:'active'
                    │  (Actively Taking    │
                    │   Course)            │
                    └────┬──────┬────┬────┘
                         │      │    │
            ┌────────────┘      │    └──────────────┐
            │                   │                   │
    [Dropped]            [Courses End]        [Course Fail]
    or                      │                      │
    [Quit]                  ↓                      ↓
            │        ┌──────────────────────┐     │
            │        │    Completed     │     │
            │        │ (All Requirements  │     │
            ↓        │  Satisfied)        │     ↓
    ┌──────────────┐ └──────┬─────────────┘ ┌─────────────┐
    │   Dropped    │        │               │   Dropped   │
    │  (Withdrawn) │        │ (Certificate) │  (Failed)   │
    └──────────────┘        │               └─────────────┘
                            ↓
                     ┌──────────────────┐
                     │   Graduated      │
                     │ (With Certificate)
                     └──────────────────┘

CURRENTLY IMPLEMENTED: → (up to Active)
CURRENTLY MISSING: → (from Active to Completed/Graduated)

NEW LIFECYCLE STATUS FIELD:
lifecycleStatus: Enum
├─ 'enquiry'      ← Lead stage
├─ 'applicant'    ← Application submitted
├─ 'enrolled'     ← Student created, no batch
├─ 'active'       ← In batch, attending
├─ 'completed'    ← Completed requirements (NEW)
├─ 'dropped'      ← Quit course (NEW)
└─ 'graduated'    ← Certificate issued (NEW)
```

