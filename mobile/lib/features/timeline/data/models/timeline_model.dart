import 'package:student_app/core/constants/api_endpoints.dart';

class TimelineEventModel {
  final String id;
  final String title;
  final String description;
  final DateTime date;
  final String category;
  final String? photoUrl;
  final String status;
  final String? createdByName;

  TimelineEventModel({
    required this.id,
    required this.title,
    required this.description,
    required this.date,
    required this.category,
    this.photoUrl,
    this.status = 'approved',
    this.createdByName,
  });

  factory TimelineEventModel.fromJson(Map<String, dynamic> json) {
    DateTime parsedDate;
    try {
      parsedDate = json['date'] != null
          ? DateTime.parse(json['date'].toString()).toLocal()
          : DateTime.now();
    } catch (_) {
      parsedDate = DateTime.now();
    }

    String? creator;
    if (json['createdBy'] is Map) {
      final cb = json['createdBy'] as Map;
      creator = (cb['fullName'] ?? cb['name'])?.toString().trim();
      if ((creator == null || creator.isEmpty) && cb['profile'] is Map) {
        final f = cb['profile']['firstName']?.toString().trim() ?? '';
        final l = cb['profile']['lastName']?.toString().trim() ?? '';
        final full = '$f $l'.trim();
        if (full.isNotEmpty) creator = full;
      }
    }

    return TimelineEventModel(
      id: json['_id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      date: parsedDate,
      category: json['category']?.toString() ?? 'general',
      photoUrl: ApiEndpoints.resolveUrl(json['photoUrl']?.toString()),
      status: json['status']?.toString() ?? 'approved',
      createdByName: creator,
    );
  }
}
