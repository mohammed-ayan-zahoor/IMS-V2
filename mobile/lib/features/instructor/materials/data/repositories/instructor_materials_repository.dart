import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/instructor/materials/data/models/instructor_material_model.dart';

class InstructorMaterialsRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<InstructorMaterialItem>> fetchMaterials() async {
    try {
      final res = await _apiClient.get(ApiEndpoints.instructorMaterials);
      if (res.statusCode == 200 && res.data != null) {
        List<dynamic> list = [];
        if (res.data is List) {
          list = res.data;
        } else if (res.data['materials'] is List) {
          list = res.data['materials'];
        }
        return list
            .whereType<Map<String, dynamic>>()
            .map((m) => InstructorMaterialItem.fromJson(m))
            .toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, String>>> fetchCourses() async {
    try {
      final res = await _apiClient.get(ApiEndpoints.instructorCourses);
      if (res.statusCode == 200 && res.data != null) {
        List<dynamic> list = [];
        if (res.data is List) {
          list = res.data;
        } else if (res.data['courses'] is List) {
          list = res.data['courses'];
        }
        return list
            .whereType<Map<String, dynamic>>()
            .map((c) => {
                  'id': (c['_id'] ?? c['id'] ?? '').toString(),
                  'name': (c['name'] ?? 'Course').toString(),
                })
            .toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<Map<String, dynamic>?> uploadFile({
    required String filePath,
    required String fileName,
    String fileType = 'document',
  }) async {
    return _apiClient.uploadFile(
      filePath: filePath,
      fileName: fileName,
      fileType: fileType,
    );
  }

  Future<bool> uploadMaterial({
    required String title,
    required String courseId,
    String? batchId,
    required String fileUrl,
    String? description,
    String type = 'document',
    String category = 'lecture',
    bool allowSubmissions = false,
    int? totalMarks,
    DateTime? dueDate,
    int? fileSize,
  }) async {
    try {
      final body = {
        'title': title,
        'description': description ?? '',
        'courses': [courseId],
        'course': courseId,
        'batches': batchId != null && batchId.isNotEmpty ? [batchId] : [],
        'category': category,
        'type': type,
        'visibleToStudents': true,
        'allowSubmissions': allowSubmissions,
        'totalMarks': ?totalMarks,
        if (dueDate != null) 'dueDate': dueDate.toIso8601String(),
        'file': {
          'url': fileUrl,
          'type': type,
          'originalName': title,
          'size': ?fileSize,
        },
      };

      final res = await _apiClient.post(ApiEndpoints.instructorMaterials, data: body);
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  Future<List<StudentSubmissionItem>> fetchSubmissions(String materialId) async {
    try {
      final res = await _apiClient.get(ApiEndpoints.assignmentSubmissions(materialId));
      if (res.statusCode == 200 && res.data != null) {
        final submissions = res.data['submissions'];
        if (submissions is List) {
          return submissions
              .whereType<Map<String, dynamic>>()
              .map((s) => StudentSubmissionItem.fromJson(s))
              .toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<bool> gradeSubmission({
    required String materialId,
    required String submissionId,
    required int marksAwarded,
    String? feedback,
  }) async {
    try {
      final res = await _apiClient.patch(
        ApiEndpoints.assignmentSubmissions(materialId),
        data: {
          'grades': [
            {
              'submissionId': submissionId,
              'marksAwarded': marksAwarded,
              'feedback': feedback ?? '',
            }
          ],
        },
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
