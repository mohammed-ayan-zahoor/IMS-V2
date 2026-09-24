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

  Future<bool> publishNotice({
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
          'category': category.toUpperCase(),
          'target': 'all',
          'targetRole': 'ALL',
        },
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      return false;
    }
  }
}
