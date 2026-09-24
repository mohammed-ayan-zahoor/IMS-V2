import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/instructor/exams/data/models/instructor_exam_model.dart';
import 'package:student_app/features/instructor/exams/data/models/offline_exam_model.dart';

class InstructorExamsRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<InstructorExamItem>> fetchExams() async {
    try {
      final res = await _apiClient.get(ApiEndpoints.instructorExams);
      if (res.statusCode == 200 && res.data != null) {
        final list = res.data['exams'] ?? res.data;
        if (list is List) {
          return list
              .whereType<Map<String, dynamic>>()
              .map((e) => InstructorExamItem.fromJson(e))
              .toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<List<QuestionBankItem>> fetchQuestions({String? search}) async {
    try {
      final Map<String, dynamic> query = {'limit': 50};
      if (search != null && search.isNotEmpty) {
        query['search'] = search;
      }
      final res = await _apiClient.get(ApiEndpoints.questions, queryParameters: query);
      if (res.statusCode == 200 && res.data != null) {
        final list = res.data['questions'] ?? res.data;
        if (list is List) {
          return list
              .whereType<Map<String, dynamic>>()
              .map((q) => QuestionBankItem.fromJson(q))
              .toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<Map<String, dynamic>?> fetchGradingData(String examId) async {
    try {
      final res = await _apiClient.get(ApiEndpoints.examGrading(examId));
      if (res.statusCode == 200 && res.data != null) {
        return res.data is Map<String, dynamic> ? res.data : null;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<bool> gradeAnswer({
    required String examId,
    required String submissionId,
    required String questionId,
    required int marksAwarded,
    String? feedback,
  }) async {
    try {
      final res = await _apiClient.patch(
        ApiEndpoints.examGrading(examId),
        data: {
          'submissionId': submissionId,
          'questionId': questionId,
          'marksAwarded': marksAwarded,
          'feedback': feedback ?? '',
        },
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<List<OfflineExamItem>> fetchOfflineExams() async {
    try {
      final res = await _apiClient.get(ApiEndpoints.offlineExams);
      if (res.statusCode == 200 && res.data != null) {
        final list = res.data['exams'] ?? res.data;
        if (list is List) {
          return list
              .whereType<Map<String, dynamic>>()
              .map((e) => OfflineExamItem.fromJson(e))
              .toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<List<OfflineStudentResultEntry>> fetchOfflineExamResults({
    required String examId,
    required String batchId,
    required List<OfflineExamSubject> subjects,
  }) async {
    try {
      final res = await _apiClient.get(
        ApiEndpoints.offlineExamResults(examId),
        queryParameters: {'batch': batchId},
      );
      if (res.statusCode == 200 && res.data != null) {
        final list = res.data['results'];
        if (list is List) {
          return list
              .whereType<Map<String, dynamic>>()
              .map((r) => OfflineStudentResultEntry.fromApiResponse(r, subjects))
              .toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<bool> saveOfflineExamResults({
    required String examId,
    required String batchId,
    required List<OfflineStudentResultEntry> results,
  }) async {
    try {
      final res = await _apiClient.post(
        ApiEndpoints.offlineExamResults(examId),
        data: {
          'batchId': batchId,
          'studentResults': results.map((r) => r.toPostJson()).toList(),
        },
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
