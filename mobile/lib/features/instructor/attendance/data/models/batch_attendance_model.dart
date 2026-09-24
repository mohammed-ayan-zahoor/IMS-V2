class StudentRosterItem {
  final String id;
  final String name;
  final String enrollmentNumber;
  final String? avatar;

  StudentRosterItem({
    required this.id,
    required this.name,
    required this.enrollmentNumber,
    this.avatar,
  });

  factory StudentRosterItem.fromJson(Map<String, dynamic> json) {
    String name = 'Student';
    String? avatar;
    if (json['profile'] is Map) {
      final first = json['profile']['firstName']?.toString().trim() ?? '';
      final last = json['profile']['lastName']?.toString().trim() ?? '';
      final full = '$first $last'.trim();
      if (full.isNotEmpty) name = full;
      avatar = json['profile']['avatar']?.toString() ?? json['profile']['avatarUrl']?.toString();
    } else if (json['name'] != null) {
      name = json['name'].toString();
    }

    return StudentRosterItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: name,
      enrollmentNumber: (json['enrollmentNumber'] ?? json['rollNumber'] ?? '').toString(),
      avatar: avatar,
    );
  }
}

class BatchAttendanceRecord {
  final String studentId;
  String status; // 'present', 'absent', 'late', 'excused'
  String? remarks;

  BatchAttendanceRecord({
    required this.studentId,
    required this.status,
    this.remarks,
  });

  Map<String, dynamic> toJson() => {
    'studentId': studentId,
    'status': status,
    'remarks': remarks ?? '',
  };
}
