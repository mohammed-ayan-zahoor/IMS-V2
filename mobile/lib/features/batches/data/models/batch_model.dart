class BatchModel {
  final String id;
  final String name;
  final String courseName;
  final String courseCode;
  final String? startDate;
  final String? endDate;
  final String? timeSlotStart;
  final String? timeSlotEnd;
  final List<int> daysOfWeek;

  BatchModel({
    required this.id,
    required this.name,
    required this.courseName,
    required this.courseCode,
    this.startDate,
    this.endDate,
    this.timeSlotStart,
    this.timeSlotEnd,
    required this.daysOfWeek,
  });

  factory BatchModel.fromJson(Map<String, dynamic> json) {
    String cName = '';
    String cCode = '';
    if (json['course'] != null && json['course'] is Map) {
      cName = json['course']['name'] ?? '';
      cCode = json['course']['code'] ?? '';
    }

    final schedule = json['schedule'] as Map<String, dynamic>?;
    final timeSlot = schedule != null ? schedule['timeSlot'] as Map<String, dynamic>? : null;

    return BatchModel(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      courseName: cName,
      courseCode: cCode,
      startDate: schedule?['startDate']?.toString(),
      endDate: schedule?['endDate']?.toString(),
      timeSlotStart: timeSlot?['start']?.toString(),
      timeSlotEnd: timeSlot?['end']?.toString(),
      daysOfWeek: (schedule?['daysOfWeek'] as List<dynamic>?)?.map((e) => e as int).toList() ?? [],
    );
  }
}
