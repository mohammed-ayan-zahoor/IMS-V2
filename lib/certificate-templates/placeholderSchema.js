/**
 * Central schema for document placeholders.
 * Defines the data mapping for both hydration and the Admin UI.
 */

export const DOCUMENT_PLACEHOLDERS = {
    // Student Core Info
    studentName: { label: 'Student Full Name', path: 'student.fullName', category: 'student' },
    fatherName: { label: 'Father Name', path: 'student.fatherName', category: 'student' },
    motherName: { label: 'Mother Name', path: 'student.motherName', category: 'student' },
    grNumber: { label: 'GR Number', path: 'student.grNumber', category: 'student' },
    dateOfBirth: { label: 'Date of Birth (Digits)', path: 'student.dob', category: 'student' },
    dateOfBirthWords: { label: 'Date of Birth (Words)', path: 'student.dobWords', category: 'student' },
    admissionDate: { label: 'Admission Date', path: 'student.admissionDate', category: 'student' },
    gender: { label: 'Gender', path: 'student.gender', category: 'student' },
    nationality: { label: 'Nationality', path: 'student.nationality', category: 'student' },
    religion: { label: 'Religion', path: 'student.religion', category: 'student' },
    caste: { label: 'Caste', path: 'student.caste', category: 'student' },
    placeOfBirth: { label: 'Place of Birth', path: 'student.placeOfBirth', category: 'student' },
    lastSchoolAttended: { label: 'Last School Attended', path: 'student.lastSchool', category: 'student' },
    enrollmentNo: { label: 'Enrollment Number', path: 'student.enrollmentNo', category: 'student' },

    // Academic Info
    courseName: { label: 'Course/Standard', path: 'course.name', category: 'academic' },
    batchName: { label: 'Batch Name', path: 'batch.name', category: 'academic' },
    academicYear: { label: 'Academic Year', path: 'academicYear', category: 'academic' },
    leavingReason: { label: 'Reason for Leaving', path: 'metadata.leavingReason', category: 'academic' },
    leavingDate: { label: 'Date of Leaving', path: 'metadata.leavingDate', category: 'academic' },
    conduct: { label: 'Conduct/Behavior', path: 'metadata.conduct', category: 'academic' },
    progress: { label: 'Progress', path: 'metadata.progress', category: 'academic' },

    // Institute Info
    instituteName: { label: 'Institute Name', path: 'institute.name', category: 'institute' },
    instituteAddress: { label: 'Institute Address', path: 'institute.address', category: 'institute' },
    instituteLogo: { label: 'Institute Logo URL', path: 'institute.logo', category: 'institute' },
    udiseNumber: { label: 'UDISE Number', path: 'institute.udiseNumber', category: 'institute' },

    // Document Specific
    serialNumber: { label: 'Certificate Serial Number', path: 'certificate.number', category: 'document' },
    issueDate: { label: 'Date of Issue', path: 'certificate.issueDate', category: 'document' },
};

export const CATEGORY_REQUIREMENTS = {
    LEAVING_CERTIFICATE: [
        'studentName', 'fatherName', 'motherName', 'grNumber', 'dateOfBirth', 'dateOfBirthWords',
        'leavingReason', 'serialNumber', 'issueDate'
    ],
    BONAFIDE: [
        'studentName', 'fatherName', 'courseName', 'academicYear', 'serialNumber', 'issueDate'
    ],
    TRANSFER_CERTIFICATE: [
        'studentName', 'grNumber', 'leavingReason', 'serialNumber', 'issueDate'
    ]
};
