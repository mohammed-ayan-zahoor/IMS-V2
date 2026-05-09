/**
 * Central schema for document placeholders.
 * Defines the data mapping for both hydration and the Admin UI.
 */

export const DOCUMENT_PLACEHOLDERS = {
    // Top Header Info
    schoolRegNo: { label: 'School Reg. Number', path: 'institute.registrationNumber', category: 'institute' },
    board: { label: 'Board', path: 'institute.board', category: 'institute' },
    indexNumber: { label: 'Index Number', path: 'institute.indexNumber', category: 'institute' },
    institutePhone: { label: 'Institute Mobile', path: 'institute.phone', category: 'institute' },
    instituteEmail: { label: 'Institute Email', path: 'institute.email', category: 'institute' },
    medium: { label: 'Medium of Instruction', path: 'student.medium', category: 'student' },

    // Student Core Info
    studentName: { label: 'Student Full Name', path: 'student.fullName', category: 'student' },
    firstName: { label: 'First Name', path: 'student.firstName', category: 'student' },
    lastName: { label: 'Last Name', path: 'student.lastName', category: 'student' },
    surname: { label: 'Surname', path: 'student.surname', category: 'student' },
    grNumber: { label: 'GR Number', path: 'student.grNumber', category: 'student' },
    enrollmentNo: { label: 'Enrollment Number', path: 'student.enrollmentNo', category: 'student' },
    rollNo: { label: 'Roll Number', path: 'student.rollNo', category: 'student' },
    dateOfBirth: { label: 'Date of Birth (Digits)', path: 'student.dob', category: 'student' },
    dobDay: { label: 'DOB Day (DD)', path: 'student.dobDay', category: 'student' },
    dobMonth: { label: 'DOB Month (MM)', path: 'student.dobMonth', category: 'student' },
    dobYear: { label: 'DOB Year (YYYY)', path: 'student.dobYear', category: 'student' },
    dateOfBirthWords: { label: 'Date of Birth (Words)', path: 'student.dobWords', category: 'student' },
    gender: { label: 'Gender', path: 'student.gender', category: 'student' },
    bloodGroup: { label: 'Blood Group', path: 'student.bloodGroup', category: 'student' },
    nationality: { label: 'Nationality', path: 'student.nationality', category: 'student' },
    motherTongue: { label: 'Mother Tongue', path: 'student.motherTongue', category: 'student' },
    religion: { label: 'Religion', path: 'student.religion', category: 'student' },
    caste: { label: 'Caste', path: 'student.caste', category: 'student' },
    subCaste: { label: 'Sub Caste', path: 'student.subCaste', category: 'student' },

    // Identifiers
    studentId: { label: 'Student ID (UDISE)', path: 'student.studentId', category: 'student' },
    uidNo: { label: 'Aadhaar Number', path: 'student.uidNo', category: 'student' },
    apaarId: { label: 'APAAR ID', path: 'student.apaarId', category: 'student' },
    penNo: { label: 'PEN Number', path: 'student.penNo', category: 'student' },

    // Parents & Guardian
    fatherName: { label: 'Father Name', path: 'student.fatherName', category: 'student' },
    fatherPhone: { label: 'Father Phone', path: 'student.fatherPhone', category: 'student' },
    fatherAadhar: { label: 'Father Aadhaar', path: 'student.fatherAadhar', category: 'student' },
    motherName: { label: 'Mother Name', path: 'student.motherName', category: 'student' },
    motherPhone: { label: 'Mother Phone', path: 'student.motherPhone', category: 'student' },
    motherAadhar: { label: 'Mother Aadhaar', path: 'student.motherAadhar', category: 'student' },
    guardianName: { label: 'Guardian Name', path: 'student.guardianName', category: 'student' },
    guardianPhone: { label: 'Guardian Phone', path: 'student.guardianPhone', category: 'student' },
    guardianRelation: { label: 'Guardian Relation', path: 'student.guardianRelation', category: 'student' },

    // Birth Place
    birthCity: { label: 'Birth City', path: 'student.birthCity', category: 'student' },
    birthTaluka: { label: 'Birth Taluka', path: 'student.birthTaluka', category: 'student' },
    birthDistrict: { label: 'Birth District', path: 'student.birthDistrict', category: 'student' },
    birthState: { label: 'Birth State', path: 'student.birthState', category: 'student' },
    birthCountry: { label: 'Birth Country', path: 'student.birthCountry', category: 'student' },

    // Address
    city: { label: 'Current City', path: 'student.city', category: 'student' },
    state: { label: 'Current State', path: 'student.state', category: 'student' },
    pincode: { label: 'Pincode', path: 'student.pincode', category: 'student' },

    // Academic Info
    courseName: { label: 'Course/Standard', path: 'course.name', category: 'academic' },
    batchName: { label: 'Batch/Section', path: 'batch.name', category: 'academic' },
    academicYear: { label: 'Academic Year', path: 'academicYear', category: 'academic' },
    admissionDate: { label: 'Admission Date', path: 'student.admissionDate', category: 'academic' },
    joiningDate: { label: 'Date of Joining', path: 'student.joiningDate', category: 'academic' },
    admissionStd: { label: 'Admission Standard', path: 'student.admissionStd', category: 'academic' },
    studyingSince: { label: 'Studying Since', path: 'student.studyingSince', category: 'academic' },
    lastSchoolAttended: { label: 'Last School Attended', path: 'student.lastSchool', category: 'academic' },
    leavingReason: { label: 'Reason for Leaving', path: 'metadata.leavingReason', category: 'academic' },
    leavingDate: { label: 'Date of Leaving', path: 'metadata.leavingDate', category: 'academic' },
    conduct: { label: 'Conduct/Behavior', path: 'metadata.conduct', category: 'academic' },
    progress: { label: 'Progress', path: 'metadata.progress', category: 'academic' },
    remarks: { label: 'Remarks', path: 'metadata.remarks', category: 'academic' },

    // Institute Info
    instituteName: { label: 'Institute Name', path: 'institute.name', category: 'institute' },
    instituteAddress: { label: 'Institute Address', path: 'institute.address', category: 'institute' },
    instituteLogo: { label: 'Institute Logo URL', path: 'institute.logo', category: 'institute' },
    udiseNumber: { label: 'UDISE Number', path: 'institute.udiseNumber', category: 'institute' },

    // Document Specific
    serialNumber: { label: 'Certificate Serial Number', path: 'certificate.number', category: 'document' },
    issueDate: { label: 'Date of Issue', path: 'certificate.issueDate', category: 'document' },
    issueDay: { label: 'Issue Day (DD)', path: 'certificate.day', category: 'document' },
    issueMonth: { label: 'Issue Month (MM)', path: 'certificate.month', category: 'document' },
    issueYear: { label: 'Issue Year (YYYY)', path: 'certificate.year', category: 'document' },
};

export const CATEGORY_REQUIREMENTS = {
    LEAVING_CERTIFICATE: [
        'studentName', 'surname', 'fatherName', 'motherName', 'grNumber', 'dateOfBirth', 'dateOfBirthWords',
        'nationality', 'religion', 'caste', 'birthCity', 'lastSchoolAttended', 'admissionDate',
        'leavingReason', 'leavingDate', 'serialNumber', 'issueDate'
    ],
    BONAFIDE: [
        'studentName', 'fatherName', 'courseName', 'academicYear', 'serialNumber', 'issueDate'
    ],
    TRANSFER_CERTIFICATE: [
        'studentName', 'grNumber', 'leavingReason', 'serialNumber', 'issueDate'
    ]
};
