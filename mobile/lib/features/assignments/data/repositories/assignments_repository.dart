import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/assignments/data/models/assignment_model.dart';

class AssignmentsRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<AssignmentModel>> fetchAssignments() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.materials);
      if (response.statusCode == 200 && response.data != null && response.data['materials'] is List) {
        final List rawList = response.data['materials'];
        return rawList
            .map((item) => AssignmentModel.fromJson(item))
            .where((a) => a.category.toLowerCase() == 'assignment' || a.allowSubmissions)
            .toList();
      }
    } catch (e) {
      print('AssignmentsRepository fetchAssignments error: $e');
    }
    return [];
  }

  Future<AssignmentSubmissionModel?> fetchSubmission(String assignmentId) async {
    try {
      final url = '/assignments/$assignmentId/submit';
      final response = await _apiClient.get(url);
      if (response.statusCode == 200 && response.data != null && response.data['submission'] != null) {
        return AssignmentSubmissionModel.fromJson(response.data['submission']);
      }
    } catch (e) {
      print('AssignmentsRepository fetchSubmission error: $e');
    }
    return null;
  }

  Future<bool> submitAssignment({
    required String assignmentId,
    required String fileUrl,
    required String fileName,
    int fileSize = 1500000,
  }) async {
    try {
      final url = '/assignments/$assignmentId/submit';
      final response = await _apiClient.post(
        url,
        data: {
          'file': {
            'url': fileUrl,
            'originalName': fileName,
            'publicId': 'sub_${DateTime.now().millisecondsSinceEpoch}',
            'size': fileSize,
          }
        },
      );
      if ((response.statusCode == 200 || response.statusCode == 201) && response.data != null) {
        return response.data['success'] == true || response.data['submission'] != null;
      }
    } catch (e) {
      print('AssignmentsRepository submitAssignment error: $e');
    }
    return false;
  }
}
