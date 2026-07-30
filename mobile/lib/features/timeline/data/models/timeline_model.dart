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
    return TimelineEventModel(
      id: json['_id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      date: json['date'] != null ? DateTime.parse(json['date']).toLocal() : DateTime.now(),
      category: json['category'] ?? 'general',
      photoUrl: json['photoUrl']?.toString(),
    );
  }
}
