class InstructorBatchDetail {
  final String id;
  final String name;
  final String courseName;
  final int studentCount;
  final String? academicSession;
  final String? startTime;
  final String? endTime;
  final String? room;

  InstructorBatchDetail({
    required this.id,
    required this.name,
    required this.courseName,
    required this.studentCount,
    this.academicSession,
    this.startTime,
    this.endTime,
    this.room,
  });

  factory InstructorBatchDetail.fromJson(Map<String, dynamic> json) {
    String course = 'General Course';
    if (json['course'] is Map) {
      course = json['course']['name']?.toString() ?? 'General Course';
    } else if (json['courseName'] != null) {
      course = json['courseName'].toString();
    }

    int count = 0;
    if (json['enrolledStudents'] is List) {
      count = (json['enrolledStudents'] as List).length;
    } else if (json['studentCount'] != null) {
      count = int.tryParse(json['studentCount'].toString()) ?? 0;
    }

    String? session;
    if (json['academicSession'] is Map) {
      session = json['academicSession']['name']?.toString();
    } else if (json['academicSession'] != null) {
      session = json['academicSession'].toString();
    }

    return InstructorBatchDetail(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? 'Section').toString(),
      courseName: course,
      studentCount: count,
      academicSession: session,
      startTime: json['schedule']?['startTime']?.toString(),
      endTime: json['schedule']?['endTime']?.toString(),
      room: json['room']?.toString(),
    );
  }
}
