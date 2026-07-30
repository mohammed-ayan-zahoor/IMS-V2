import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/timeline/data/models/timeline_model.dart';

class TimelineRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<TimelineEventModel>> fetchTimeline() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.timeline);
      if (response.statusCode == 200 && response.data != null && response.data['events'] is List) {
        return (response.data['events'] as List)
            .map((e) => TimelineEventModel.fromJson(e))
            .toList();
      }
    } catch (e) {
      print('TimelineRepository fetchTimeline error: $e');
    }
    return [];
  }
}
