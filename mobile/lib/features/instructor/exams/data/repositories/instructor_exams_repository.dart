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

  Future<List<QuestionBankItem>> fetchQuestions({
    String? search,
    String? courseId,
    String? batchId,
    String? difficulty,
    String? type,
  }) async {
    try {
      final Map<String, dynamic> query = {'limit': 50};
      if (search != null && search.isNotEmpty) {
        query['search'] = search;
      }
      if (courseId != null && courseId.isNotEmpty) {
        query['course'] = courseId;
      }
      if (batchId != null && batchId.isNotEmpty) {
        query['batch'] = batchId;
      }
      if (difficulty != null && difficulty.isNotEmpty && difficulty != 'ALL') {
        query['difficulty'] = difficulty.toLowerCase();
      }
      if (type != null && type.isNotEmpty && type != 'ALL') {
        query['type'] = type.toLowerCase();
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

  Future<bool> createQuestion(Map<String, dynamic> data) async {
    try {
      final res = await _apiClient.post(ApiEndpoints.questions, data: data);
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  Future<Map<String, dynamic>> bulkImportQuestions({
    required List<Map<String, dynamic>> questions,
    required String courseId,
    String? batchId,
    String? subjectId,
  }) async {
    try {
      final body = {
        'questions': questions,
        'courseId': courseId,
        if (batchId != null && batchId.isNotEmpty) 'batchId': batchId,
        if (subjectId != null && subjectId.isNotEmpty) 'subjectId': subjectId,
      };
      final res = await _apiClient.post(ApiEndpoints.questionsImport, data: body);
      if (res.statusCode == 200 || res.statusCode == 201) {
        return {
          'success': true,
          'imported': res.data['imported'] ?? questions.length,
          'message': res.data['message'] ?? 'Questions imported successfully',
        };
      }
      return {
        'success': false,
        'message': res.data?['error'] ?? 'Failed to import questions',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error importing questions',
      };
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

  Future<List<OnlineExamSubmissionItem>> fetchExamSubmissions(String examId) async {
    try {
      final res = await _apiClient.get(ApiEndpoints.examSubmissions(examId));
      if (res.statusCode == 200 && res.data != null) {
        final list = res.data['submissions'] ?? res.data;
        if (list is List) {
          return list
              .whereType<Map<String, dynamic>>()
              .map((s) => OnlineExamSubmissionItem.fromJson(s))
              .toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<List<OfflineExamItem>> fetchOfflineExams({String? sessionId, String? status}) async {
    try {
      final Map<String, dynamic> query = {};
      if (sessionId != null && sessionId.isNotEmpty) {
        query['session'] = sessionId;
      }
      if (status != null && status.isNotEmpty) {
        query['status'] = status;
      }
      final res = await _apiClient.get(
        ApiEndpoints.offlineExams,
        queryParameters: query.isNotEmpty ? query : null,
      );
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

  Future<Map<String, dynamic>> createOnlineExam(Map<String, dynamic> data) async {
    try {
      final res = await _apiClient.post(ApiEndpoints.instructorExams, data: data);
      if (res.statusCode == 200 || res.statusCode == 201) {
        return {
          'success': true,
          'exam': res.data['exam'] ?? res.data,
          'message': 'Exam created successfully',
        };
      }
      return {
        'success': false,
        'message': res.data?['error'] ?? 'Failed to create exam',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error creating exam',
      };
    }
  }

  Future<Map<String, dynamic>> createOfflineExam(Map<String, dynamic> data) async {
    try {
      final res = await _apiClient.post(ApiEndpoints.offlineExams, data: data);
      if (res.statusCode == 200 || res.statusCode == 201) {
        return {
          'success': true,
          'exam': res.data,
          'message': 'Offline exam scheduled successfully',
        };
      }
      return {
        'success': false,
        'message': res.data?['error'] ?? 'Failed to schedule offline exam',
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error scheduling offline exam',
      };
    }
  }
}
