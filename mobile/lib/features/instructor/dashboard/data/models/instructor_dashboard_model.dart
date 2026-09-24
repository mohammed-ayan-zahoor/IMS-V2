class InstructorBatchSummary {
  final String id;
  final String name;
  final String courseName;
  final int studentCount;
  final String? timing;

  InstructorBatchSummary({
    required this.id,
    required this.name,
    required this.courseName,
    required this.studentCount,
    this.timing,
  });

  factory InstructorBatchSummary.fromJson(Map<String, dynamic> json) {
    String courseName = 'General';
    if (json['course'] is Map) {
      courseName = json['course']['name']?.toString() ?? 'General';
    } else if (json['courseName'] != null) {
      courseName = json['courseName'].toString();
    }

    int students = 0;
    if (json['enrolledStudents'] is List) {
      students = (json['enrolledStudents'] as List).length;
    } else if (json['studentCount'] != null) {
      students = int.tryParse(json['studentCount'].toString()) ?? 0;
    } else if (json['totalStudents'] != null) {
      students = int.tryParse(json['totalStudents'].toString()) ?? 0;
    }

    return InstructorBatchSummary(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? 'Unnamed Batch').toString(),
      courseName: courseName,
      studentCount: students,
      timing: json['schedule']?['startTime']?.toString() ?? json['timing']?.toString(),
    );
  }
}

class InstructorDashboardModel {
  final int totalBatches;
  final int totalStudents;
  final int noticesCount;
  final List<InstructorBatchSummary> batches;

  InstructorDashboardModel({
    required this.totalBatches,
    required this.totalStudents,
    required this.noticesCount,
    required this.batches,
  });

  factory InstructorDashboardModel.fromData({
    required Map<String, dynamic> statsJson,
    required List<dynamic> batchesJson,
  }) {
    final batchList = batchesJson
        .whereType<Map<String, dynamic>>()
        .map((b) => InstructorBatchSummary.fromJson(b))
        .toList();

    int totalStudents = batchList.fold(0, (acc, b) => acc + b.studentCount);
    if (statsJson['totalStudents'] != null) {
      totalStudents = int.tryParse(statsJson['totalStudents'].toString()) ?? totalStudents;
    }

    final totalBatches = batchList.isNotEmpty ? batchList.length : (int.tryParse(statsJson['totalBatches']?.toString() ?? '0') ?? 0);
    final noticesCount = int.tryParse(statsJson['noticesCount']?.toString() ?? '0') ?? 0;

    return InstructorDashboardModel(
      totalBatches: totalBatches,
      totalStudents: totalStudents,
      noticesCount: noticesCount,
      batches: batchList,
    );
  }
}
