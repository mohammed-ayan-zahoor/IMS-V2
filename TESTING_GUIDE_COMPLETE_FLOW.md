# Complete Testing Flow Guide - School Management System
## End-to-End Workflow for a New Institute

This guide walks through the complete lifecycle of setting up and operating a school within your system. Follow this sequentially to test all features.

---

## PHASE 1: INITIAL SETUP (Day 1 - Before Admissions)
### Goal: Prepare the foundation for the school year

### Step 1.1: Institute Settings Configuration
**Location:** Admin Dashboard → Settings  
**Route:** `/admin/settings`  
**What to do:**
- Fill in Institute Name (e.g., "ABC Public School")
- Add Contact Email, Phone, Website
- Add Address (Street, City, State, Pincode)
- Upload Institute Logo (max 2MB)
- Set Institute Type (School/College/University)
- Configure Receipt Template (classic/modern)
- Save Certificate Templates (LC, Transfer, Character)
  - Edit HTML templates for certificates
  - Add signature fields
  - Configure QR code placement

**API Endpoints Used:**
- `GET /api/v1/institute` - Fetch current settings
- `POST /api/v1/institute` - Save institute settings
- `POST /api/v1/upload` - Upload logo

**Database Records Created:**
- Institute document updated with settings

**Validation Points:**
- Logo must be valid image format
- Phone number format validation
- Email validation
- All required fields filled

---

### Step 1.2: Create Academic Year/Session
**Location:** Admin Dashboard → Courses (or Setup Wizard)  
**Route:** `/admin/courses`  
**What to do:**
- Create new Academic Year (e.g., "2024-25")
- Set Start Date and End Date
- Define number of terms (2 or 3)
- Mark as Active/Inactive

**API Endpoints Used:**
- `POST /api/v1/courses` - Create academic year
- `GET /api/v1/courses` - List all years

**Database Records Created:**
- Course document (represents academic year)

**Expected Result:**
- Year appears in dropdown throughout the system

---

### Step 1.3: Create Classes/Standards
**Location:** Admin Dashboard → Courses  
**Route:** `/admin/courses`  
**What to do:**
- Create Classes (1st Std, 2nd Std, ... 12th Std / or Classes A, B, C)
- For each class, enter:
  - Class Name (e.g., "Class 10")
  - Class Code (e.g., "CLASS-10")
  - Class Strength (expected number of students)
  - Class Teacher (optional, can assign later)

**API Endpoints Used:**
- `POST /api/v1/courses/{id}/batches` - Create class
- `GET /api/v1/courses` - List all classes

**Database Records Created:**
- Multiple Batch documents (one per class/standard)

**Expected Result:**
- All classes listed in the system

---

### Step 1.4: Create Sections/Batches for Each Class
**Location:** Admin Dashboard → Batches  
**Route:** `/admin/batches`  
**What to do:**
- For each class, create sections (A, B, C, etc.)
- For each section, enter:
  - Section Name (e.g., "Class 10-A", "Class 10-B")
  - Class (dropdown - select from Step 1.3)
  - Capacity (e.g., 40 students)
  - Class Teacher
  - Start Date & End Date

**API Endpoints Used:**
- `POST /api/v1/batches` - Create section/batch
- `GET /api/v1/batches` - List all batches
- `PUT /api/v1/batches/{id}` - Edit batch

**Database Records Created:**
- Batch document (each section is a batch)

**Expected Result:**
- Batches appear in dropdown when selecting student class

---

### Step 1.5: Create Subjects
**Location:** Admin Dashboard → Subjects  
**Route:** `/admin/subjects`  
**What to do:**
- Create all subjects offered (Math, Science, English, History, etc.)
- For each subject, enter:
  - Subject Name
  - Subject Code
  - Description (optional)

**API Endpoints Used:**
- `POST /api/v1/subjects` - Create subject
- `GET /api/v1/subjects` - List subjects

**Database Records Created:**
- Subject documents

---

### Step 1.6: Map Subjects to Classes
**Location:** Admin Dashboard → Subjects → [Subject Name]  
**Route:** `/admin/subjects/[id]/syllabus`  
**What to do:**
- For each subject, select which classes it's taught in
- For each class, optionally define:
  - Syllabus chapters/topics
  - Weightage per topic
  - Teaching duration

**API Endpoints Used:**
- `PUT /api/v1/subjects/{id}` - Update subject-batch mapping
- `POST /api/v1/subjects/{id}/syllabus` - Add syllabus details

**Database Records Created:**
- Subject-Batch mapping in database

---

### Step 1.7: Create Staff & Teacher Accounts
**Location:** Admin Dashboard → Users  
**Route:** `/admin/users`  
**What to do:**
- Create teacher accounts:
  - Full Name
  - Email (must be unique)
  - Phone
  - Subject(s) they teach
  - Classes assigned
  - Set as Class Teacher (optional)
- Create admin accounts:
  - Full Name
  - Email
  - Phone
  - Role (Admin/Accountant/Staff)
- System generates temporary password (send via email or SMS)

**Form Fields:**
- Name, Email, Phone, Role dropdown
- Subjects taught (multi-select)
- Batches assigned (multi-select)

**API Endpoints Used:**
- `POST /api/v1/users` - Create user
- `GET /api/v1/users` - List users
- `POST /api/v1/auth/send-credentials` - Send login credentials

**Database Records Created:**
- User documents with hashed passwords
- User-Batch mappings
- User-Subject mappings

**Validation Points:**
- Email uniqueness
- Phone format
- Role exists in system

---

### Step 1.8: Define Fee Structure
**Location:** Admin Dashboard → Fees  
**Route:** `/admin/fees`  
**What to do:**

#### 1.8a: Create Fee Heads (Categories)
- Add Fee Head Names (Admission Fee, Tuition Fee, Library Fee, etc.)
- For each head, set:
  - Fee Head Name
  - Code
  - Description
  - Compulsory (Yes/No)

**API Endpoints Used:**
- `POST /api/v1/fee-heads` - Create fee head
- `GET /api/v1/fee-heads` - List fee heads

#### 1.8b: Create Fee Plans per Batch
- For each batch/class, create fee plan:
  - Select Batch
  - Select applicable fee heads
  - Enter amount for each head
  - Example:
    - Admission Fee: ₹500 (one-time)
    - Tuition Fee: ₹5000 (monthly)
    - Library Fee: ₹200 (annual)

**API Endpoints Used:**
- `POST /api/v1/fee-plans` - Create fee plan
- `GET /api/v1/fee-plans` - List fee plans
- `PUT /api/v1/fee-plans/{id}` - Update fee plan

#### 1.8c: Define Payment Installments
- For each fee head, define when it's due:
  - One-time (on admission)
  - Monthly (12 months)
  - Quarterly (4 payments)
  - Semi-annual (2 payments)
  - Annual (1 payment)

**API Endpoints Used:**
- `POST /api/v1/fee-schedules` - Create installment schedule
- `GET /api/v1/fee-schedules` - Get schedules

**Database Records Created:**
- FeeHead documents
- FeePlan documents
- FeeSchedule documents

**Expected Result:**
- When a student is admitted, they automatically get assigned fees based on their batch

---

## PHASE 2: ADMISSION & ONBOARDING (Week 1-2)
### Goal: Admit students into the system

### Step 2.1: Generate & Share Admission Portal Link
**Location:** Admin Dashboard → Enquiries (or Settings)  
**Route:** `/admin/enquiries`  
**What to do:**
- Go to Enquiries section
- Find option to "Generate Public Link" or "Share Admission Form"
- Copy the shareable link (e.g., `/admission/[instituteId]`)
- Send to parents via WhatsApp, Email, Website
- Test: Open link on mobile device
  - Verify responsive design
  - Verify no authentication required
  - Verify form loads

**API Endpoints Used:**
- `GET /api/v1/shared-links` - Get public links
- `POST /api/v1/shared-links` - Create new link

**Database Records Created:**
- SharedLink document

**Testing Points:**
- Link works on Chrome, Safari, Firefox
- Mobile responsiveness check
- Form fields render correctly

---

### Step 2.2: Record Enquiries (Walk-in or Manual Entry)
**Location:** Admin Dashboard → Enquiries  
**Route:** `/admin/enquiries`  
**What to do:**

#### 2.2a: Track Online Enquiries (from admission portal)
- Enquiries auto-populate from the public admission form
- Click on each enquiry to view details

#### 2.2b: Manually Add Walk-in Enquiries
- Click "Add Enquiry" or "New Enquiry"
- Fill form:
  - Student Full Name
  - Parent/Guardian Name
  - Contact Phone & Email
  - Class Interested In (dropdown)
  - Additional Info
- Save

**Form Fields:**
- Student Name, DOB, Gender
- Father's Name, Mother's Name, Guardian Name
- Contact Phone (primary, secondary)
- Email
- Class Interested In
- Source (Website, Recommendation, Walk-in, Social Media, etc.)
- Remarks/Notes

**API Endpoints Used:**
- `POST /api/v1/enquiries` - Create enquiry
- `GET /api/v1/enquiries` - List all enquiries
- `PUT /api/v1/enquiries/{id}` - Update enquiry
- `POST /api/v1/enquiries/{id}/follow-up` - Record follow-up

**Database Records Created:**
- Enquiry document

**Expected Result:**
- Enquiry appears in list
- Can mark follow-up status (Not Contacted, Contacted, Interested, Not Interested, Converted)

---

### Step 2.3: Track Follow-ups & Convert to Student
**Location:** Admin Dashboard → Enquiries → [Enquiry Details]  
**Route:** `/admin/enquiries`  
**What to do:**
- Click on an enquiry
- Record follow-up actions:
  - Date of contact
  - Mode (Phone, Email, In-person)
  - Notes
  - Next follow-up date
  - Status (Interested / Not Interested / Converted)
- Once interested, click "Convert to Student" or "Create Application"

**API Endpoints Used:**
- `POST /api/v1/enquiries/{id}/follow-ups` - Record follow-up
- `POST /api/v1/enquiries/{id}/convert` - Convert to student

**Database Records Created:**
- FollowUp documents
- Application document (when converted)

---

### Step 2.4: Create Student Application/Admission
**Location:** Admin Dashboard → Students (or from Enquiry)  
**Route:** `/admin/students`  
**What to do:**

#### 2.4a: From Enquiry (Recommended)
- Go to Enquiries → Click "Convert to Student"
- Pre-filled with: Student Name, Parent Names, Contact Info
- Fill additional fields:
  - Date of Birth
  - Gender
  - Class (Batch) to admit into
  - Aadhaar Number (optional)
  - Previous School (optional)
  - Upload Student Photo (passport size)

#### 2.4b: Manual Entry (if not from enquiry)
- Go to Students → "Add New Student"
- Fill complete form with same fields

**Form Fields:**
- Personal: Full Name, DOB, Gender, Religion, Caste
- Parent Info: Father Name, Father Occupation, Mother Name, Mother Occupation
- Contact: Address, City, State, Pincode, Phone, Email
- Emergency Contact: Name & Phone
- Previous Education: School Name, Board, Class, Result %
- Medical: Blood Group, Allergies, Special Needs
- Identification: Aadhaar, Roll No, Admission No (auto-generated)

**API Endpoints Used:**
- `POST /api/v1/students` - Create student
- `GET /api/v1/students` - List students
- `PUT /api/v1/students/{id}` - Update student
- `POST /api/v1/upload` - Upload photo

**Database Records Created:**
- Student document
- Student profile with all details

**Database Validations:**
- Email uniqueness (if provided)
- Phone number format
- DOB not in future
- Admission number auto-generated

**Expected Result:**
- Student appears in Students list
- Admission number generated (e.g., "STU-2024-0001")
- Student auto-assigned fees based on batch

---

### Step 2.5: Bulk Upload Student Photos
**Location:** Admin Dashboard → Students → [Bulk Upload or ID Cards]  
**Route:** `/admin/students` or `/admin/id-cards`  
**What to do:**
- Go to Students section
- Find "Bulk Upload Photos" option
- Upload CSV with columns: AdmissionNo/Email, PhotoPath
- Upload student photos as ZIP file
- System matches photos by admission number or email
- Verify matches in preview screen

**File Formats:**
- CSV: Admission No, Photo File Name
- Photos: JPG/PNG (max 500KB each)
- Naming convention: ADMNO_STUDENTNAME.jpg or EMAIL.jpg

**API Endpoints Used:**
- `POST /api/v1/bulk-upload/photos` - Upload photos
- `POST /api/v1/students/{id}/photo` - Set student photo

**Expected Result:**
- Photos matched and assigned to students
- Photo preview visible in student profile

---

### Step 2.6: Generate ID Cards
**Location:** Admin Dashboard → ID Cards  
**Route:** `/admin/id-cards`  
**What to do:**

#### 2.6a: Select ID Card Template
- Go to ID Cards section
- View pre-designed templates (or customize)
- Choose template layout (vertical/horizontal)
- Configure fields to display:
  - Student Photo
  - Admission Number
  - Name
  - Class/Batch
  - DOB
  - Blood Group
  - QR Code (links to student profile)

#### 2.6b: Preview & Generate
- Select batch/class to generate cards for
- Click "Preview" to see sample cards
- Click "Generate ID Cards" (PDF)
- Download PDF

#### 2.6c: Print ID Cards
- Print PDF on card stock
- Use lamination service
- Cut and distribute to students

**API Endpoints Used:**
- `GET /api/v1/id-card-templates` - Get templates
- `POST /api/v1/id-cards/generate` - Generate PDF
- `GET /api/v1/students/{id}` - Fetch student data for card

**PDF Generation Using:**
- Puppeteer (server-side)
- PDFKit library

**Database Records Created:**
- IDCard document (records that card was generated)

**Expected Output:**
- Multi-page PDF with ID cards
- Each card has student photo, details, QR code

---

### Step 2.7: Generate & Print Admission Forms
**Location:** Admin Dashboard → Students → [Student] → Print Admission Form  
**Route:** `/admin/students/[id]/admission-form`  
**What to do:**
- Go to student profile
- Click "Print Admission Form" or "Download Form"
- System generates pre-filled form with:
  - Student details
  - Parent details
  - Class info
  - Blank signature lines
- Print and get parent signature
- File in student record

**API Endpoints Used:**
- `GET /api/v1/students/{id}` - Fetch student data
- `POST /api/v1/students/{id}/admission-form` - Generate PDF

**PDF Generation:**
- Puppeteer or PDFKit
- HTML template with student data filled in

**Expected Output:**
- One-page or multi-page form
- Pre-filled with student data
- Blank sections for parent signatures
- School stamp/seal area

---

## PHASE 3A: DAILY OPERATIONS - ATTENDANCE (First Month)
### Goal: Track student and teacher attendance

### Step 3.1: Mark Daily Attendance (Teacher View)
**Location:** Teacher Dashboard → Attendance OR Admin Dashboard → Attendance  
**Route:** `/student/attendance` or `/admin/attendance`  
**What to do:**

#### 3.1a: Teacher Marks Attendance (for their class)
- Go to Attendance section
- Select Date (defaults to today)
- Select Batch/Class (auto-filled if class teacher)
- For each student, mark:
  - Present (P)
  - Absent (A)
  - Leave (L)
  - Half-day (H)
- Add remarks (optional)
- Submit

**UI Elements:**
- Calendar to select date
- Batch dropdown
- Checkbox/Radio for each student (P/A/L/H)
- Remarks text field
- Submit & Save buttons

**API Endpoints Used:**
- `POST /api/v1/attendance` - Record attendance
- `GET /api/v1/attendance/batch/{batchId}` - Get attendance for batch
- `PUT /api/v1/attendance/{id}` - Edit attendance record

**Database Records Created:**
- Attendance document (one per student per day)
- Fields: StudentId, BatchId, Date, Status, Remarks

**Validation:**
- Can't mark attendance for future dates
- Can edit attendance up to X days in the past
- Each student marked only once per day

**Expected Result:**
- Attendance saved
- Can view attendance report

---

### Step 3.1b: Subject-wise Attendance (for Class 10+)
**Location:** Teacher Dashboard → Attendance → Subject View  
**Route:** `/admin/attendance` (with subject filter)  
**What to do:**
- For higher classes, allow subject-wise attendance
- Same form as above, but:
  - Select Subject instead of Batch
  - Only students taking that subject shown
  - Mark attendance per subject

**API Endpoints Used:**
- `POST /api/v1/attendance/subject` - Record subject-wise attendance

---

### Step 3.2: View Attendance Reports
**Location:** Admin Dashboard → Reports → Attendance  
**Route:** `/admin/reports` or `/admin/completion-tracking`  
**What to do:**
- Go to Attendance Reports
- Filters:
  - Date Range (From - To)
  - Batch/Class
  - Subject (optional)
- View report with:
  - Total working days
  - Each student's Present/Absent/Leave count
  - Attendance % per student
  - Class-wise attendance average

**API Endpoints Used:**
- `GET /api/v1/attendance/report` - Get attendance report
- `GET /api/v1/attendance/batch/{batchId}/report` - Get batch report

**Database Aggregations:**
- Group by BatchId
- Count attendance by Status
- Calculate percentages

**Expected Output:**
- Table with: Student Name, Present, Absent, Leave, %, Remarks
- Class average at bottom
- Export to Excel option

---

## PHASE 3B: DAILY OPERATIONS - FEES (Ongoing)
### Goal: Collect fees and manage payments

### Step 3.3: Create Fee Records (Auto or Manual)
**Location:** Admin Dashboard → Fees  
**Route:** `/admin/fees`  
**What to do:**

#### 3.3a: Auto-creation on Student Admission
- When student is admitted to batch, system automatically:
  - Fetches fee plan for that batch
  - Creates Fee records based on fee schedule
  - Sets due dates per installment schedule

#### 3.3b: Manual Fee Creation (if needed)
- Go to Fees section
- Click "Add Fee"
- Select:
  - Student
  - Fee Head (Tuition, Library, etc.)
  - Amount
  - Due Date
  - Frequency (One-time, Monthly, etc.)
- Save

**API Endpoints Used:**
- `POST /api/v1/fees` - Create fee record
- `GET /api/v1/fees` - List fees
- `POST /api/v1/fees/batch/{batchId}/generate` - Auto-generate for batch

**Database Records Created:**
- Fee document with: StudentId, FeeHeadId, Amount, DueDate, Status

---

### Step 3.4: Collect Payment & Generate Receipt
**Location:** Admin Dashboard → Fees → [Student Fee] → Collect Payment  
**Route:** `/admin/fees`  
**What to do:**

#### 3.4a: Record Payment
- Go to Fees section
- Find student's pending fee
- Click "Collect Payment" or "Receive Payment"
- Enter:
  - Amount (auto-populated with due amount, can change if partial)
  - Payment Mode (Cash, Cheque, Online, DD)
  - If Cheque/DD: Cheque Number, Bank Name, Date
  - If Online: Reference Number, Transaction ID
  - Payment Date (defaults to today)
  - Remarks (optional)
- Save

**Form Fields:**
- Amount
- Payment Mode (dropdown)
- Cheque/DD fields (conditional)
- Reference Number
- Payment Date
- Remarks

**API Endpoints Used:**
- `POST /api/v1/receipts` - Create receipt & record payment
- `GET /api/v1/fees/{id}` - Get fee details

**Database Records Created:**
- Receipt document
- Fee status updated to "Paid" or "Partial"
- Collection record for accounting

---

### Step 3.4b: Generate Receipt
**Automatic on payment recording:**
- System generates receipt with:
  - Receipt Number (auto-increment per institute)
  - Student Name & Admission No
  - Fee Head(s) paid
  - Amount paid
  - Payment Mode
  - Date
  - Balance due (if any)
  - School details and stamp area

**API Endpoints Used:**
- `POST /api/v1/receipts/{id}/pdf` - Generate PDF receipt
- `POST /api/v1/receipts/{id}/send-email` - Email receipt to parent

**PDF Generation:**
- Puppeteer or PDFKit
- Receipt template with student & payment data

**Expected Output:**
- One-page professional receipt
- Can print or email to parent
- Receipt number for tracking

---

### Step 3.5: Apply Discount (if applicable)
**Location:** Admin Dashboard → Fees → [Student Fee] → Discount  
**Route:** `/admin/fees`  
**What to do:**
- Before collecting payment, can apply discount:
  - Select Discount Type:
    - Fixed Amount (₹500 off)
    - Percentage (10% off)
  - Enter Discount Value
  - Add Reason (Merit, Scholarship, Hardship, etc.)
  - Authorize by (Admin Name)
- Save

**API Endpoints Used:**
- `POST /api/v1/discounts` - Apply discount
- `PUT /api/v1/fees/{id}/discount` - Update fee with discount

**Database Records Created:**
- Discount document linked to Fee

---

### Step 3.6: Track Outstanding Balances
**Location:** Admin Dashboard → Reports → Collections or Fee Outstanding  
**Route:** `/admin/reports` or `/admin/collections`  
**What to do:**
- View outstanding fee report
- Filters:
  - Date Range
  - Batch/Class
  - Days Overdue (0-30, 31-60, 60+)
- Report shows:
  - Student Name, Admission No, Class
  - Total Due Amount
  - Days Overdue
  - Last Payment Date
  - Contact Info

**API Endpoints Used:**
- `GET /api/v1/fees/outstanding` - Get outstanding fees
- `GET /api/v1/fees/report/outstanding` - Outstanding report

**Database Aggregations:**
- Sum unpaid fees per student
- Calculate days overdue
- Group by batch

**Expected Output:**
- Table sorted by days overdue
- Export to Excel for follow-up
- Filter by overdue period

---

### Step 3.7: Generate Collection Reports
**Location:** Admin Dashboard → Reports → Collections  
**Route:** `/admin/reports` or `/admin/collections`  
**What to do:**
- View collections summary
- Filters:
  - Date Range (From - To)
  - Payment Mode (Cash, Cheque, Online, DD)
  - Fee Head
  - Batch
- Report shows:
  - Total Collection Amount
  - Collection by Payment Mode
  - Collection by Fee Head
  - Collection by Batch
  - Pending Amount
  - Collection % (vs. total due)

**API Endpoints Used:**
- `GET /api/v1/collections/report` - Get collection report
- `GET /api/v1/receipts` - Get all receipts

**Database Aggregations:**
- Sum receipts by mode/head/batch
- Calculate collection %

**Expected Output:**
- Summary dashboard with key metrics
- Detailed table of all receipts
- Charts showing collection trends

---

## PHASE 4: ACADEMIC ASSESSMENT (Mid-Year)
### Goal: Conduct exams and record marks

### Step 4.1: Create Exam Schedule
**Location:** Admin Dashboard → Exams  
**Route:** `/admin/exams`  
**What to do:**
- Click "Create Exam" or "New Exam"
- Fill form:
  - Exam Name (e.g., "Unit Test 1", "Mid-term Exam", "Annual Exam")
  - Exam Code (auto-generated)
  - Exam Type (Unit Test, Mid-term, Terminal, Annual, etc.)
  - Select Batches (which classes taking this exam)
  - Select Subjects (which subjects in exam)
  - Exam Start Date & End Date
  - Exam Duration (hours)
  - Total Marks
  - Passing Marks
  - Positive Marking (Yes/No)
  - Negative Marking (if yes, enter %)

**Form Fields:**
- Exam Name, Code, Type
- Batch (multi-select)
- Subject (multi-select)
- Date Range
- Time
- Duration
- Total Marks
- Passing Marks
- Marking scheme (Positive/Negative)

**API Endpoints Used:**
- `POST /api/v1/exams` - Create exam
- `GET /api/v1/exams` - List exams
- `PUT /api/v1/exams/{id}` - Edit exam

**Database Records Created:**
- Exam document
- ExamBatch documents (linking exam to batches)
- ExamSubject documents (linking exam to subjects)

**Expected Result:**
- Exam appears in calendar/list
- Subjects show in student dashboard

---

### Step 4.2: Generate Exam Datesheet
**Location:** Admin Dashboard → Exams → [Exam] → Datesheet  
**Route:** `/admin/exams/[id]`  
**What to do:**
- Click on exam
- View auto-generated datesheet:
  - Date → Subject(s) → Time
- Verify schedule (no clash)
- Can adjust timing if needed
- Click "Publish" to make visible to students
- Click "Print Datesheet" or "Download PDF"

**Datesheet Format:**
- Table with: Date | Subject | Time | Room/Hall (if applicable) | Duration

**API Endpoints Used:**
- `GET /api/v1/exams/{id}/datesheet` - Generate datesheet
- `POST /api/v1/exams/{id}/publish` - Publish datesheet

**Expected Output:**
- Professional datesheet printable/emailable to students and parents

---

### Step 4.3: Create Question Bank (Pre-exam)
**Location:** Admin Dashboard → Question Bank  
**Route:** `/admin/question-bank`  
**What to do:**

#### 4.3a: Add Questions
- Click "Create Question" or "New Question"
- Fill form:
  - Subject (dropdown)
  - Chapter/Topic
  - Question Type:
    - MCQ (Multiple Choice)
    - Short Answer
    - Long Answer
    - Numerical
    - True/False
  - Question Text
  - If MCQ: Option A, B, C, D
  - Correct Answer (MCQ: A/B/C/D; Others: text/image)
  - Mark Value (e.g., 1, 2, 5)
  - Difficulty Level (Easy, Medium, Hard)
  - Tags (optional)

**API Endpoints Used:**
- `POST /api/v1/questions` - Create question
- `GET /api/v1/questions` - List questions
- `PUT /api/v1/questions/{id}` - Edit question

**Database Records Created:**
- Question document

#### 4.3b: Create Question Set for Exam
- Go to Exam → "Add Questions"
- Search questions by:
  - Subject
  - Chapter
  - Difficulty
  - Mark value
- Select questions to add
- System calculates total marks
- Can shuffle question order (for randomization)

**API Endpoints Used:**
- `POST /api/v1/exams/{id}/questions` - Add questions to exam
- `PUT /api/v1/exams/{id}/randomize` - Randomize question order

**Database Records Created:**
- ExamQuestion documents linking Question to Exam

---

### Step 4.4: Students Take Exam (Online Practice)
**Location:** Student Dashboard → Exams → [Exam] → Take Exam  
**Route:** `/student/exams/[id]/take`  
**What to do:**
- Student logs in
- Goes to Exams section
- Finds exam (if today is exam day and active)
- Clicks "Start Exam"
- System shows:
  - Exam duration countdown
  - Question number and total (e.g., "Question 3 of 20")
  - Question text and options
  - Mark value
  - Navigation: Previous/Next/Jump to Question
  - Submit Answer button
- Student answers all questions
- Clicks "Submit Exam" at end
- Gets confirmation

**Features:**
- Auto-save every X seconds
- Warn before submitting
- Timer shows remaining time
- Can mark for review
- Can see question palette (answered/unanswered/marked)

**API Endpoints Used:**
- `GET /api/v1/exams/{id}/questions` - Fetch exam questions
- `POST /api/v1/exam-responses` - Save student answer
- `POST /api/v1/exam-responses/{id}/submit` - Submit exam

**Database Records Created:**
- ExamResponse document (one per question per student)
- ExamSubmission document (marks exam as submitted)

**Expected Result:**
- Student can't re-attempt after submission
- Answers saved in database

---

### Step 4.5: Teachers Mark Papers (if offline exam)
**Location:** Admin Dashboard → Exams → [Exam] → Results  
**Route:** `/admin/exams/[id]/results`  
**What to do:**
- For offline exams, teacher manually enters marks:
  - Go to Exam → Results section
  - Select Batch/Subject
  - View all students in table
  - Each row is a student
  - Click cell to enter marks
  - Or use bulk upload CSV
  - Enter marks per student per question (if marking per question) or total marks
- System auto-calculates:
  - Total marks
  - Grade (based on grading scheme)
  - Percentage
  - Pass/Fail

**Grading Scheme** (configurable per exam):
- Grade A: 90-100
- Grade B: 80-89
- Grade C: 70-79
- Grade D: 60-69
- Grade E: 50-59
- Grade F: <50

**API Endpoints Used:**
- `POST /api/v1/exams/{id}/marks` - Record marks
- `PUT /api/v1/exams/{id}/marks/{studentId}` - Update marks
- `POST /api/v1/bulk-upload/marks` - Bulk upload marks CSV

**Database Records Created:**
- ExamResult document per student
- Marks, Grade, Percentage calculated

**Bulk Upload Format:**
```
AdmissionNo,StudentName,Marks
STU-2024-0001,John Doe,85
STU-2024-0002,Jane Smith,92
```

**Expected Result:**
- Marks visible in results table
- Grades auto-calculated

---

### Step 4.6: Students View Results
**Location:** Student Dashboard → Exams → [Exam] → Results  
**Route:** `/student/exams/[id]/result`  
**What to do:**
- Student logs in
- Goes to Exams section
- Finds exam
- Clicks "View Result"
- Sees:
  - Total Marks Obtained
  - Total Marks
  - Percentage
  - Grade
  - Pass/Fail Status
  - Comparison: Class Average, Rank in class (optional)
  - Question-wise review (if answers shown):
    - Question
    - Student's Answer
    - Correct Answer
    - Marks obtained

**API Endpoints Used:**
- `GET /api/v1/exams/{id}/result/{studentId}` - Get student result

**Expected Result:**
- Student can see their marks
- Can review answers

---

### Step 4.7: Generate Progress Reports/Report Cards
**Location:** Admin Dashboard → Reports → Progress Report or Report Cards  
**Route:** `/admin/reports` or `/admin/certificate-management`  
**What to do:**
- Go to Reports section
- Select Report Type: "Progress Report" or "Report Card"
- Select Batch
- Select Period (Term 1, Term 2, Term 3, etc.) or Date Range
- Select format (Digital/PDF)
- Click "Generate"

**Report Card Contents:**
- Student Name, Admission No, Class
- Academic Performance:
  - All exams taken
  - Marks obtained / Total marks
  - Grade per exam
  - Overall percentage
- Subject-wise Summary:
  - Subject name
  - Marks in Unit tests
  - Marks in terminal exam
  - Grade
  - Remarks
- Attendance:
  - Total working days
  - Days present
  - Attendance %
- Behavior & Conduct (optional):
  - Conduct Grade
  - Remarks
- Teachers' Comments
- Principal's Signature area

**API Endpoints Used:**
- `GET /api/v1/students/{id}/report-card` - Generate report card
- `POST /api/v1/report-cards/generate` - Bulk generate report cards
- `POST /api/v1/report-cards/{id}/pdf` - Convert to PDF

**PDF Generation:**
- Puppeteer or PDFKit
- Template with student data filled in

**Expected Output:**
- Professional report card (1-2 pages)
- Can print or email
- Bulk PDF with all students' report cards

---

### Step 4.8: Monitor Syllabus Completion
**Location:** Admin Dashboard → Completion Tracking or Reports  
**Route:** `/admin/completion-tracking`  
**What to do:**
- Go to Completion Tracking section
- View per subject:
  - Total chapters/topics
  - Chapters taught (%) 
  - Chapters completed (%)
  - Expected completion date
  - Actual completion date
  - Teacher remarks
- Teachers update completion:
  - Go to Syllabus section
  - Mark chapters as "Started", "In Progress", "Completed"
  - Add notes/remarks

**API Endpoints Used:**
- `GET /api/v1/subjects/{id}/syllabus/completion` - Get completion status
- `PUT /api/v1/subjects/{id}/syllabus/{chapterId}/status` - Update chapter status
- `GET /api/v1/completion-tracking/report` - Get completion report

**Dashboard Metrics:**
- Overall completion % per subject
- Subject-wise progress bar
- Comparison with expected completion timeline
- Alerts if behind schedule

---

## PHASE 5: YEAR-END & TRANSITION
### Goal: Promote students, generate certificates, and close the year

### Step 5.1: Bulk Promotion of Students
**Location:** Admin Dashboard → Utility → Bulk Promotion or Students  
**Route:** `/admin/utility/bulk-promotion` or `/admin/students`  
**What to do:**
- Go to Bulk Promotion tool
- Confirm academic year end
- Select source batch (current class, e.g., Class 9)
- Select promotion rules:
  - All present: Promote all students who passed
  - Conditional: Only students with attendance > X% and marks > passing marks
  - Custom: Upload CSV with promotion decisions
- Preview:
  - Shows all students in batch
  - Shows promotion decision (Promote to X / Repeat / Leave)
- Can manually override for individual students:
  - Click student row to change promotion decision
  - Add remarks (e.g., "Repeater due to low marks")
- Execute/Confirm
  - System moves students to new batch
  - Archives old batch enrollments
  - Resets attendance for new year

**Form Fields:**
- Source Batch (dropdown)
- Target Batch (for promoted students)
- Promotion Type (All/Conditional/Custom)
- Approval Authority (Admin Name)
- Remarks (global)

**CSV Format for Custom Promotion:**
```
AdmissionNo,StudentName,SourceBatch,Decision,Remarks
STU-2024-0001,John Doe,Class 9-A,Promote,Good performance
STU-2024-0002,Jane Smith,Class 9-A,Repeat,Low marks
STU-2024-0003,Bob Johnson,Class 9-A,Leave,Dropped out
```

**API Endpoints Used:**
- `POST /api/v1/promotions` - Create promotion records
- `PUT /api/v1/promotions/{id}/execute` - Execute promotions
- `POST /api/v1/bulk-upload/promotions` - Bulk upload from CSV

**Database Operations:**
- Remove student from current batch
- Add student to new batch
- Archive current batch-student mapping
- Create Promotion record (for audit trail)

**Validations:**
- Can't promote to non-existent batch
- Can't promote students who haven't completed year
- Need approval from admin

**Expected Result:**
- All students promoted/repeated/left
- Student batches updated
- Audit trail recorded

---

### Step 5.2: Generate School Leaving Certificates (LC)
**Location:** Admin Dashboard → Certificates → Generate LC  
**Route:** `/admin/certificate-management`  
**What to do:**

#### 5.2a: Generate for Individual Student
- Go to Student profile
- Click "Generate LC" or "School Leaving Certificate"
- System pre-fills:
  - Student Name, Admission No
  - Class (where leaving from)
  - Leaving Date
  - Result (Promoted to X / Repeated / Left)
  - Conduct Grade
- Review and click "Generate"
- System creates PDF with:
  - Student details
  - Result status
  - Attendance summary
  - School details
  - Principal's signature area
  - School seal/stamp area

#### 5.2b: Bulk Generate for Leaving Students
- Go to Certificates section
- Click "Generate LCs in Bulk"
- Filters:
  - Batch (e.g., Class 12)
  - Promotion Status: "Left" (students leaving school)
- Preview list of students
- Click "Generate All"
- System creates PDF with all LCs
- Can download as:
  - Individual PDFs (one per student)
  - Combined PDF (all LCs in one file)

**API Endpoints Used:**
- `POST /api/v1/certificates` - Create certificate
- `GET /api/v1/certificates` - List certificates
- `POST /api/v1/certificates/{id}/pdf` - Generate PDF
- `POST /api/v1/certificates/batch` - Bulk generate

**Certificate Template Fields:**
- Certificate Type (LC)
- Student Name
- Admission Number
- Date of Birth
- Class
- Leaving Date
- Result Status
- Conduct Grade
- Remarks
- Issue Date
- Principal Name & Signature Line
- School Name & Seal Area

**Database Records Created:**
- Certificate document per student

**Expected Output:**
- Professional LC (1 page)
- QR code (optional, links to certificate for verification)
- Can print on official letterhead
- Digital copy stored in system

---

### Step 5.3: Generate Transfer/Character Certificates
**Location:** Admin Dashboard → Certificates  
**Route:** `/admin/certificate-management`  
**What to do:**
- Go to Certificates section
- Click "Generate Transfer Certificate" or "Character Certificate"
- Similar flow as LC:
  - Select student(s)
  - Review pre-filled details
  - Generate PDF

**Transfer Certificate Contents:**
- Student Name, Admission No, DOB
- Class studying from / to
- Subjects studied
- Conduct Grade
- Passing/Promoted status
- School details
- Principal signature area

**Character Certificate Contents:**
- Student Name, Admission No
- Period of study
- Conduct & behavior during period
- Remarks on character
- Principal signature area

**API Endpoints Used:**
- `POST /api/v1/certificates` - Create (type: Transfer/Character)
- `POST /api/v1/certificates/{id}/pdf` - Generate PDF

**Expected Output:**
- One-page certificate
- Can print on official letterhead

---

### Step 5.4: Generate Year-End Financial Report (P&L)
**Location:** Admin Dashboard → Reports → Financial or Accounts  
**Route:** `/admin/accounts` or `/admin/reports`  
**What to do:**
- Go to Accounts/Reports section
- Select Report Type: "Profit & Loss" or "Financial Summary"
- Select Period: Academic Year (from - to dates)
- Click "Generate"
- Report shows:
  - **Income:**
    - Fee collections (by head)
    - Donations (if any)
    - Other income
    - Total Income
  - **Expenses:**
    - Salaries (teachers + staff)
    - Rent/Maintenance
    - Utilities
    - Stationery & Materials
    - Other expenses
    - Total Expenses
  - **Summary:**
    - Total Income - Total Expenses = Profit/Loss
    - ROI %

**API Endpoints Used:**
- `GET /api/v1/receipts/report` - Get collection data
- `GET /api/v1/expenses/report` - Get expense data
- `POST /api/v1/accounts/p-l-report` - Generate P&L report

**Database Aggregations:**
- Sum all receipts by date range
- Sum all expenses by date range
- Calculate profit/loss

**Expected Output:**
- Professional report (1-2 pages)
- Charts showing income vs. expense
- Export to Excel option

---

### Step 5.5: Export Student Records for Government Compliance
**Location:** Admin Dashboard → Utility → Export or Reports  
**Route:** `/admin/utility/export` or `/admin/reports`  
**What to do:**
- Go to Export section
- Select what to export:
  - Student records
  - Attendance records
  - Fee collections
  - Exam results
  - All of above
- Select format: CSV or Excel
- Click "Export"
- System generates file with all data
- Download Excel/CSV file
- Can submit to government department if required

**CSV Format (Sample):**
```
AdmissionNo,StudentName,DOB,FathersName,MothersName,ContactPhone,Class,Batch,Enrollment Date,Leaving Date
STU-2024-0001,John Doe,15-01-2010,Mr. Doe,Mrs. Doe,9876543210,Class 10,10-A,01-04-2024,31-03-2025
STU-2024-0002,Jane Smith,22-03-2010,Mr. Smith,Mrs. Smith,9876543211,Class 10,10-A,01-04-2024,31-03-2025
```

**API Endpoints Used:**
- `POST /api/v1/export/students` - Export students
- `POST /api/v1/export/attendance` - Export attendance
- `POST /api/v1/export/fees` - Export fee records
- `POST /api/v1/export/exams` - Export exam results

**Expected Output:**
- Excel/CSV file with all records
- Ready to submit to government

---

### Step 5.6: Archive Old Data (Optional)
**Location:** Admin Dashboard → Utility → Archive or Settings  
**Route:** `/admin/utility/archive` or `/admin/settings`  
**What to do:**
- Go to Archive section (optional, after year-end)
- Select data to archive:
  - Attendance records from old year
  - Exam records from old year
  - Old fee records
- This moves data to archive storage (for performance)
- Data still accessible but not in main views
- Useful for keeping system fast

**API Endpoints Used:**
- `POST /api/v1/archive` - Archive records
- `GET /api/v1/archive` - Get archived records

---

### Step 5.7: Prepare for New Academic Year
**Location:** Admin Dashboard → Settings or Setup Wizard  
**Route:** `/admin/settings`  
**What to do:**
- Go back to PHASE 1 setup
- Create new academic year (e.g., "2025-26")
- Create new batches for new incoming class (e.g., Class 1)
- Archiving of previous year data (if not done)
- Reset all temporary data:
  - Attendance records
  - Exam records
  - Fee records
- System ready for next cohort of students

---

## TESTING CHECKLIST

Use this checklist while going through each phase:

### General Checks (All Phases)
- [ ] All forms validate correctly (empty fields, invalid email, etc.)
- [ ] API responses contain expected data
- [ ] Database records created correctly
- [ ] Error messages display clearly
- [ ] Success notifications shown after actions
- [ ] Pagination works for large lists
- [ ] Search/Filter functionality works
- [ ] Bulk operations complete without errors
- [ ] Mobile responsiveness (test on phone)
- [ ] Responsive to zoom levels (100%, 125%, 150%)

### Performance Checks
- [ ] List pages load in <2 seconds (with 100+ records)
- [ ] Reports generate in <5 seconds
- [ ] PDF generation completes in <10 seconds
- [ ] Bulk uploads handle 500+ records
- [ ] Search returns results instantly

### Data Integrity Checks
- [ ] No duplicate records created
- [ ] Foreign keys properly linked
- [ ] Soft deletes work (records archived, not deleted)
- [ ] Audit logs capture all changes
- [ ] Data remains consistent after operations

### Security Checks
- [ ] Only authorized users access admin pages
- [ ] Students only see their own data
- [ ] Teachers only see their class data
- [ ] Sensitive data (passwords) not exposed
- [ ] Audit logs secure and tamper-proof

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (Chrome Mobile, Safari iOS)

---

## COMMON ISSUES & SOLUTIONS

### Issue: Student photo not uploading
**Solution:** Check file size (<500KB), format (JPG/PNG), and server storage permissions

### Issue: Fee not auto-assigned after admission
**Solution:** Verify fee plan exists for student's batch. Check batch assignment.

### Issue: Attendance not saving
**Solution:** Verify date is not in future. Check student is in batch. Reload page and try again.

### Issue: Report card not generating
**Solution:** Verify exam marks are entered. Check student has exam results. Verify template is configured in settings.

### Issue: ID card QR code not scanning
**Solution:** Ensure QR code library installed. Check QR code URL is accessible. Test QR code with phone.

### Issue: Promotion not executing
**Solution:** Verify students in batch. Check promotion rules are correct. Verify no date conflicts.

---

## END-TO-END TESTING TIMELINE

For a complete test cycle with a new institute:

| Phase | Tasks | Estimated Time |
|-------|-------|-----------------|
| Phase 1 | Setup (9 steps) | 2-3 hours |
| Phase 2 | Admissions (7 steps) | 2-4 hours |
| Phase 3A | Attendance (2 steps) | 1-2 hours |
| Phase 3B | Fees (5 steps) | 2-3 hours |
| Phase 4 | Academics (8 steps) | 3-4 hours |
| Phase 5 | Year-end (7 steps) | 2-3 hours |
| **Total** | **All workflows** | **12-19 hours** |

**Recommended approach:**
- Day 1: Phase 1 + Phase 2 (Setup + Admissions)
- Day 2: Phase 3 (Attendance + Fees)
- Day 3: Phase 4 (Academics)
- Day 4: Phase 5 (Year-end)
- Day 5: Edge cases & bug fixes

---

## NEXT STEPS

Once you complete this testing:
1. Document any bugs found with steps to reproduce
2. Document any missing features or improvements needed
3. Test with real data (100+ students) to check performance
4. Get feedback from school admin user
5. Deploy to first pilot school

**Ready to start testing? Use this guide step-by-step and report any issues!**

