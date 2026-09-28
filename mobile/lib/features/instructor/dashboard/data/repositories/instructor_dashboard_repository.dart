import 'package:dio/dio.dart';
import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/instructor/dashboard/data/models/instructor_dashboard_model.dart';

class InstructorDashboardRepository {
  final ApiClient _apiClient = ApiClient();

  Future<InstructorDashboardModel?> fetchDashboardData() async {
    try {
      final batchesFuture = _apiClient.get(ApiEndpoints.instructorBatches);
      final statsFuture = _apiClient.get(ApiEndpoints.dashboardStats);

      final results = await Future.wait([batchesFuture, statsFuture]);

      final batchesRes = results[0];
      final statsRes = results[1];

      List<dynamic> batchesList = [];
      if (batchesRes.statusCode == 200 && batchesRes.data != null) {
        if (batchesRes.data is List) {
          batchesList = batchesRes.data;
        } else if (batchesRes.data['batches'] is List) {
          batchesList = batchesRes.data['batches'];
        }
      }

      Map<String, dynamic> statsData = {};
      if (statsRes.statusCode == 200 && statsRes.data != null) {
        if (statsRes.data is Map<String, dynamic>) {
          statsData = statsRes.data;
        }
      }

      return InstructorDashboardModel.fromData(
        statsJson: statsData,
        batchesJson: batchesList,
      );
    } catch (e) {
      return null;
    }
  }

  Future<String?> publishNotice({
    required String title,
    required String content,
    required String category,
  }) async {
    try {
      final response = await _apiClient.post(
        ApiEndpoints.instructorNotices,
        data: {
          'title': title,
          'content': content,
          'type': category.toLowerCase() == 'urgent' ? 'urgent' : (category.toLowerCase() == 'exam' ? 'event' : 'info'),
          'category': category.toUpperCase(),
          'target': 'all',
          'targetRole': 'ALL',
        },
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        return null; // success
      }
      return response.data?['error']?.toString() ?? 'Failed with status ${response.statusCode}';
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        return 'Unauthorized: Your teacher account does not have "manage_notices" permission.';
      }
      return e.response?.data?['error']?.toString() ?? e.message ?? 'Failed to publish notice';
    } catch (e) {
      return e.toString();
    }
  }
}
