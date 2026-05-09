# IMS-V2 Codebase Exploration - Comprehensive Summary

## Executive Summary

IMS-V2 is a multi-tenant educational management system built with **Next.js**, **React**, **MongoDB**, and **Mongoose**. The system supports multiple school types (VOCATIONAL and SCHOOL) and manages the complete student lifecycle from enquiry through enrollment, fee tracking, and now includes certificate generation capabilities.

**Project Status**: Active development with robust core features, expanding certification system.

---

## 1. Project Structure & Architecture

### Directory Layout

```
/Users/apple/Projects/Client/IMS-V2/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   │   └── login/
│   ├── admin/                    # Admin dashboard & features
│   ├── student/                  # Student portal
│   ├── admission/                # Public admission form
│   ├── api/v1/                   # REST API endpoints (170+ routes)
│   └── quantech/                 # Organization branding
├── models/                       # MongoDB/Mongoose schemas (41 files)
├── services/                     # Business logic layer (14 files)
├── components/
│   ├── admin/                    # Admin-specific components
│   ├── shared/                   # Reusable UI components
│   ├── ui/                       # Base UI components
│   └── providers/                # Context/state providers
├── middleware/                   # Custom middleware
├── lib/                          # Utility libraries
├── contexts/                     # React contexts
└── scripts/                      # Utility scripts & migrations
```

### Key Architectural Patterns

1. **Multi-Tenant Architecture**: Each institute is isolated; users can have multiple memberships
2. **Soft Delete Pattern**: Records marked inactive with `deletedAt` field instead of hard deletion
3. **Role-Based Access Control (RBAC)**: Five user roles with hierarchical permissions
4. **Session Isolation**: SCHOOL type institutes use academic sessions; VOCATIONAL does not
5. **Institute Scoping Middleware**: All queries filtered by institute context
6. **Membership Model**: Enables multi-institute access for users

---

## 2. School Types in the System

### Enumerated School Types (From Institute.js)

```javascript
type: {
    type: String,
    enum: ['VOCATIONAL', 'SCHOOL'],
    default: 'VOCATIONAL',
    required: true
}
```

### Type Differences

| Feature | VOCATIONAL | SCHOOL |
|---------|-----------|--------|
| Session Isolation | NO | YES |
| Academic Session Model | Not used | Required |
| Student View Scope | All students | Students in active session |
| Batch Management | Flexible, no session binding | Strict session-based |
| Typical Duration | 3-6 months | 1 year (academic year) |
| Example | Coding bootcamp, skill training | K-12 school, college |

### Session Validation Logic (middleware/sessionValidation.js)

- **VOCATIONAL Institutes**: Return `null` session - no session filtering
- **SCHOOL Institutes**: Derive current active session based on dates
  - Client can provide session ID (validated server-side)
  - Falls back to active session matching current date
  - Falls back to most recent active session
  - Returns `null` if no session available

---

## 3. Database Schema Overview

### Current Collections (41 Models)

#### Core Academic Models
- **User** (140 lines): Students, admins, instructors with soft delete, enrollment tracking
- **Institute** (183 lines): Multi-tenant organization with subscription, branding, settings
- **Batch** (76 lines): Class/section with enrolled students, schedule, instructor
- **Course** (47 lines): Course definition with duration, fees, subjects, prerequisites
- **Session** (76 lines): Academic session (for SCHOOL types) with date range, active flag
- **Subject** (linked to Course)

#### Student Lifecycle Models
- **AdmissionApplication**: Initial enquiry conversion to student
- **Enquiry**: Lead tracking with follow-ups
- **Fee**: Payment tracking with installments
- **FeePreset**: Template for fee structure
- **Attendance**: Class attendance records
- **Exam**: Assessment definitions
- **ExamSubmission**: Student exam attempts with scores
- **Certificate**: Student completion certificates (NEW)
- **CertificateTemplate**: Certificate design templates

#### Supporting Models
- **Membership**: Multi-institute user access
- **Timetable**: Class schedule
- **Material**: Course study materials
- **Notice**: Announcements
- **Submission**: Assignment submissions
- **Transport**: Vehicle, route, fee management
- **AuditLog**: Access and action logging
- ... and 20+ more specialized models

### Key Schema Features

```javascript
// Soft Delete Pattern
deletedAt: { type: Date, index: true, default: null }
deletedBy: { type: Schema.Types.ObjectId, ref: 'User' }

// Multi-Institute Support
institute: { type: Schema.Types.ObjectId, ref: 'Institute', index: true }

// Partial Indexes
{ unique: true, partialFilterExpression: { deletedAt: null } }

// Auto-Generated IDs
enrollmentNumber: STU[YEAR][4-digit-sequence]  // e.g., STU20240001

// Lifecycle Tracking
activeSession: { type: Schema.Types.ObjectId, ref: 'Session' }
promotionHistory: [{ session, batch, promotedAt, promotedBy }]
status: ['ACTIVE', 'COMPLETED', 'DROPPED', 'PAUSED']  // for students
```

---

## 4. Tech Stack

### Frontend Stack
- **Framework**: Next.js 16.1.1 (App Router)
- **UI Library**: React 19.2.3
- **Styling**: Tailwind CSS 4.1.18 with @tailwindcss/postcss
- **Animation**: Framer Motion 12.23.26
- **Icons**: Lucide React 0.562.0
- **Form Handling**: React Hook Form 7.54.2
- **Validation**: Zod 3.24.1
- **Notifications**: React Hot Toast 2.4.1
- **PDF Viewing**: React PDF 10.3.0
- **Charts**: Recharts 3.8.1

### Backend Stack
- **API Framework**: Next.js API Routes
- **Authentication**: NextAuth 4.24.13 (JWT-based)
- **Password Hashing**: bcryptjs 3.0.3
- **Email/SMS**: Handlebars 4.7.9 (templating)
- **Real-time**: Pusher JS 8.4.0, Pusher Server 5.3.2
- **File Uploads**: Cloudinary SDK 2.8.0
- **Canvas/PDF Generation**: Canvas 3.0.0, PDFKit 0.18.0, Puppeteer 24.41.0
- **QR Codes**: qrcode 1.5.4

### Database & ORM
- **Database**: MongoDB
- **ORM**: Mongoose 9.0.2
- **Migration**: Manual (no migration framework)

### Build & Deployment
- **Package Manager**: npm
- **Linting**: ESLint 9
- **Mobile**: Capacitor 8.0.2 (Android support)

---

## 5. User Roles & Permissions

```javascript
enum Role {
    'super_admin',    // Global access to all institutes
    'admin',          // Single institute administrator
    'instructor',     // Teaches batches, assigns work
    'staff',          // Support staff
    'student'         // Course participant
}
```

### Role-Based Access Control
```
super_admin → Access all institutes globally
admin       → Scoped to single institute (can manage batches, fees, admissions)
instructor  → Can teach assigned batches, grade submissions
staff       → Can manage records within institute scope
student     → Can view own enrollment, fees, materials, take exams
```

---

## 6. Student Lifecycle Flow

### Current Implementation (Complete)

```
1. ENQUIRY
   └─> Enquiry model, contact tracking, follow-ups

2. ADMISSION APPLICATION
   └─> AdmissionApplication form submission (public)

3. APPLICATION REVIEW
   └─> Admin reviews application

4. CONVERSION TO STUDENT
   └─> POST /api/v1/admissions/convert
   └─> Creates User with role='student'
   └─> Auto-generates enrollmentNumber: STU[YEAR][SEQ]
   └─> Creates Membership record
   └─> Enrolls in batch
   └─> Creates Fee record

5. BATCH ENROLLMENT
   └─> Batch.enrolledStudents[].status = 'active'
   └─> Scheduled classes begin
   └─> Attendance marked

6. PAYMENT TRACKING
   └─> Fee installments tracked
   └─> Status: 'not_started' → 'partial' → 'paid' or 'overdue'

7. ACADEMIC ACTIVITIES
   └─> Exams taken and graded
   └─> Materials accessed
   └─> Attendance recorded (75%+ required)

8. COMPLETION (NEW - Partially Implemented)
   └─> Mark as completed (manual or automatic check)
   └─> Generate certificate
   └─> Update enrollment status to 'completed'
```

### Public Admission Form
- Location: `app/admission/[instituteId]/page.jsx` (775 lines)
- Features:
  - Multi-step form (progressive disclosure)
  - Institute branding support
  - Photo upload
  - Dynamic course selection
  - Validation with Zod
  - Captcha/security options

### API: Public Routes (No Authentication)
```
GET /api/v1/public/institute/fetch-by-id/[id]
GET /api/v1/public/institute/[code]
GET /api/v1/public/courses
GET /api/v1/public/shared-dashboard/[slug]
GET /api/v1/public/institute/find-by-email
```

---

## 7. Current Database Schema - Key Models

### User (Student) Schema

```javascript
{
    // Identification
    _id: ObjectId,
    email: String (unique per institute, globally),
    enrollmentNumber: String (STU2024XXXX, unique per institute),
    role: 'student',
    institute: ObjectId (ref: Institute),

    // Authentication
    passwordHash: String (bcrypt),
    passwordResetToken: String,
    lastLogin: Date,

    // Profile
    profile: {
        firstName: String (required),
        lastName: String (required),
        dateOfBirth: Date,
        phone: String,
        gender: Enum,
        avatar: String (URL),
        address: {
            street, city, state, pincode, country
        }
    },

    // Guardian
    guardianDetails: {
        name: String,
        phone: String,
        relation: Enum ['father', 'mother', 'guardian', 'other']
    },

    // Advanced Metadata (for certificates)
    grNumber: String,
    aadharNumber: String,
    apaarId: String,
    penNumber: String,
    fatherName: String,
    motherName: String,
    ... and 20+ more fields for comprehensive records

    // Academic
    activeSession: ObjectId (ref: Session),
    activeSessions: [ObjectId] (legacy, for promotion history),
    promotionHistory: [{
        session: ObjectId,
        batch: ObjectId,
        promotedAt: Date,
        promotedBy: ObjectId
    }],

    // Lifecycle
    status: Enum ['ACTIVE', 'COMPLETED', 'DROPPED', 'PAUSED'],
    completedAt: Date,
    certificateId: ObjectId (ref: Certificate),
    completionReason: String,

    // Transport
    transport: {
        isAvailing: Boolean,
        route: ObjectId (ref: TransportRoute),
        vehicle: ObjectId (ref: Vehicle),
        pickupStop: String
    },

    // Documents
    documents: [{
        name: String,
        url: String,
        publicId: String,
        category: Enum ['Aadhar', 'Photo', 'Marksheet', 'Certificate', etc],
        uploadedAt: Date
    }],

    // Soft Delete
    deletedAt: Date (null = active),
    deletedBy: ObjectId (ref: User),

    // Timestamps
    createdAt: Date (auto),
    updatedAt: Date (auto)
}
```

### Institute (School/Organization) Schema

```javascript
{
    // Identification
    _id: ObjectId,
    name: String (required, indexed),
    code: String (unique, alphanumeric, uppercase),
    registrationNumber: String,
    board: String,
    indexNumber: String,

    // Type
    type: Enum ['VOCATIONAL', 'SCHOOL'],

    // Contact
    address: {
        street, city, state, country, pincode
    },
    contactEmail: String (required, lowercase),
    contactPhone: String,
    website: String,

    // Status
    status: Enum ['active', 'inactive', 'suspended', 'trial'],

    // Subscription (SaaS Model)
    subscription: {
        plan: Enum ['free', 'basic', 'professional', 'enterprise'],
        startDate: Date,
        endDate: Date,
        isActive: Boolean
    },

    // Limits & Quotas
    limits: {
        maxStudents: Number (default 100),
        maxAdmins: Number (default 5),
        maxCourses: Number (default 20),
        maxStorageGB: Number (default 5)
    },

    // Usage Tracking
    usage: {
        studentCount: Number,
        adminCount: Number,
        courseCount: Number,
        storageUsedGB: Number
    },

    // Branding
    branding: {
        logo: String (URL),
        primaryColor: String (hex),
        secondaryColor: String (hex),
        favicon: String
    },

    // Settings
    settings: {
        timezone: String (default 'UTC'),
        currency: String (default 'INR'),
        language: String (default 'en'),
        receiptTemplate: Enum ['classic', 'compact'],
        features: {
            exams: Boolean (default true),
            attendance: Boolean (default true),
            fees: Boolean (default true),
            materials: Boolean (default true),
            transport: Boolean (default false)
        },
        emailNotifications: Boolean,
        smsNotifications: Boolean
    },

    // Audit
    createdBy: ObjectId (ref: User, super admin),
    isActive: Boolean,
    deletedAt: Date,

    // Timestamps
    timestamps: true
}
```

### Batch Schema

```javascript
{
    institute: ObjectId (ref: Institute, required, indexed),
    session: ObjectId (ref: Session, indexed),
    name: String (required),
    course: ObjectId (ref: Course, required, indexed),
    
    // Schedule
    schedule: {
        startDate: Date (required),
        endDate: Date,
        description: String,
        daysOfWeek: [Number] (0=Sunday, 6=Saturday),
        timeSlot: {
            start: String (HH:MM format),
            end: String (HH:MM format)
        }
    },

    capacity: Number (default 30, min 1),

    // Enrollment
    enrolledStudents: [{
        student: ObjectId (ref: User),
        enrolledAt: Date (auto),
        status: Enum ['active', 'completed', 'dropped']
    }],

    instructor: ObjectId (ref: User),
    createdBy: ObjectId (ref: User, required),

    // Soft Delete
    deletedAt: Date (indexed),

    // Timestamps
    timestamps: true
}
```

### Fee Schema

```javascript
{
    institute: ObjectId (ref: Institute, required, indexed),
    session: ObjectId (ref: Session, indexed),
    student: ObjectId (ref: User, required),
    batch: ObjectId (ref: Batch, required, indexed),
    
    totalAmount: Number (required, min 0),
    
    // Adjustments
    discount: {
        amount: Number (default 0),
        reason: String,
        appliedBy: ObjectId (ref: User),
        appliedAt: Date
    },
    
    extraCharges: {
        amount: Number (default 0),
        reason: String,
        appliedBy: ObjectId (ref: User),
        appliedAt: Date
    },

    // Payment Tracking
    installments: [{
        amount: Number (required),
        dueDate: Date (required),
        paidDate: Date,
        status: Enum ['pending', 'paid', 'overdue', 'waived'],
        paymentMethod: Enum ['cash', 'card', 'upi', 'bank_transfer', 'cheque'],
        transactionId: String,
        collectedBy: String,
        notes: String
    }],

    paidAmount: Number (default 0),
    balanceAmount: Number (default 0),
    status: Enum ['not_started', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'],

    feePreset: ObjectId (ref: FeePreset),

    // Soft Delete
    deletedAt: Date (indexed),
    deletedBy: ObjectId (ref: User),

    // Timestamps
    timestamps: true
}
```

### Certificate Schema (NEW/EXTENDED)

```javascript
{
    studentId: ObjectId (ref: User, required, indexed),
    institutionId: ObjectId (ref: Institute, required, indexed),
    batchId: ObjectId (ref: Batch, sparse, indexed),

    // Identification
    certificateNumber: String (unique, indexed),
    verificationCode: String (unique, for public verification),

    // Template
    templateType: Enum ['STANDARD', 'CUSTOM', 'CUSTOM_SCHOOL'],
    template: Schema.Types.Mixed (flexible JSON),
    snapshot: Schema.Types.Mixed (template at time of issuance),

    // Dates
    issueDate: Date (required, default now),
    expiryDate: Date (optional),

    // Content
    metadata: Schema.Types.Mixed ({
        courseName: String,
        duration: String,
        grade: String,
        ...
    }),

    // Files
    pdfUrl: String,

    // Status
    status: Enum ['GENERATED', 'ISSUED', 'REVOKED'],

    // Duplicate Handling
    isDuplicate: Boolean,
    originalCertificateId: ObjectId (ref: Certificate),

    // Metadata
    academicYear: String (indexed),
    visibleToStudent: Boolean (default false, indexed),

    // Timestamps
    timestamps: true
}
```

---

## 8. API Structure & Endpoints

### Total API Endpoints: **170+** routes across v1

### API Categories

| Category | Routes | Examples |
|----------|--------|----------|
| **Students** | 30+ | GET /api/v1/students, POST /api/v1/students, GET /api/v1/students/[id] |
| **Batches** | 8 | GET /api/v1/batches, POST /api/v1/batches/[id]/marksheets |
| **Fees** | 10 | GET /api/v1/fees, POST /api/v1/fees/[id]/payment |
| **Exams** | 15 | POST /api/v1/exams/[id]/start, POST /api/v1/exams/[id]/submissions |
| **Certificates** | 10 | POST /api/v1/students/[id]/generate-certificate, GET /api/v1/certificates/[id] |
| **Courses** | 6 | GET /api/v1/courses, POST /api/v1/courses/[id]/assign-subjects |
| **Materials** | 5 | GET /api/v1/materials, POST /api/v1/materials/[id]/download |
| **Admissions** | 5 | POST /api/v1/admissions/convert |
| **Attendance** | 4 | POST /api/v1/attendance/batch |
| **Chat** | 6 | GET /api/v1/chat/messages, POST /api/v1/chat/messages |
| **Transport** | 12 | GET /api/v1/transport/drivers, POST /api/v1/transport/fees |
| **Reports** | 5 | GET /api/v1/reports/attendance, GET /api/v1/reports/collections |
| **Admin** | 8 | GET /api/v1/admin/stats, POST /api/v1/admin/sync-balances |
| **Public** | 6 | GET /api/v1/public/institute, GET /api/v1/public/courses |
| **Other** | 60+ | Syllabus, questions, timetables, collectors, expenses, etc. |

### Key API Patterns

```javascript
// Authentication Required (Most endpoints)
Authorization: Bearer [JWT_TOKEN]

// Institute Scoping
x-institute-id: [instituteId]  // Optional, derived from token

// Session Support (SCHOOL types)
x-session-id: [sessionId]  // Optional, validated server-side

// Response Format
{
    success: Boolean,
    message: String,
    data: Object,
    error: String (if failed),
    pagination: { total, page, limit }  // if applicable
}

// Error Handling
400 Bad Request - validation errors
401 Unauthorized - missing/invalid token
403 Forbidden - insufficient permissions
404 Not Found - resource doesn't exist
500 Internal Server Error
```

---

## 9. Existing Website/Public Features

### Public-Facing Features

1. **Public Admission Form** (`/admission/[instituteId]`)
   - Multi-step wizard interface
   - No authentication required
   - Institute branding applied
   - Photo upload to Cloudinary
   - Dynamic course listing
   - Form validation with Zod

2. **Public API Endpoints** (No auth required)
   - Institute lookup by ID or code
   - Course listing for institute
   - Email-based institute search
   - Shared dashboard/reports

3. **Certificate Verification** (PUBLIC)
   - Get `/api/v1/certificates/verify/[code]`
   - Returns only: student name, course, issued date, certificate number, status
   - Random unique verification code per certificate

### Current Dashboard Features

1. **Admin Dashboard** (`/admin/dashboard`)
   - Student count, batch count, revenue stats
   - Recent admissions list
   - Top performing courses
   - Revenue trends chart
   - Real-time statistics

2. **Student Portal** (`/student/dashboard`)
   - Personal batch information
   - Fee payment tracking
   - Exam results
   - Materials access
   - Attendance records
   - Certificate display (if visible)

### Features Under Development

- Certificate generation and distribution
- Certificate template customization
- Completion eligibility checks
- Bulk certificate operations
- Student lifecycle status tracking

---

## 10. Current Gaps & Missing Features

### 1. Student Completion Tracking (Planned)
- ✓ Status field exists in User model
- ✗ Completion eligibility checks not implemented
- ✗ Automatic marking as completed not implemented
- ✗ Manual admin UI for marking complete not built

### 2. Certificate Generation (Partially Implemented)
- ✓ Certificate model exists
- ✓ Certificate templates exist
- ✓ API endpoints exist
- ✗ PDF generation not fully tested
- ✗ QR code integration incomplete
- ✗ Email notifications on generation not configured

### 3. Session Isolation (Complete for SCHOOL types)
- ✓ Logic implemented
- ✓ Middleware validates sessions
- ✗ Some APIs may not fully respect session scoping

### 4. Public Website Features (Minimal)
- ✗ No landing page
- ✗ No course catalog page
- ✗ No testimonials/reviews
- ✗ No institute information pages
- ✓ Public admission form (only feature)

---

## 11. Key Files Reference

### Models Directory (41 files)
```
/models/User.js (280 lines)
/models/Institute.js (183 lines)
/models/Batch.js (76 lines)
/models/Course.js (47 lines)
/models/Fee.js (114 lines)
/models/Session.js (76 lines)
/models/Certificate.js (152 lines)
... and 34 more
```

### Services Directory (14 files)
```
/services/studentService.js (45K)
/services/feeService.js (32K)
/services/certificateService.js (20K+)
/services/completionService.js (20K+)
/services/courseService.js (19K)
... and 9 more
```

### Core Configuration
```
/lib/mongodb.js - Database connection
/lib/auth.js - Authentication logic
/middleware/instituteScope.js - Scope derivation
/middleware/sessionValidation.js - Session validation (206 lines)
/middleware.js - NextAuth middleware
```

### API Routes
```
170+ routes in /app/api/v1/
Most critical:
- /app/api/v1/students/route.js
- /app/api/v1/students/[id]/route.js
- /app/api/v1/admissions/convert/route.js
- /app/api/v1/fees/[id]/payment/route.js
- /app/api/v1/certificates/[id]/route.js
```

---

## 12. Development Environment Setup

### Environment Variables (.env.local)
```
MONGODB_URI=mongodb://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_CLOUD_NAME=...
PUSHER_KEY=...
PUSHER_SECRET=...
```

### Commands
```bash
npm run dev      # Development server (port 3000)
npm run build    # Production build
npm start        # Start production server
npm run seed     # Seed database (if available)
npm run lint     # ESLint checking
```

---

## 13. Security Features

1. **Authentication**: NextAuth 4.x with JWT tokens
2. **Password Security**: bcryptjs with proper salting
3. **Institute Scoping**: All queries scoped to authenticated institute
4. **Soft Deletes**: No permanent data loss, audit trail maintained
5. **CORS Headers**: Strict security headers configured
6. **Audit Logging**: All significant actions logged
7. **Session Isolation**: SCHOOL types enforce session boundaries
8. **File Upload Security**: Cloudinary integration with validation
9. **XSS Protection**: DOMPurify for HTML sanitization

---

## 14. Performance Optimizations

1. **Database Indexing**: Compound and partial indexes on critical fields
2. **Caching**: In-memory cache for institute data (5-min TTL)
3. **Parallel Queries**: Promise.all() for dashboard stats
4. **Lazy Loading**: Pagination support on large datasets
5. **Query Optimization**: Selective field projections
6. **Soft Delete Filtering**: Partial indexes for active records

---

## Summary

**IMS-V2** is a comprehensive, production-ready educational management system with:
- **Multi-tenant architecture** supporting schools (SCHOOL) and vocational institutes (VOCATIONAL)
- **Complete student lifecycle** from enquiry to enrollment to completion
- **Robust fee and payment tracking** system
- **Expanding certificate generation** capabilities
- **160+ API endpoints** covering all major features
- **Role-based access control** with 5 user roles
- **Session-based organization** for traditional schools
- **Public-facing admission forms** for lead generation

The codebase is well-structured, following Next.js best practices, with clear separation of concerns between models, services, and API routes. The database schema is comprehensive and normalized for multi-institute support.

