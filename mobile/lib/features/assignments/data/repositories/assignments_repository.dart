import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/assignments/data/models/assignment_model.dart';

class AssignmentsRepository {
  final ApiClient _apiClient = ApiClient();
  String? _lastError;
  String? get lastError => _lastError;

  Future<List<AssignmentModel>> fetchAssignments() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.materials);
      if (response.statusCode == 200 && response.data != null && response.data['materials'] is List) {
        final List rawList = response.data['materials'];
        final List<AssignmentModel> list = [];
        for (final item in rawList) {
          if (item is Map) {
            try {
              final model = AssignmentModel.fromJson(Map<String, dynamic>.from(item));
              if (model.category.toLowerCase() == 'assignment' || model.allowSubmissions) {
                list.add(model);
              }
            } catch (err) {
              print('Assignment parse error for single item: $err');
            }
          }
        }
        return list;
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
    _lastError = null;
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
        if (response.data is Map && (response.data['success'] == true || response.data['submission'] != null)) {
          return true;
        } else {
          _lastError = response.data is Map ? (response.data['error'] ?? response.data['message'])?.toString() : 'Failed to submit assignment';
        }
      } else {
        _lastError = response.data is Map ? response.data['error']?.toString() : 'Server error ${response.statusCode}';
      }
    } catch (e) {
      _lastError = e.toString();
      print('AssignmentsRepository submitAssignment error: $e');
    }
    return false;
  }
}
