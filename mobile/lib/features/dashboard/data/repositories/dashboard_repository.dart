import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/dashboard/data/models/dashboard_data_model.dart';

class DashboardRepository {
  final ApiClient _apiClient = ApiClient();

  Future<DashboardDataModel?> fetchDashboardData({String? sessionId}) async {
    try {
      final url = sessionId != null 
          ? '${ApiEndpoints.dashboard}?sessionId=$sessionId' 
          : ApiEndpoints.dashboard;
      final response = await _apiClient.get(url);
      if (response.statusCode == 200 && response.data != null) {
        return DashboardDataModel.fromJson(response.data);
      }
    } catch (e) {
      print('DashboardRepository error: $e');
    }
    return null;
  }
}
