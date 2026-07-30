import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/notices/data/models/notice_model.dart';

class NoticesRepository {
  final ApiClient _apiClient = ApiClient();

  Future<NoticesResponse?> fetchNotices() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.notices);
      if (response.statusCode == 200 && response.data != null) {
        return NoticesResponse.fromJson(response.data);
      }
    } catch (e) {
      print('NoticesRepository error: $e');
    }
    return null;
  }
}
