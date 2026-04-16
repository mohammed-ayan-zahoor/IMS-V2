# IMS V2 - Quick Reference Guide

## Key Findings Summary

### 1. Student Model Location
- **File:** `/Users/apple/Projects/Client/IMS-V2/models/User.js`
- **Current Fields:** 13 (no lifecycle status)
- **Auto-generated:** Enrollment number (STU[YEAR][SEQ])
- **Issue:** NO completion status tracking

### 2. Dashboard Student Count
- **Component:** `/Users/apple/Projects/Client/IMS-V2/app/admin/dashboard/page.jsx` (Line 67-74)
- **API Endpoint:** `/api/v1/dashboard/stats` 
- **Backend:** `/Users/apple/Projects/Client/IMS-V2/app/api/v1/dashboard/stats/route.js` (Line 51-54)
- **Query:** `User.countDocuments({ role: 'student', deletedAt: null, institute: id })`

### 3. Student Lifecycle (Current)
```
Enquiry (model) 
  → AdmissionApplication (model, status: pending/converted/cancelled)
  → User (role: student, created by convert endpoint)
  → Batch Enrollment (status: active/completed/dropped - NEVER USED FOR COMPLETION)
  → Fee Tracking (status: not_started/partial/paid/overdue)
  → ??? NOTHING - NO COMPLETION TRACKING
```

### 4. Admission Flow
- **Application Created:** Via AdmissionApplication model
- **Convert Endpoint:** `POST /api/v1/admissions/convert` (Line 8-89)
  - Creates User (student)
  - Enrolls in batch
  - Creates Fee record
- **Service:** `StudentService.createStudent()` + `StudentService.enrollInBatch()`

### 5. Batch Enrollment Structure
```javascript
batch.enrolledStudents = [{
  student: ObjectId,
  enrolledAt: Date,
  status: 'active' | 'completed' | 'dropped'
}]
```
**Note:** Status field exists but is NEVER updated to 'completed'

### 6. Database Facts
- **Engine:** MongoDB (Mongoose 9.0.2)
- **No Migrations:** All schemas defined inline
- **Soft Delete:** Uses `deletedAt` field pattern
- **Multi-Institute:** Scoped via Membership model

### 7. What Needs Building (For Certificates)
1. Certificate Model (NEW)
2. Lifecycle Status Field (User model update)
3. Completion Service (NEW)
4. Certificate Generation Service (NEW)
5. API Endpoints (4 new routes)
6. Admin UI Pages (3 new pages)
7. Migration Script (for existing data)

---

## File Locations - Quick Lookup

| What | Where | Lines |
|------|-------|-------|
| User Schema | models/User.js | 4-70 |
| Batch Schema | models/Batch.js | 4-56 |
| Fee Schema | models/Fee.js | 22-58 |
| Student Service | services/studentService.js | 1-658 |
| Dashboard Component | app/admin/dashboard/page.jsx | 1-251 |
| Dashboard Stats API | app/api/v1/dashboard/stats/route.js | 1-212 |
| Create Student API | app/api/v1/students/route.js | 54-100 |
| Enroll Endpoint | app/api/v1/students/[id]/enroll/route.js | 1-72 |
| Convert Admission | app/api/v1/admissions/convert/route.js | 1-90 |
| Admission Model | models/AdmissionApplication.js | 1-70 |
| Enquiry Model | models/Enquiry.js | 1-41 |
| Auth Config | lib/auth.js | 1-? |
| MongoDB Connection | lib/mongodb.js | 1-41 |

---

## Critical API Endpoints

### Student Management
- `GET /api/v1/students` - List students (supports filtering)
- `POST /api/v1/students` - Create student
- `GET /api/v1/students/[id]` - Get student details
- `POST /api/v1/students/[id]/enroll` - Enroll in batch
- `DELETE /api/v1/students/[id]/enroll?batchId=x` - Unenroll

### Admission
- `GET /api/v1/admissions` - List applications
- `POST /api/v1/admissions` - Create application
- `POST /api/v1/admissions/convert` - **Convert to student**

### Dashboard
- `GET /api/v1/dashboard/stats` - All dashboard metrics

---

## Database Collections (Relevant to Student Lifecycle)

```
users
├─ role: 'student'
├─ enrollmentNumber: STU2024XXXX
├─ institute: ObjectId
└─ profile: { firstName, lastName, ... }

batches
├─ enrolledStudents: [{
│  ├─ student: ObjectId
│  ├─ enrolledAt: Date
│  └─ status: 'active'|'completed'|'dropped'
├─ course: ObjectId
└─ institute: ObjectId

fees
├─ student: ObjectId
├─ batch: ObjectId
├─ installments: [{ amount, dueDate, status, ... }]
└─ status: 'not_started'|'partial'|'paid'|'overdue'

admissionapplications
├─ status: 'pending'|'converted'|'cancelled'
└─ institute: ObjectId

enquiries
├─ status: 'Pending'|'Confirmed'|'Rejected'
└─ institute: ObjectId
```

---

## Missing Pieces (Certificate System)

### Missing Model
```javascript
// certificates collection (needs to be created)
{
  student: ObjectId,
  course: ObjectId,
  batch: ObjectId,
  certificateNumber: String (unique),
  issuedDate: Date,
  status: 'draft'|'issued'|'revoked',
  verificationCode: String,
  pdfUrl: String,
  qrCode: String
}
```

### Missing Fields in User
```javascript
// Add to User model:
lifecycleStatus: 'enquiry'|'applicant'|'enrolled'|'active'|'completed'|'dropped'|'graduated',
enrollmentMetadata: {
  firstEnrollmentDate: Date,
  completionDate: Date,
  certificateId: ObjectId
}
```

### Missing Endpoints
- `POST /api/v1/students/[id]/complete` - Mark as completed
- `POST /api/v1/students/[id]/certificate` - Generate certificate
- `GET /api/v1/certificates/verify/[code]` - Verify certificate (public)
- `GET /api/v1/students/[id]/certificate/download` - Download PDF

---

## Key Queries Reference

### Count Active Students
```javascript
User.countDocuments({ 
  role: 'student', 
  deletedAt: null,
  institute: instituteId 
})
```

### Get Student with Batches
```javascript
const student = await User.findById(id);
const batches = await Batch.find({
  'enrolledStudents.student': id,
  deletedAt: null
}).populate('course');
```

### Get Recent Admissions
```javascript
User.find({ role: 'student', deletedAt: null, institute: id })
  .sort({ createdAt: -1 })
  .limit(5)
```

### Check Enrollment Status
```javascript
const enrollment = batch.enrolledStudents.find(
  e => e.student.toString() === studentId
);
```

---

## Tech Stack Summary
- **Frontend:** Next.js 16, React 19, Tailwind CSS, Framer Motion
- **Backend:** Next.js API Routes
- **Database:** MongoDB (Mongoose 9.0.2)
- **Auth:** NextAuth.js 4.24.13
- **Packages:** bcryptjs, xlsx, react-pdf, lodash

---

## Next Actions
1. Review CODEBASE_EXPLORATION.md (full 15-section document)
2. Create Certificate model following Phase 2
3. Add lifecycle fields to User model (Phase 1)
4. Implement completion eligibility logic (Phase 3)
5. Build API endpoints (Phase 4)
6. Create admin UI for certificates (Phase 6)

---

Generated: April 15, 2026
