import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/core/localization/locale_provider.dart';
import 'package:student_app/features/instructor/attendance/data/models/batch_attendance_model.dart';
import 'package:student_app/features/instructor/dashboard/data/models/instructor_dashboard_model.dart';
import 'package:student_app/features/instructor/exams/data/models/instructor_exam_model.dart';
import 'package:student_app/features/instructor/exams/data/models/offline_exam_model.dart';
import 'package:student_app/features/instructor/leaves/data/models/instructor_permission_model.dart';
import 'package:student_app/features/instructor/materials/data/models/instructor_material_model.dart';

void main() {
  group('Instructor Role & Models Test', () {
    test('InstructorBatchSummary parses json with defaults', () {
      final json = {
        '_id': 'batch_123',
        'name': 'Grade 10 Science A',
        'course': {'name': 'Physics & Chemistry'},
        'enrolledStudents': [
          {'id': 's1'},
          {'id': 's2'},
          {'id': 's3'},
        ],
      };

      final batch = InstructorBatchSummary.fromJson(json);
      expect(batch.id, 'batch_123');
      expect(batch.name, 'Grade 10 Science A');
      expect(batch.courseName, 'Physics & Chemistry');
      expect(batch.studentCount, 3);
    });

    test('BatchAttendanceRecord serializes properly for POST payload', () {
      final record = BatchAttendanceRecord(
        studentId: 'student_abc',
        status: 'present',
        remarks: 'On time',
      );

      final json = record.toJson();
      expect(json['studentId'], 'student_abc');
      expect(json['status'], 'present');
      expect(json['remarks'], 'On time');
    });

    test('Supported languages include Indic locales', () {
      final codes = LocaleProvider.supportedLanguages.map((l) => l.code).toList();
      expect(codes, containsAll(['en', 'mr', 'hi', 'kn', 'te', 'ta']));
    });

    test('OfflineStudentResultEntry serializes properly for POST results payload', () {
      final entry = OfflineStudentResultEntry(
        studentId: 'student_99',
        studentName: 'Aarav Sharma',
        rollNumber: 'ROLL-101',
        subjectMarks: {
          'sub_physics': OfflineStudentSubjectMark(subjectId: 'sub_physics', obtainedMarks: 88, isAbsent: false),
          'sub_chem': OfflineStudentSubjectMark(subjectId: 'sub_chem', isAbsent: true),
        },
        teacherRemarks: 'Excellent physics, absent for chemistry',
      );

      final json = entry.toPostJson();
      expect(json['studentId'], 'student_99');
      expect(json['teacherRemarks'], 'Excellent physics, absent for chemistry');
      final marks = json['marks'] as List;
      expect(marks.length, 2);
      // find the physics entry
      final physics = marks.firstWhere((m) => m['subject'] == 'sub_physics');
      expect(physics['obtainedMarks'], 88);
      expect(physics['isAbsent'], false);
      final chem = marks.firstWhere((m) => m['subject'] == 'sub_chem');
      expect(chem['isAbsent'], true);
    });

    test('OfflineExamItem parses string batch IDs gracefully', () {
      final json = {
        '_id': 'offline_1',
        'title': 'Midterm 2026',
        'batches': ['batch_id_1', 'batch_id_2'],
        'subjects': [
          {
            '_id': 'subj_1',
            'name': 'Science',
            'maxMarks': 100,
            'passMarks': 35,
          }
        ],
      };

      final exam = OfflineExamItem.fromJson(json);
      expect(exam.id, 'offline_1');
      expect(exam.batches.length, 2);
      expect(exam.batches.first.id, 'batch_id_1');
      expect(exam.subjects.length, 1);
    });

    test('InstructorMaterialItem parses assignment and helpers correctly', () {
      final json = {
        '_id': 'mat_456',
        'title': 'Term Assignment 1',
        'category': 'assignment',
        'type': 'pdf',
        'allowSubmissions': true,
        'totalMarks': 50,
        'dueDate': '2026-10-15T18:00:00.000Z',
        'file': {
          'url': 'https://example.com/assignment1.pdf',
          'size': 2097152, // 2 MB
        },
      };

      final mat = InstructorMaterialItem.fromJson(json);
      expect(mat.id, 'mat_456');
      expect(mat.title, 'Term Assignment 1');
      expect(mat.isAssignment, true);
      expect(mat.isPdf, true);
      expect(mat.totalMarks, 50);
      expect(mat.dueDate, isNotNull);
      expect(mat.formattedSize, '2.0 MB');
    });

    test('QuestionBankItem parses course, batch, and answer fields properly', () {
      final json = {
        '_id': 'q_999',
        'text': 'What is the SI unit of electric current?',
        'type': 'mcq',
        'difficulty': 'easy',
        'marks': 2,
        'options': ['Ampere', 'Volt', 'Ohm', 'Watt'],
        'correctAnswer': 0,
        'explanation': 'The SI unit of electric current is Ampere (A).',
        'course': {'_id': 'c_1', 'name': 'Physics 101'},
        'batch': {'_id': 'b_1', 'name': 'Morning Batch'},
      };

      final q = QuestionBankItem.fromJson(json);
      expect(q.id, 'q_999');
      expect(q.text, "What is the SI unit of electric current?");
      expect(q.difficulty, 'easy');
      expect(q.marks, 2);
      expect(q.options.length, 4);
      expect(q.correctAnswer, 0);
      expect(q.courseName, 'Physics 101');
      expect(q.batchName, 'Morning Batch');
    });

    test('InstructorPermissionItem parses out-pass and categories properly', () {
      final json = {
        '_id': 'gp_101',
        'passNumber': 'GP-2026-8888',
        'recipientType': 'staff',
        'recipientName': 'Dr. Sharma',
        'departureTime': '11:30 AM',
        'expectedReturnTime': '01:30 PM',
        'durationHours': '2 hours',
        'category': 'personal_errand',
        'reason': 'Bank urgent work',
        'status': 'APPROVED',
        'adminComment': 'Approved by Principal',
      };

      final p = InstructorPermissionItem.fromJson(json);
      expect(p.id, 'gp_101');
      expect(p.passNumber, 'GP-2026-8888');
      expect(p.categoryLabel, 'Personal Errand');
      expect(p.status, 'APPROVED');
      expect(p.durationHours, '2 hours');
      expect(p.adminComment, 'Approved by Principal');
    });
  });
}
