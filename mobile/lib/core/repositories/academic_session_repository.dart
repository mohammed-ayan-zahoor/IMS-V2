import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/core/providers/academic_session_provider.dart';

class AcademicSessionRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<AcademicSessionModel>> fetchSessions() async {
    try {
      var response = await _apiClient.get(ApiEndpoints.sessions);
      if (response.statusCode != 200 || response.data == null || response.data['sessions'] == null) {
        response = await _apiClient.get('/sessions');
      }
      if (response.statusCode == 200 && response.data != null && response.data['sessions'] is List) {
        return (response.data['sessions'] as List)
            .map((e) => AcademicSessionModel.fromJson(e))
            .toList();
      }
    } catch (e) {
      try {
        final fallback = await _apiClient.get('/sessions');
        if (fallback.statusCode == 200 && fallback.data != null && fallback.data['sessions'] is List) {
          return (fallback.data['sessions'] as List)
              .map((e) => AcademicSessionModel.fromJson(e))
              .toList();
        }
      } catch (_) {}
      print('AcademicSessionRepository fetchSessions error: $e');
    }
    return [];
  }
}
