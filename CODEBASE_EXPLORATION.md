# IMS V2 - Codebase Exploration & Execution Plan

## Executive Summary
This IMS (Institute Management System) is a Next.js-based application using MongoDB with role-based access control (RBAC). The system currently tracks students through an admission workflow (Enquiry → AdmissionApplication → User/Student → Batch Enrollment → Fee Tracking). 

**Current Architecture:**
- **Frontend:** Next.js 16 with React 19, Tailwind CSS
- **Backend:** Next.js API Routes with middleware
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** NextAuth.js
- **No certificate generation system exists yet**

---

## 1. FILE STRUCTURE & DIRECTORY LAYOUT

```
/Users/apple/Projects/Client/IMS-V2/
├── app/
│   ├── admin/                          # Admin dashboard & management pages
│   │   ├── dashboard/page.jsx          # Main dashboard (displays student count)
│   │   ├── students/page.jsx           # Student list
│   │   ├── students/[id]/page.jsx      # Student detail profile
│   │   ├── batches/                    # Batch management
│   │   ├── courses/                    # Course management
│   │   ├── fees/                       # Fee collection
│   │   ├── attendance/                 # Attendance tracking
│   │   ├── exams/                      # Exam management
│   │   └── [other modules]
│   ├── student/                        # Student portal
│   │   └── dashboard/                  # Student dashboard
│   ├── api/v1/
│   │   ├── students/                   # Student API endpoints
│   │   │   ├── route.js                # GET/POST students
│   │   │   ├── [id]/route.js
│   │   │   ├── [id]/enroll/route.js    # Enroll student in batch
│   │   │   └── [id]/status/route.js
│   │   ├── admissions/
│   │   │   ├── route.js                # GET/POST admission applications
│   │   │   └── convert/route.js        # CRITICAL: Convert admission to student
│   │   ├── batches/                    # Batch management API
│   │   ├── dashboard/
│   │   │   └── stats/route.js          # Dashboard statistics
│   │   ├── fees/                       # Fee management API
│   │   └── [other endpoints]
│   ├── (auth)/                         # Authentication pages
│   └── layout.js
├── models/                             # Mongoose schemas
│   ├── User.js                         # Main user model (includes students)
│   ├── Membership.js                   # Multi-institute user access
│   ├── Batch.js                        # Batch/Class management
│   ├── Course.js                       # Course definitions
│   ├── Fee.js                          # Fee/Payment tracking
│   ├── AdmissionApplication.js         # Admission applications
│   ├── Enquiry.js                      # Lead/Enquiry management
│   ├── Exam.js                         # Exam definitions
│   ├── ExamSubmission.js               # Exam responses & grading
│   ├── Attendance.js                   # Attendance records
│   └── [other models: Material, Subject, Institute, etc.]
├── services/
│   ├── studentService.js               # Student business logic
│   ├── auditService.js                 # Audit logging
│   ├── feeService.js                   # Fee calculations
│   └── [other services]
├── components/
│   ├── admin/
│   │   ├── StudentSearch.jsx           # Search component
│   │   ├── QuickAddModal.jsx
│   │   └── ActivityFeed.jsx
│   ├── ui/                             # Reusable UI components
│   └── shared/
├── middleware/
│   └── instituteScope.js               # Multi-institute access control
├── lib/
│   ├── mongodb.js                      # DB connection
│   ├── auth.js                         # Auth configuration
│   └── utils.js
├── package.json
└── [config files]
```

---

## 2. STUDENT MODEL/SCHEMA - CURRENT STATE

### Location: `/Users/apple/Projects/Client/IMS-V2/models/User.js`

**Fields Currently Defined (Lines 4-70):**

```javascript
{
  institute: ObjectId (ref: 'Institute'),           // Required for student
  email: String (unique per institute),
  passwordHash: String,
  role: Enum ['super_admin', 'admin', 'instructor', 'staff', 'student'],
  
  // RBAC Assignments
  assignments: {
    batches: [ObjectId],
    courses: [ObjectId]
  },
  
  // Profile Information
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    gender: Enum ['Male', 'Female', 'Other', 'Not Specified'],
    avatar: String,
    dateOfBirth: Date,
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String
    }
  },
  
  // Student-Specific Fields
  enrollmentNumber: String (auto-generated, unique per institute),
  
  guardianDetails: {
    name: String,
    phone: String,
    relation: Enum ['father', 'mother', 'guardian', 'other']
  },
  
  referredBy: String,
  
  // Security
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordChangeRequested: Boolean,
  lastLogin: Date,
  
  // Soft Delete
  deletedAt: Date,
  deletedBy: ObjectId (ref: 'User'),
  
  // Timestamps
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Key Observations:**
- **No lifecycle status field** - Students don't have explicit "enrollment status" or "completion status"
- **Enrollment number auto-generated** on student creation (Line 100-114)
- **Soft delete pattern** used (deletedAt instead of hard delete)
- **Virtuals available:**
  - `fullName` (Line 85-90)
  - `isActive` (Line 93-95) - checks if `deletedAt` is null

**Indexes:**
- `{ email: 1 }` - unique per institute
- `{ institute: 1, enrollmentNumber: 1 }` - unique per institute
- `{ institute: 1, role: 1, deletedAt: 1 }` - for filtering

---

## 3. DASHBOARD CODE - STUDENT COUNT DISPLAY

### Dashboard Component
**Location:** `/Users/apple/Projects/Client/IMS-V2/app/admin/dashboard/page.jsx`

**Student Count Display (Lines 67-74):**
```jsx
{ 
  title: "STUDENTS", 
  value: loading ? "0" : (dashboardData?.counts?.students || 0).toLocaleString(), 
  icon: Users, 
  trend: `${dashboardData?.trends?.student >= 0 ? '+' : ''}${dashboardData?.trends?.student || 0}%`, 
  trendType: (dashboardData?.trends?.student || 0) >= 0 ? "up" : "down" 
}
```

### API Endpoint That Provides Data
**Location:** `/Users/apple/Projects/Client/IMS-V2/app/api/v1/dashboard/stats/route.js`

**Key Logic (Lines 51-54):**
```javascript
// Count students with role='student' and deletedAt=null
const studentsCountPromise = User.countDocuments({ 
  ...hybridBaseQuery, 
  role: 'student' 
});
```

**Query Construction (Lines 24-49):**
- Filters by `institute` if not a global view
- Uses `Membership` model to scope users per institute
- Counts only active students (`deletedAt: null`)
- Supports multi-institute access

**Data Returned (Lines 191-206):**
```javascript
{
  counts: {
    students: Number,              // Active student count
    coursesEnrolled: Number,       // Total enrollments across batches
    staff: Number,                 // Admin/Staff count
    enquiries: Number              // Open enquiries
  },
  trends: {
    student: Number (%),           // Growth vs last 30 days
    enquiry: Number (%),
    enrollment: Number (%)
  },
  topCourses: Array,               // Top 5 courses by enrollment
  recentAdmissions: Array,         // Last 5 students created
  revenueTrends: Array,            // Last 12 months revenue
  totalRevenue: Number
}
```

---

## 4. ADMISSION/ENROLLMENT LIFECYCLE - CURRENT TRACKING

### Step 1: Enquiry → Lead Generation
**Model:** `/Users/apple/Projects/Client/IMS-V2/models/Enquiry.js` (41 lines)

**Fields:**
```javascript
{
  institute: ObjectId,
  studentName: String,
  contactNumber: String,
  course: ObjectId,
  status: Enum ['Pending', 'Confirmed', 'Rejected'],
  enquiryDate: Date,
  followUpDate: Date,
  referredBy: String,
  notes: String
}
```
**Status:** Initial contact stage

---

### Step 2: Admission Application
**Model:** `/Users/apple/Projects/Client/IMS-V2/models/AdmissionApplication.js` (70 lines)

**Fields:**
```javascript
{
  institute: ObjectId,
  firstName, lastName: String,
  email: String,
  phone: String,
  dateOfBirth: Date,
  course: ObjectId,
  learningMode: Enum ['Online', 'Offline', 'Hybrid'],
  guardian: { name, phone, relation },
  address: { street, city, state, pincode },
  previousEducation: String,
  photo: String,
  status: Enum ['pending', 'converted', 'cancelled'],  // KEY FIELD!
  notes: String,
  referredBy: String
}
```
**Status:** 'pending' until converted to student

---

### Step 3: Convert Application → Student
**Endpoint:** `/Users/apple/Projects/Client/IMS-V2/app/api/v1/admissions/convert/route.js` (90 lines)

**Process (Lines 8-89):**
1. Fetch AdmissionApplication (must be 'pending')
2. Map data to Student schema
3. Call `StudentService.createStudent()` (Line 59)
4. Call `StudentService.enrollInBatch()` (Lines 64-69)
5. Mark application as 'converted' (Line 74)

**Student Created With:**
- Role: 'student'
- Enrollment number: auto-generated (STU[YEAR][4-digit-seq])
- Institute: inherited from application
- Profile: from application data

---

### Step 4: Batch Enrollment
**Service Method:** `/Users/apple/Projects/Client/IMS-V2/services/studentService.js` (292-459 lines)

**enrollInBatch() Logic:**
1. Verify student exists and is active
2. Verify batch exists and has capacity
3. Add student to `batch.enrolledStudents[]` with:
   ```javascript
   {
     student: ObjectId,
     enrolledAt: Date,
     status: Enum ['active', 'completed', 'dropped']
   }
   ```
4. Create Fee record with status: 'not_started'
5. Create audit log entry

**Batch Model:** `/Users/apple/Projects/Client/IMS-V2/models/Batch.js`
```javascript
enrolledStudents: [{
  student: ObjectId,
  enrolledAt: Date,
  status: Enum ['active', 'completed', 'dropped']  // NO "completed" tracking!
}]
```

---

### Step 5: Fee Tracking (Payment Status)
**Model:** `/Users/apple/Projects/Client/IMS-V2/models/Fee.js` (98 lines)

**Fields:**
```javascript
{
  institute: ObjectId,
  student: ObjectId,
  batch: ObjectId,
  totalAmount: Number,
  discount: { amount, reason, appliedBy, appliedAt },
  installments: [{
    amount: Number,
    dueDate: Date,
    paidDate: Date,
    status: Enum ['pending', 'paid', 'overdue', 'waived']
  }],
  paidAmount: Number,
  balanceAmount: Number,
  status: Enum ['not_started', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'],
  deletedAt: Date
}
```

**Status:** Tracks payment progress, NOT course completion

---

### Current Lifecycle Summary:
```
Enquiry (Pending)
  ↓
AdmissionApplication (pending)
  ↓ [Convert endpoint]
User/Student (created, role='student')
  ↓
Batch Enrollment (status: 'active')
  ↓
Fee Record (status: 'not_started' → 'partial' → 'paid')
  ↓
??? NO COMPLETION TRACKING
```

**Missing:** No mechanism to mark student as "completed" or track course completion milestones.

---

## 5. CERTIFICATE GENERATION - CURRENT STATE

### Finding:
**NO certificate generation system exists** in the codebase.

**Search Results:**
- No `*certificate*` files found
- No `*completion*` model or service
- No completion status tracking
- No certificate template storage
- No certificate issuance API

**What NEEDS to be built:**
1. Certificate model/schema
2. Course completion tracking
3. Eligibility criteria (attendance, grades, fees paid)
4. Certificate generation service
5. Certificate API endpoint
6. Verification mechanism

---

## 6. DATABASE SCHEMA - CURRENT STATE

### MongoDB Connection
**Location:** `/Users/apple/Projects/Client/IMS-V2/lib/mongodb.js`
- Uses Mongoose 9.0.2
- Connection pooling enabled
- No migration system (schema changes done directly)

### Schema Definition Pattern:
All models use Mongoose schemas directly. No migration files exist.

**Key Models for Student Lifecycle:**

| Model | Location | Purpose | Student Lifecycle Role |
|-------|----------|---------|----------------------|
| User | models/User.js | User authentication & profile | Student identity |
| Membership | models/Membership.js | Multi-institute access | Institute scoping |
| Batch | models/Batch.js | Class/Batch definition | Enrollment container |
| Course | models/Course.js | Course definition | Program reference |
| Fee | models/Fee.js | Payment tracking | Financial status |
| Enquiry | models/Enquiry.js | Lead tracking | Pre-admission |
| AdmissionApplication | models/AdmissionApplication.js | Application form | Pre-enrollment |
| Exam | models/Exam.js | Test definitions | Assessment |
| ExamSubmission | models/ExamSubmission.js | Student answers & grades | Performance |
| Attendance | models/Attendance.js | Attendance records | Engagement |

### Current Unique Constraints:
- Email: unique per institute (null deletedAt)
- EnrollmentNumber: unique per institute
- Fee: unique per (student, batch, institute) when not deleted
- Course code: unique per institute

---

## 7. API ENDPOINTS - STUDENT MANAGEMENT

### GET Students List
**Endpoint:** `GET /api/v1/students`
**Path:** `/Users/apple/Projects/Client/IMS-V2/app/api/v1/students/route.js`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10, max: 1000)
- `search` - name/email/enrollment number
- `isActive` - true/false (active/inactive students)
- `batchId` - filter by batch
- `courseId` - filter by course
- `showDeleted` - include soft-deleted students
- `instituteId` - for super admin global view

**Authentication:** admin, super_admin, instructor

---

### POST Create Student
**Endpoint:** `POST /api/v1/students`
**Required Fields:**
```json
{
  "email": "student@example.com",
  "institute": "objectId",
  "profile": {
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Optional Fields:**
- `profile.phone`, `profile.gender`, `profile.dateOfBirth`, `profile.address`
- `guardianDetails`
- `referredBy`

---

### POST Enroll in Batch
**Endpoint:** `POST /api/v1/students/[id]/enroll`
**Path:** `/Users/apple/Projects/Client/IMS-V2/app/api/v1/students/[id]/enroll/route.js`
**Payload:**
```json
{ "batchId": "objectId" }
```

**Response:**
```json
{
  "message": "Student enrolled successfully",
  "data": {
    "student": {...},
    "batch": {...},
    "fee": {...}
  }
}
```

---

### DELETE Unenroll from Batch
**Endpoint:** `DELETE /api/v1/students/[id]/enroll?batchId=xxx`
**Cleanup Logic:**
- Removes student from batch.enrolledStudents
- Deletes fees if status='not_started'
- Cancels fees if status='partial'/'paid'/'overdue'

---

### POST Convert Admission to Student
**Endpoint:** `POST /api/v1/admissions/convert`
**Path:** `/Users/apple/Projects/Client/IMS-V2/app/api/v1/admissions/convert/route.js`
**Payload:**
```json
{
  "applicationId": "objectId",
  "batchId": "objectId"
}
```

**Process:**
1. Validates application exists and status='pending'
2. Creates User with role='student'
3. Enrolls in batch
4. Updates application.status='converted'

---

## 8. DATABASE QUERY EXAMPLES

### Count Active Students (Dashboard)
```javascript
User.countDocuments({ 
  role: 'student', 
  deletedAt: null,
  institute: instituteId 
})
```

### Get Students Enrolled in Batch
```javascript
Batch.findById(batchId)
  .select('enrolledStudents.student')
  .populate('enrolledStudents.student', 'profile email')
```

### Get Student Profile with Enrollments
```javascript
User.findById(studentId)
  .select('-passwordHash -passwordResetToken')

// Then get batches
Batch.find({
  'enrolledStudents.student': studentId,
  deletedAt: null
}).populate('course')

// And get fees
Fee.find({
  student: studentId,
  deletedAt: null
}).populate('batch')
```

### Get Completion Status (DOESN'T EXIST)
```javascript
// NO QUERY EXISTS - needs to be built
// Would need to check:
// 1. Exam submissions and passing grade
// 2. Attendance threshold
// 3. Fees paid
// 4. Course duration completion
```

---

## 9. COMPONENT HIERARCHY - STUDENT DISPLAY

### Admin Dashboard Component
**File:** `/Users/apple/Projects/Client/IMS-V2/app/admin/dashboard/page.jsx` (251 lines)

**Components Rendered:**
1. **StatCard** - Displays "STUDENTS" count (Line 24-46)
   - Fetches data from `/api/v1/dashboard/stats` (Line 56)
   - Shows count, trend, and trend direction

2. **Recent Admissions List** (Lines 115-155)
   - Shows last 5 students created
   - Displays: Avatar, Name, Enrollment Number, Status Badge

3. **Top Performing Courses** (Lines 158-204)
   - Ranked by student enrollment count
   - Progress bar visualization

4. **Admission Revenue Trends** (Lines 208-248)
   - 12-month revenue chart

---

## 10. AUTHENTICATION & AUTHORIZATION

### NextAuth Configuration
**Location:** `/Users/apple/Projects/Client/IMS-V2/lib/auth.js`

**User Roles:**
- `super_admin` - Global access to all institutes
- `admin` - Institute-level admin
- `instructor` - Teaches students in assigned batches
- `staff` - General institute staff
- `student` - Enrolled in batches, limited access

### Institute Scoping Middleware
**Location:** `/Users/apple/Projects/Client/IMS-V2/middleware/instituteScope.js`

**Pattern:** All API calls go through `getInstituteScope()` to verify:
- User has permission for requested institute
- User's membership is active
- Cross-institute access is prevented

---

## 11. EXECUTION PLAN - IMPLEMENTING STUDENT LIFECYCLE & CERTIFICATES

### Phase 1: Extend Student Model with Lifecycle Status
**Location to Modify:** `/Users/apple/Projects/Client/IMS-V2/models/User.js`

**Add Fields:**
```javascript
// Add to User schema (after referredBy field, ~line 62)
lifecycleStatus: {
  type: String,
  enum: ['enquiry', 'applicant', 'enrolled', 'active', 'completed', 'dropped', 'graduated'],
  default: 'enquiry',
  index: true
},
enrollmentMetadata: {
  firstEnrollmentDate: Date,
  completionDate: Date,
  completionNotes: String,
  certificateId: { type: Schema.Types.ObjectId, ref: 'Certificate' }
}
```

**New Virtual:**
```javascript
UserSchema.virtual('canGenerateCertificate').get(function() {
  return this.lifecycleStatus === 'completed' && this.enrollmentMetadata?.certificateId;
});
```

---

### Phase 2: Create Certificate Model
**New File:** `/Users/apple/Projects/Client/IMS-V2/models/Certificate.js`

**Schema:**
```javascript
{
  student: ObjectId (ref: 'User'),
  batch: ObjectId (ref: 'Batch'),
  course: ObjectId (ref: 'Course'),
  institute: ObjectId (ref: 'Institute'),
  
  // Certificate Metadata
  certificateNumber: String (unique),
  issuedDate: Date,
  issuedBy: ObjectId (ref: 'User'),
  
  // Eligibility Validation
  attendancePercentage: Number,
  avgScore: Number,
  feesPaid: Boolean,
  examPassed: Boolean,
  
  // Certificate Content
  template: String,
  templateData: {
    studentName: String,
    courseName: String,
    completionDate: Date,
    duration: String,
    grade: String,
    remarks: String
  },
  
  // Status & Verification
  status: Enum ['draft', 'issued', 'revoked', 'reissued'],
  revocationReason: String,
  revokedAt: Date,
  
  // Document Generation
  pdfUrl: String,
  qrCode: String,
  verificationCode: String,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

---

### Phase 3: Create Completion/Eligibility Service
**New File:** `/Users/apple/Projects/Client/IMS-V2/services/completionService.js`

**Methods:**
```javascript
class CompletionService {
  /**
   * Check if student is eligible for certificate
   */
  static async checkEligibility(studentId, batchId) {
    // 1. Check enrollment status
    // 2. Check attendance threshold (default 75%)
    // 3. Check exam results if applicable
    // 4. Check fees payment status
    // 5. Return eligibility object with reasons if not eligible
  }
  
  /**
   * Mark student as completed
   */
  static async markAsCompleted(studentId, batchId, actorId) {
    // 1. Verify eligibility
    // 2. Update batch enrollment status to 'completed'
    // 3. Update User.lifecycleStatus to 'completed'
    // 4. Log completion in audit trail
  }
  
  /**
   * Generate certificate
   */
  static async generateCertificate(studentId, batchId, actorId) {
    // 1. Check eligibility
    // 2. Create Certificate document
    // 3. Generate PDF using template
    // 4. Generate verification QR code
    // 5. Update User.enrollmentMetadata.certificateId
  }
}
```

---

### Phase 4: Create API Endpoints for Completion & Certificates

**New Endpoint 1:** `POST /api/v1/students/[id]/complete`
```javascript
// Mark student as completed
// Requires: admin role
// Body: { batchId, notes? }
// Returns: updated student with completed status
```

**New Endpoint 2:** `POST /api/v1/students/[id]/certificate`
```javascript
// Generate certificate for completed student
// Requires: admin role
// Body: { batchId, templateId? }
// Returns: certificate data with PDF URL
```

**New Endpoint 3:** `GET /api/v1/certificates/verify/[code]`
```javascript
// Public endpoint to verify certificate
// Returns: certificate metadata (student name, course, date)
```

**New Endpoint 4:** `GET /api/v1/students/[id]/certificate/download`
```javascript
// Download certificate PDF
// Returns: PDF file
```

---

### Phase 5: Update Dashboard to Show Completion Metrics

**Modify:** `/Users/apple/Projects/Client/IMS-V2/app/admin/dashboard/page.jsx`

**Add New Stat Cards:**
- Completed Students (count)
- Certificates Issued (count)
- Completion Rate (%)

**Update Stats API:** `/Users/apple/Projects/Client/IMS-V2/app/api/v1/dashboard/stats/route.js`

**Add Queries:**
```javascript
const completedStudents = User.countDocuments({
  lifecycleStatus: 'completed',
  deletedAt: null,
  institute: instituteId
});

const certificatesIssued = Certificate.countDocuments({
  institute: instituteId,
  status: 'issued'
});
```

---

### Phase 6: Create Admin UI for Certificate Management

**New Pages:**
1. `/app/admin/students/[id]/completion/page.jsx`
   - Mark as completed
   - View eligibility
   - Generate certificate

2. `/app/admin/certificates/page.jsx`
   - List issued certificates
   - Revoke certificates
   - Download certificates

3. `/app/admin/certificates/verify/page.jsx`
   - Public certificate verification

---

### Phase 7: Update Student Model - Migration Strategy

Since no migration system exists, execute these steps:

1. **Add new fields to User schema** (Phase 1)
2. **Update pre-save hook** to handle default lifecycleStatus
3. **Create database script:**
   ```javascript
   // scripts/migrate_lifecycle_status.js
   // For existing students:
   // - Set lifecycleStatus = 'enrolled' if already in batch
   // - Set lifecycleStatus = 'applicant' if not in any batch
   ```
4. **Run script manually**
5. **Update tests**

---

### Phase 8: Batch Update Operations

**New Service Methods in StudentService:**

```javascript
static async updateLifecycleStatus(studentId, newStatus, batchId) {
  // 1. Validate status transition rules
  // 2. Update User.lifecycleStatus
  // 3. Update Batch enrollment status if applicable
  // 4. Create audit log
}

static async bulkMarkCompleted(batchId, actorId) {
  // Mark all eligible students in batch as completed
}

static async bulkGenerateCertificates(batchId, actorId) {
  // Generate certificates for all completed students
}
```

---

## 12. IMPLEMENTATION CHECKLIST

- [ ] Add `lifecycleStatus` field to User schema
- [ ] Add `enrollmentMetadata` field to User schema
- [ ] Create Certificate model
- [ ] Create CompletionService
- [ ] Create Certificate generation service (PDF/QR)
- [ ] Add `POST /api/v1/students/[id]/complete` endpoint
- [ ] Add `POST /api/v1/students/[id]/certificate` endpoint
- [ ] Add `GET /api/v1/certificates/verify/[code]` endpoint
- [ ] Add `GET /api/v1/students/[id]/certificate/download` endpoint
- [ ] Update dashboard stats to include completion metrics
- [ ] Create certificate management UI pages
- [ ] Add completion eligibility checks
- [ ] Create migration script for existing data
- [ ] Add tests for completion workflow
- [ ] Update audit logging for completion events

---

## 13. KEY FILES SUMMARY TABLE

| Purpose | File Path | Lines | Key Functions |
|---------|-----------|-------|---|
| Student Schema | models/User.js | 140 | User definition, enrollment auto-gen |
| Batch Schema | models/Batch.js | 69 | Enrollment management |
| Fee Schema | models/Fee.js | 98 | Payment tracking |
| Student Service | services/studentService.js | 658 | createStudent, enrollInBatch, getStudents |
| Dashboard Page | app/admin/dashboard/page.jsx | 251 | Display stats, recent admissions |
| Dashboard API | app/api/v1/dashboard/stats/route.js | 212 | Calculate student counts & trends |
| Students API | app/api/v1/students/route.js | 100 | GET/POST students |
| Enroll API | app/api/v1/students/[id]/enroll/route.js | 72 | Enroll/unenroll in batch |
| Admission Convert | app/api/v1/admissions/convert/route.js | 90 | Application → Student conversion |
| Admission Model | models/AdmissionApplication.js | 70 | Application form data |

---

## 14. DATABASE INDEXES - FOR QUERY OPTIMIZATION

**Current Indexes (for reference):**
- User: email (unique), institute+enrollmentNumber (unique), role+deletedAt
- Batch: course, institute+course, startDate, enrolledStudents.student
- Fee: institute+student+batch (unique, partial), student+batch
- Course: name+code (text), institute+code (unique, partial)

**Recommended Additions (after adding lifecycleStatus):**
```javascript
// For completion queries
User.index({ lifecycleStatus: 1, deletedAt: 1 });
User.index({ institute: 1, lifecycleStatus: 1 });
Certificate.index({ student: 1, batch: 1, status: 1 });
Certificate.index({ certificateNumber: 1 }, { unique: true });
```

---

## 15. NEXT STEPS

1. **Immediate:** Review this exploration document
2. **Design Phase:** Finalize certificate template & eligibility criteria
3. **Implementation:** Follow Phase 1-8 in order
4. **Testing:** Create comprehensive tests for completion workflow
5. **Deployment:** Update production database schema
6. **Documentation:** Update API documentation with new endpoints

