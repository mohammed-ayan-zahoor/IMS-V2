import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/instructor/calendar/data/models/instructor_event_model.dart';

class InstructorCalendarRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<InstructorEventItem>> fetchEvents() async {
    try {
      final res = await _apiClient.get(ApiEndpoints.instructorEvents);
      if (res.statusCode == 200 && res.data != null) {
        List<dynamic> list = [];
        if (res.data is List) {
          list = res.data;
        } else if (res.data['events'] is List) {
          list = res.data['events'];
        }
        return list
            .whereType<Map<String, dynamic>>()
            .map((e) => InstructorEventItem.fromJson(e))
            .toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }
}
