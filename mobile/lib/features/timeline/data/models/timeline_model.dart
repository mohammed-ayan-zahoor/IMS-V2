import 'package:student_app/core/constants/api_endpoints.dart';

class TimelineEventModel {
  final String id;
  final String title;
  final String description;
  final DateTime date;
  final String category;
  final String? photoUrl;

  TimelineEventModel({
    required this.id,
    required this.title,
    required this.description,
    required this.date,
    required this.category,
    this.photoUrl,
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

    return TimelineEventModel(
      id: json['_id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      date: parsedDate,
      category: json['category']?.toString() ?? 'general',
      photoUrl: ApiEndpoints.resolveUrl(json['photoUrl']?.toString()),
    );
  }
}
