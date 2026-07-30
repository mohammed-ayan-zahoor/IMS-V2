import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/exams/data/models/exam_model.dart';

class ExamsRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<ExamModel>> fetchStudentExams() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.examsStudent);
      if (response.statusCode == 200 && response.data != null && response.data['exams'] is List) {
        return (response.data['exams'] as List)
            .map((e) => ExamModel.fromJson(e))
            .toList();
      }
    } catch (e) {
      print('ExamsRepository fetchStudentExams error: $e');
    }
    return [];
  }

  Future<Map<String, dynamic>?> startExam(String examId) async {
    try {
      final url = '${ApiEndpoints.exams}/$examId/start';
      final response = await _apiClient.post(
        url,
        data: {'sessionId': 'mobile-session'},
      );

      if (response.statusCode == 200 && response.data != null) {
        final submission = response.data['submission'] as Map?;
        final examData = response.data['exam'] as Map?;

        final String submissionId = submission?['id']?.toString() ?? '';
        final List rawQuestions = (examData?['questions'] as List?) ?? [];
        final questions = rawQuestions.map((q) => ExamQuestionModel.fromJson(q)).toList();

        return {
          'submissionId': submissionId,
          'examTitle': examData?['title']?.toString() ?? 'Exam',
          'duration': (examData?['duration'] is num) ? (examData!['duration'] as num).toInt() : 60,
          'totalMarks': (examData?['totalMarks'] is num) ? (examData!['totalMarks'] as num).toInt() : 0,
          'questions': questions,
          'isResume': response.data['isResume'] ?? false,
        };
      }
    } catch (e) {
      print('ExamsRepository startExam error: $e');
    }
    return null;
  }

  Future<Map<String, dynamic>?> submitExam({
    required String submissionId,
    required List<Map<String, dynamic>> answers,
  }) async {
    try {
      final url = '${ApiEndpoints.exams}/submissions/$submissionId/submit';
      final response = await _apiClient.post(
        url,
        data: {'answers': answers},
      );

      if (response.statusCode == 200 && response.data != null) {
        return response.data;
      }
    } catch (e) {
      print('ExamsRepository submitExam error: $e');
    }
    return null;
  }

  Future<ExamSubmissionResultModel?> fetchResult(String id) async {
    try {
      final url = '${ApiEndpoints.exams}/submissions/$id/result';
      final response = await _apiClient.get(url);

      if (response.statusCode == 200 && response.data != null) {
        return ExamSubmissionResultModel.fromJson(response.data);
      }
    } catch (e) {
      print('ExamsRepository fetchResult error: $e');
    }
    return null;
  }
}
