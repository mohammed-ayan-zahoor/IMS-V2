import 'dart:convert';
import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/timeline/data/models/timeline_model.dart';

class TimelineRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<TimelineEventModel>> fetchTimeline() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.timeline);
      dynamic data = response.data;
      if (data is String && data.trim().isNotEmpty) {
        try {
          data = jsonDecode(data);
        } catch (_) {}
      }

      if (response.statusCode == 200 && data != null && data is Map && data['events'] is List) {
        return (data['events'] as List)
            .whereType<Map>()
            .map((e) => TimelineEventModel.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      }
    } catch (e) {
      print('TimelineRepository fetchTimeline error: $e');
    }
    return [];
  }
}
