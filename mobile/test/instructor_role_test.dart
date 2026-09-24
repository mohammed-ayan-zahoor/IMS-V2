import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/core/localization/locale_provider.dart';
import 'package:student_app/features/instructor/attendance/data/models/batch_attendance_model.dart';
import 'package:student_app/features/instructor/dashboard/data/models/instructor_dashboard_model.dart';
import 'package:student_app/features/instructor/exams/data/models/offline_exam_model.dart';

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
  });
}
