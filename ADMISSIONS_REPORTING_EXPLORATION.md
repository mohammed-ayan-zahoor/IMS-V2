# IMS V2 Codebase Exploration Summary - Admissions & Reporting

## Executive Summary
The IMS V2 is a Next.js-based Institution Management System built with MongoDB, handling student admissions, fee tracking, attendance, and course management. The system currently has a solid foundation for admission applications and student creation, but lacks month-wise admission reporting functionality.

---

## 1. HOW ADMISSIONS DATA IS STORED AND STRUCTURED

### 1.1 Data Models

#### **AdmissionApplication Model** (`/models/AdmissionApplication.js`)
```
Schema:
  - institute: ObjectId (ref: Institute) [INDEXED]
  - firstName, lastName: String
  - email: String [INDEXED with phone]
  - phone: String [INDEXED with email]
  - dateOfBirth: Date
  - gender: Enum ['Male', 'Female', 'Other']
  - course: ObjectId (ref: Course)
  - learningMode: Enum ['Online', 'Offline', 'Hybrid']
  - guardian: {name, phone, relation}
  - address: {street, city, state, pincode}
  - previousEducation: String
  - photo: String (URL stored by Cloudinary)
  - fatherName, motherName: String
  - studentAadhar, fatherAadhar, motherAadhar: String
  - status: Enum ['pending', 'converted', 'cancelled']
  - notes: String
  - referredBy: String
  - timestamps: createdAt, updatedAt [AUTO - for monthly reporting]
```

**Key Characteristics:**
- Timestamps (`createdAt`, `updatedAt`) are automatically managed
- Multi-institute support (separate records per institute)
- Status tracking: pending → converted OR cancelled
- Photo upload to Cloudinary
- Can store all family details for reporting

#### **User Model (Students)** (`/models/User.js`)
Once converted, applications become User documents with:
```
  - _id: ObjectId
  - institute: ObjectId (ref: Institute)
  - email: String (unique per institute)
  - role: 'student'
  - profile: {firstName, lastName, phone, gender, avatar, dateOfBirth, address}
  - guardianDetails: {name, phone, relation}
  - enrollmentNumber: String (STU{YEAR}{SEQ}, unique per institute)
  - status: Enum ['ACTIVE', 'COMPLETED', 'DROPPED', 'PAUSED']
  - referredBy: String
  - admissionDate: Date [TRACKS ADMISSION]
  - createdAt, updatedAt: Date [TIMESTAMPS]
```

#### **Batch Model** (`/models/Batch.js`)
```
  - enrolledStudents: [{
      student: ObjectId (ref: User),
      enrolledAt: Date,
      status: 'active'|'completed'|'dropped'
    }]
  - course: ObjectId (ref: Course)
  - schedule: {startDate, endDate}
  - timestamps: createdAt
```

#### **Institute Model** (`/models/Institute.js`)
```
  - type: Enum ['VOCATIONAL', 'SCHOOL']  ← CATEGORIZATION
  - status: Enum ['active', 'inactive', 'suspended', 'trial']
  - usage: {studentCount, adminCount}
  - timestamps: createdAt
```

---

## 2. HOW INSTITUTIONS ARE CATEGORIZED

### 2.1 Institution Types
Located in `Institute.js`:
```javascript
type: {
    type: String,
    enum: ['VOCATIONAL', 'SCHOOL'],
    default: 'VOCATIONAL',
    required: true
}
```

### 2.2 Filtering by Type
Examples from codebase:
```javascript
// From /app/admin/reports/follow-ups/page.jsx
const isSchool = session?.user?.institute?.type === 'SCHOOL' 
                || session?.user?.institute?.code === 'QUANTECH';

// Query pattern
Institute.find({ type: 'VOCATIONAL', status: 'active' })
```

### 2.3 Vocational Institution Identification
- **Primary indicator**: `institute.type === 'VOCATIONAL'`
- **Secondary indicators**: 
  - Course fees structure (vocational: course-based)
  - Batch-based enrollment (vocational: multiple batches per course)
  - Session handling (vocational: less session-dependent)

---

## 3. EXISTING ADMISSION TRACKING & REPORTING

### 3.1 Admission Tracking Features
1. **Admission Form (Public)**: `/app/admission/[instituteId]/page.jsx`
   - Public form for students to submit applications
   - Data saved to AdmissionApplication collection

2. **Admission Applications Dashboard**: `/app/admin/enquiries/applications/page.jsx`
   - Displays all applications for an institute
   - Filters by status: pending, converted, cancelled
   - Shows: applicant name, course, applied date, referral source
   - Actions: View details, Convert to Student, Cancel application

3. **Conversion Process**: `/api/v1/admissions/convert/route.js`
   - Converts AdmissionApplication → User (Student)
   - Auto-generates enrollment number
   - Enrolls in specified batch
   - Creates Fee record

### 3.2 Current Reporting Gaps
❌ No month-wise admission reports
❌ No vocational-specific admission analytics
❌ No admission funnel tracking (applications → conversions)
❌ No source/channel analysis
❌ No time-series admission trends
❌ No batch-wise admission summaries

### 3.3 Existing Report Types (Other Domains)
- **Attendance Reports**: `/app/admin/reports/attendance/page.jsx`
  - Date-range filtering
  - Course/batch-level filtering
  - Export to Excel (XLSX)
  - Uses MongoDB aggregation pipelines

- **Follow-up Reports**: `/app/admin/reports/follow-ups/page.jsx`
  - Session-based filtering (for schools)
  - Export functionality
  - Status tracking

- **Collections Reports**: `/api/v1/reports/collections/route.js`
  - Pagination support
  - Aggregation with $facet for count + data
  - Payment tracking

---

## 4. DATA QUERYING & RETRIEVAL

### 4.1 API Endpoints for Admissions

**GET /api/v1/admissions**
```javascript
// Query parameters:
- instituteId (required for filtering)
- status (optional: 'pending', 'converted', 'cancelled')

// Returns:
{
  applications: [
    {
      _id, firstName, lastName, email, phone, 
      dateOfBirth, course, learningMode, 
      guardian, address, referredBy,
      status, createdAt, updatedAt
    }
  ]
}
```

**POST /api/v1/admissions**
- Create new admission application
- Photo upload to Cloudinary
- Required fields validation

**PATCH /api/v1/admissions**
- Update application status
- Update notes

**POST /api/v1/admissions/convert**
- Convert application to student
- Requires: applicationId, batchId
- Creates User + enrolls in batch + creates Fee

### 4.2 Database Query Patterns

**Counting applications:**
```javascript
AdmissionApplication.countDocuments({ 
  institute: instituteId,
  status: 'pending'
})
```

**Finding with population:**
```javascript
AdmissionApplication.find(query)
  .populate('course', 'name code fees')
  .sort({ createdAt: -1 })
```

**Filtering by date range:**
```javascript
AdmissionApplication.find({
  institute: instituteId,
  createdAt: {
    $gte: startOfMonth(date),
    $lte: endOfMonth(date)
  }
})
```

### 4.3 Authentication & Authorization
- Middleware: `getServerSession(authOptions)` from next-auth
- Role-based: admin, super_admin can access reports
- Multi-tenant: Institute-scoped queries from session context

---

## 5. EXISTING REPORT GENERATION PATTERNS

### 5.1 Report Architecture Pattern

**Frontend Page Component** (e.g., `/app/admin/reports/attendance/page.jsx`):
```
1. useState: loading, data, filters
2. useEffect: fetch courses → fetch batches → fetch report data
3. Filters: course, batch, date range, search
4. API call with URLSearchParams
5. Display: table with rows
6. Export: convert to XLSX
```

**Backend API Route** (e.g., `/api/v1/reports/attendance/route.js`):
```
1. Session validation (auth check)
2. URL params parsing (filters)
3. MongoDB aggregation pipeline:
   - $match (filter by institute, batch, date)
   - $unwind (flatten array fields)
   - $group (aggregate stats)
   - $lookup (join with related data)
   - $project (shape output)
   - $sort
4. Return paginated/aggregated data
```

### 5.2 Common Report Components

**Date-based Filtering:**
```javascript
const { startDate, endDate } = searchParams;
const matchStage = {
  date: {
    $gte: startOfDay(parseISO(startDate)),
    $lte: endOfDay(parseISO(endDate))
  }
};
```

**Institute Scoping:**
```javascript
const instituteId = session.user.institute?.id;
const matchQuery = {
  institute: new mongoose.Types.ObjectId(instituteId)
};
```

**Aggregation with $facet (pagination + count):**
```javascript
{
  $facet: {
    results: [
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ],
    total: [
      { $count: "total" }
    ]
  }
}
```

**Export to Excel:**
```javascript
import * as XLSX from "xlsx";
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(data);
XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
XLSX.writeFile(workbook, `report_${date}.xlsx`);
```

### 5.3 Report Features

✅ Date-range filtering
✅ Multi-level filtering (course → batch)
✅ Search functionality
✅ Pagination support
✅ Export to Excel (XLSX)
✅ Session-based filtering (schools)
✅ Responsive tables
✅ Loading states

---

## 6. OVERALL ARCHITECTURE & TECH STACK

### 6.1 Technology Stack

```
Frontend:
├─ Framework: Next.js 16.1.1 (React 19.2.3)
├─ Styling: Tailwind CSS 4.1.18
├─ State Management: React Context API
├─ Date Handling: date-fns 4.1.0
├─ Charts: Recharts 3.8.1
├─ Export: XLSX 0.18.5
├─ UI Icons: lucide-react 0.562.0
└─ Authentication: next-auth 4.24.13

Backend:
├─ Framework: Next.js API Routes
├─ Database: MongoDB with Mongoose 9.0.2
├─ Authentication: JWT via next-auth
├─ File Storage: Cloudinary
├─ PDF Generation: PDFKit 0.18.0, Puppeteer 24.41.0
└─ QR Codes: qrcode 1.5.4

DevOps:
├─ Container: Capacitor (mobile)
└─ Notifications: Pusher

Development:
├─ Package Manager: npm
├─ Linting: ESLint 9
└─ Scripting: Node.js
```

### 6.2 Directory Structure

```
/IMS-V2
├── app/
│   ├── api/v1/
│   │   ├── admissions/          ← Admission APIs
│   │   ├── reports/             ← Report APIs
│   │   └── students/            ← Student APIs
│   └── admin/
│       ├── enquiries/           ← Admission mgmt UI
│       ├── reports/             ← Report UIs
│       └── [other routes]
├── models/                       ← MongoDB schemas
├── services/                     ← Business logic
├── components/                   ← React components
├── contexts/                     ← Context API (session, toast)
├── lib/                          ← Utilities (auth, db, mail)
├── middleware/                   ← Auth middleware
└── public/                       ← Static files
```

### 6.3 Database Design

**Collections:**
- `admissionapplications` - admission forms
- `users` - students + staff
- `batches` - course batches
- `courses` - course definitions
- `institutes` - tenant organizations
- `fees` - fee records
- `attendances` - attendance logs
- `sessions` - academic sessions
- `followups` - follow-up tracking
- `enquiries` - leads

**Multi-tenancy:** All models have `institute: ObjectId` field
**Soft Deletes:** Most models have `deletedAt: Date` field
**Timestamps:** Auto-managed `createdAt`, `updatedAt`

### 6.4 Authentication Flow

```
1. Login → next-auth session
2. Session carries: user._id, role, institute (id, name, code, type)
3. API routes validate via getServerSession()
4. Institute scope applied to queries
5. Role-based access control (admin/super_admin for reports)
```

### 6.5 Data Flow

```
Public Form
  ↓
AdmissionApplication (pending)
  ↓ [Admin action]
Convert to Student
  ↓
User (role: student) + Batch enrollment + Fee record
  ↓
Active student in system
```

---

## 7. RECOMMENDED APPROACH FOR MONTH-WISE ADMISSION REPORTS

### 7.1 Implementation Strategy

#### **Phase 1: Backend API** (`/app/api/v1/admissions/report/route.js`)

```javascript
// New endpoint: GET /api/v1/admissions/report

// Query Parameters:
- startDate (YYYY-MM-DD) - optional, defaults to start of current month
- endDate (YYYY-MM-DD) - optional, defaults to end of current month
- instituteId - from session or query
- groupBy - 'day' | 'week' | 'month' (optional)
- status - 'all' | 'pending' | 'converted' | 'cancelled' (optional)
- course - courseId filter (optional)

// Response:
{
  summary: {
    total: 150,
    pending: 45,
    converted: 100,
    cancelled: 5,
    conversionRate: 66.7,
    period: "2024-05-01 to 2024-05-31"
  },
  timeSeries: [
    { date: "2024-05-01", pending: 5, converted: 3, cancelled: 1 },
    { date: "2024-05-02", pending: 8, converted: 5, cancelled: 0 },
    ...
  ],
  byCourse: [
    { course: "Cert Name", total: 50, converted: 40, rate: 80 },
    ...
  ],
  byReferral: [
    { source: "Direct", count: 60 },
    { source: "Website", count: 40 },
    ...
  ],
  conversionFunnel: [
    { stage: "Application", count: 145 },
    { stage: "Converted", count: 100 },
    { stage: "Cancelled", count: 5 }
  ],
  byInstitutionType: {
    VOCATIONAL: { total: 100, converted: 75, rate: 75 },
    SCHOOL: { total: 50, converted: 25, rate: 50 }
  }
}
```

#### **Phase 2: MongoDB Aggregation Pipeline**

```javascript
// Pattern:
const pipeline = [
  // 1. Filter by institute & date range
  {
    $match: {
      institute: ObjectId(instituteId),
      createdAt: { $gte: startDate, $lte: endDate },
      ...(status !== 'all' && { status })
    }
  },
  
  // 2. Group by date
  {
    $group: {
      _id: {
        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
      },
      pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
      converted: { $sum: { $cond: [{ $eq: ["$status", "converted"] }, 1, 0] } },
      cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
      total: { $sum: 1 }
    }
  },
  
  // 3. Sort by date
  { $sort: { "_id.date": 1 } }
];

// For course breakdown:
{
  $group: {
    _id: "$course",
    total: { $sum: 1 },
    converted: { $sum: { $cond: [{ $eq: ["$status", "converted"] }, 1, 0] } }
  }
},
{
  $lookup: {
    from: "courses",
    localField: "_id",
    foreignField: "_id",
    as: "courseInfo"
  }
}
```

#### **Phase 3: Frontend UI** (`/app/admin/reports/admissions/page.jsx`)

```
Components:
├── Header with period selection
├── Summary Cards: Total | Pending | Converted | Cancelled | Conversion Rate
├── Filters:
│   ├── Date Range Picker
│   ├── Institution Type: All | Vocational | School
│   ├── Course Selector
│   ├── Referral Source
│   └── Status Filter
├── Visualizations:
│   ├── Line Chart: Daily admission trends
│   ├── Pie Chart: Status distribution
│   ├── Bar Chart: By course / by referral
│   └── Funnel Chart: Conversion funnel
├── Data Tables:
│   ├── Detail table with all applications
│   ├── Course-wise summary
│   └── Referral source summary
└── Export Options:
    ├── Export as PDF
    ├── Export as Excel
    └── Send via Email
```

### 7.2 Key Data Points for Monthly Reports

**For Vocational Institutions:**
- Application volume trend (daily/weekly/monthly)
- Course-wise admission distribution
- Conversion funnel (pending → converted → active enrollment)
- Referral source analysis
- Time-to-conversion metrics
- Batch capacity vs. admissions

**Recommended Aggregations:**
```javascript
// 1. Monthly summary
db.admissionapplications.aggregate([
  { $match: { institute, createdAt: { $gte, $lte } } },
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
      converted: { $sum: { $cond: [{ $eq: ["$status", "converted"] }, 1, 0] } }
    }
  }
])

// 2. By course
db.admissionapplications.aggregate([
  { $match: {...} },
  { $group: { _id: "$course", count: { $sum: 1 } } },
  { $lookup: { from: "courses", ... } }
])

// 3. Conversion time analysis
db.admissionapplications.aggregate([
  { $match: { status: "converted" } },
  { $addFields: {
    conversionDays: {
      $subtract: ["$updatedAt", "$createdAt"]
    }
  } },
  { $group: {
    _id: null,
    avgConversionTime: { $avg: "$conversionDays" },
    minTime: { $min: "$conversionDays" },
    maxTime: { $max: "$conversionDays" }
  } }
])
```

### 7.3 Implementation Steps

1. **Create Admission Report Model/Schema** (optional - for caching)
   ```javascript
   // models/AdmissionReport.js
   {
     institute, year, month,
     totalApplications, convertedCount, cancellationCount,
     conversionRate, summaryData, metadata,
     generatedAt, generatedBy
   }
   ```

2. **Create Backend Service** (`services/admissionReportService.js`)
   ```javascript
   static async getMonthlyReport(instituteId, year, month, filters)
   static async getTimeSeries(instituteId, startDate, endDate)
   static async getCourseBreakdown(instituteId, startDate, endDate)
   static async getConversionMetrics(instituteId, startDate, endDate)
   ```

3. **Create API Route** (`/app/api/v1/admissions/report/route.js`)
   - GET endpoint with filters
   - Validation & authorization
   - Call service methods
   - Return aggregated data

4. **Create Frontend UI**
   - Follow existing report page patterns
   - Add period selector (month/year)
   - Add institution type filter
   - Add visualizations (Recharts)
   - Add export functionality

5. **Add to Navigation**
   - `/app/admin/reports/admissions/page.jsx`
   - Add menu item to admin dashboard
   - Link from admissions management

### 7.4 Query Optimization

**Indexes to Add:**
```javascript
// AdmissionApplication
AdmissionApplicationSchema.index({ institute: 1, createdAt: -1 });
AdmissionApplicationSchema.index({ institute: 1, status: 1, createdAt: 1 });
AdmissionApplicationSchema.index({ course: 1, createdAt: -1 });
```

**Performance Tips:**
- Use aggregation pipeline (not find + post-process)
- Use $facet for parallel stats computation
- Cache monthly reports (immutable after month ends)
- Use date ranges with ObjectId timestamps for better indexing

---

## 8. CURRENT DATA STATISTICS

**Timestamp Availability:**
- AdmissionApplication: ✅ createdAt, updatedAt (auto-managed)
- User (Student): ✅ createdAt, updatedAt, admissionDate
- Batch: ✅ createdAt, updatedAt, schedule.startDate/endDate

**Multi-tenant Support:** ✅ All models have institute field
**Status Tracking:** ✅ AdmissionApplication has 3 statuses
**Referral Tracking:** ✅ referredBy field present
**Course Tracking:** ✅ course ObjectId reference
**Photo Storage:** ✅ Cloudinary integration

---

## 9. EXISTING UTILITIES & LIBRARIES

**Date Processing:**
- date-fns 4.1.0 (format, startOfMonth, endOfMonth, subDays)

**Data Export:**
- XLSX 0.18.5 (Excel export)

**Visualizations:**
- Recharts 3.8.1 (charts & graphs)

**Authentication:**
- next-auth 4.24.13 (session management)

**Database:**
- Mongoose 9.0.2 (schema validation, queries)

---

## 10. SECURITY & MULTI-TENANCY CONSIDERATIONS

**Institute Isolation:**
- All queries must include `institute: instituteId`
- Session carries institute context
- Middleware validates institute scope

**Authorization Levels:**
- Students: Can only view own data
- Instructors: Can view batch-level data
- Admins: Can view institute data
- Super-admins: Can view all data

**Data Protection:**
- Soft deletes for audit trail
- Passwords hashed with bcryptjs
- Photos stored on Cloudinary (not local)
- Sensitive fields excluded from responses

---

## Summary of Key Findings

### Current State:
✅ Solid admission application model with timestamps
✅ Clear conversion process (app → student)
✅ Multi-institute support
✅ Institution type categorization (VOCATIONAL/SCHOOL)
✅ Photo upload infrastructure
✅ Referral tracking
✅ Existing report patterns (attendance, follow-ups)
✅ Excel export capability
✅ Recharts for visualization

### Gaps:
❌ No month-wise admission reports
❌ No admission analytics/funnel tracking
❌ No time-series admission trends
❌ No vocational-specific reporting
❌ No batch-wise admission summaries

### Recommended Next Steps:
1. Create `/api/v1/admissions/report` endpoint with aggregations
2. Build admin report UI at `/app/admin/reports/admissions`
3. Add institutional type filtering
4. Include course-wise and referral-wise breakdowns
5. Add export to PDF/Excel functionality
6. Create service layer for report generation

