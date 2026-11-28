import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/timeline/data/models/timeline_model.dart';

class TimelineRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<TimelineEventModel>> fetchTimeline({String? studentId}) async {
    try {
      final endpoint = studentId != null
          ? ApiEndpoints.studentTimeline(studentId)
          : ApiEndpoints.timeline;
      final response = await _apiClient.get(endpoint);
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
      debugPrint('TimelineRepository fetchTimeline error: $e');
    }
    return [];
  }

  Future<bool> postTimelineEvent({
    required String studentId,
    required String title,
    required String description,
    required String category,
    required DateTime date,
    String? photoUrl,
  }) async {
    try {
      final endpoint = ApiEndpoints.studentTimeline(studentId);
      final response = await _apiClient.post(
        endpoint,
        data: {
          'title': title,
          'description': description,
          'category': category,
          'date': date.toIso8601String(),
          if (photoUrl != null && photoUrl.isNotEmpty) 'photoUrl': photoUrl,
        },
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint('TimelineRepository postTimelineEvent error: $e');
      return false;
    }
  }

  Future<bool> approveTimelineEvent({
    required String studentId,
    required String eventId,
  }) async {
    try {
      final endpoint = ApiEndpoints.studentTimelineEvent(studentId, eventId);
      final response = await _apiClient.patch(
        endpoint,
        data: {'status': 'approved'},
      );
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('TimelineRepository approveTimelineEvent error: $e');
      return false;
    }
  }
}
