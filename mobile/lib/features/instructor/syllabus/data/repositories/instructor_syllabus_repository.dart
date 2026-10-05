import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/instructor/syllabus/data/models/syllabus_model.dart';
import 'package:student_app/features/instructor/syllabus/data/models/syllabus_progress_model.dart';

class InstructorSyllabusRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<SyllabusSubject>> fetchSubjects({String? courseId}) async {
    try {
      final Map<String, dynamic> query = {};
      if (courseId != null && courseId.isNotEmpty) {
        query['courseId'] = courseId;
      }
      final res = await _apiClient.get(ApiEndpoints.subjects, queryParameters: query.isNotEmpty ? query : null);
      if (res.statusCode == 200 && res.data != null) {
        final list = res.data['subjects'] ?? res.data;
        if (list is List) {
          return list
              .whereType<Map<String, dynamic>>()
              .map((s) => SyllabusSubject.fromJson(s))
              .toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<List<SyllabusChapter>> fetchSyllabus(String subjectId) async {
    try {
      final res = await _apiClient.get(ApiEndpoints.subjectSyllabus(subjectId));
      if (res.statusCode == 200 && res.data != null) {
        final list = res.data['syllabus'] ?? res.data;
        if (list is List) {
          return list
              .whereType<Map<String, dynamic>>()
              .map((c) => SyllabusChapter.fromJson(c))
              .toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<Map<String, dynamic>> updateSyllabus({
    required String subjectId,
    required List<SyllabusChapter> chapters,
  }) async {
    try {
      final body = {
        'chapters': chapters.map((c) => c.toJson()).toList(),
      };
      final res = await _apiClient.put(ApiEndpoints.subjectSyllabus(subjectId), data: body);
      if (res.statusCode == 200) {
        return {'success': true, 'message': 'Syllabus updated successfully'};
      }
      return {
        'success': false,
        'message': res.data?['error'] ?? 'Failed to update syllabus',
      };
    } catch (e) {
      return {'success': false, 'message': 'Network error updating syllabus: $e'};
    }
  }

  Future<BatchSyllabusProgress?> getOrCreateProgress({
    required String batchId,
    required String subjectId,
  }) async {
    try {
      final res = await _apiClient.post(
        ApiEndpoints.syllabusProgress,
        data: {'batchId': batchId, 'subjectId': subjectId},
      );
      if (res.statusCode == 200 && res.data != null) {
        final data = res.data['progress'] ?? res.data;
        if (data is Map<String, dynamic>) {
          return BatchSyllabusProgress.fromJson(data);
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<BatchSyllabusProgress?> markItem({
    required String progressId,
    required String itemId,
    required String itemType,
    required String chapterId,
    String? topicId,
    required bool isCompleted,
    String? notes,
  }) async {
    try {
      final body = {
        'itemId': itemId,
        'itemType': itemType,
        'chapterId': chapterId,
        if (topicId != null) 'topicId': topicId,
        'isCompleted': isCompleted,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      };
      final res = await _apiClient.post(
        ApiEndpoints.markSyllabusProgress(progressId),
        data: body,
      );
      if (res.statusCode == 200 && res.data != null) {
        final data = res.data['progress'] ?? res.data;
        if (data is Map<String, dynamic>) {
          return BatchSyllabusProgress.fromJson(data);
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
