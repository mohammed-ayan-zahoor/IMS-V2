import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/core/providers/academic_session_provider.dart';

class AcademicSessionRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<AcademicSessionModel>> fetchSessions() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.sessions);
      if (response.statusCode == 200 && response.data != null && response.data['sessions'] is List) {
        return (response.data['sessions'] as List)
            .map((e) => AcademicSessionModel.fromJson(e))
            .toList();
      }
    } catch (e) {
      print('AcademicSessionRepository fetchSessions error: $e');
    }
    return [];
  }
}
