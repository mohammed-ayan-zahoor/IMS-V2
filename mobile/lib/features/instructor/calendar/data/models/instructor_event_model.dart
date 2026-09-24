class InstructorEventItem {
  final String id;
  final String title;
  final String? description;
  final String? category;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? location;

  InstructorEventItem({
    required this.id,
    required this.title,
    this.description,
    this.category,
    this.startDate,
    this.endDate,
    this.location,
  });

  factory InstructorEventItem.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic d) {
      if (d == null) return null;
      return DateTime.tryParse(d.toString());
    }

    return InstructorEventItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Event').toString(),
      description: json['description']?.toString(),
      category: (json['category'] ?? json['type'] ?? 'EVENT').toString().toUpperCase(),
      startDate: parseDate(json['startDate']),
      endDate: parseDate(json['endDate']),
      location: json['location']?.toString(),
    );
  }
}
