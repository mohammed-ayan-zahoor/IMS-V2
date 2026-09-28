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

    // Direct name or fullName
    final direct = (json['name'] ?? json['fullName'])?.toString().trim();
    if (direct != null && direct.isNotEmpty && direct.toLowerCase() != 'student') {
      name = direct;
    } else if (json['profile'] is Map) {
      final first = json['profile']['firstName']?.toString().trim() ?? '';
      final last = json['profile']['lastName']?.toString().trim() ?? '';
      final full = '$first $last'.trim();
      if (full.isNotEmpty) name = full;
      avatar = json['profile']['avatar']?.toString() ?? json['profile']['avatarUrl']?.toString();
    } else if (json['user'] is Map) {
      final u = json['user'];
      final uName = (u['name'] ?? u['fullName'])?.toString().trim();
      if (uName != null && uName.isNotEmpty) {
        name = uName;
      } else if (u['profile'] is Map) {
        final first = u['profile']['firstName']?.toString().trim() ?? '';
        final last = u['profile']['lastName']?.toString().trim() ?? '';
        final full = '$first $last'.trim();
        if (full.isNotEmpty) name = full;
        avatar ??= u['profile']['avatar']?.toString();
      }
    } else if (json['student'] is Map) {
      final st = json['student'];
      final stName = (st['name'] ?? st['fullName'])?.toString().trim();
      if (stName != null && stName.isNotEmpty && stName.toLowerCase() != 'student') {
        name = stName;
      } else if (st['profile'] is Map) {
        final first = st['profile']['firstName']?.toString().trim() ?? '';
        final last = st['profile']['lastName']?.toString().trim() ?? '';
        final full = '$first $last'.trim();
        if (full.isNotEmpty) name = full;
        avatar ??= st['profile']['avatar']?.toString();
      }
    }

    if (name == 'Student') {
      final email = json['email']?.toString().trim() ?? json['user']?['email']?.toString().trim();
      if (email != null && email.contains('@')) {
        final prefix = email.split('@').first.replaceAll('.', ' ').replaceAll('_', ' ');
        if (prefix.trim().isNotEmpty) {
          name = prefix.split(' ').where((w) => w.isNotEmpty).map((w) => '${w[0].toUpperCase()}${w.substring(1)}').join(' ');
        }
      }
    }

    final roll = (json['student'] is Map ? (json['student']['enrollmentNumber'] ?? json['student']['rollNumber']) : null) ??
        json['enrollmentNumber'] ??
        json['rollNumber'] ??
        json['studentId'] ??
        '';

    String studentId = '';
    if (json['student'] is Map) {
      studentId = (json['student']['_id'] ?? json['student']['id'] ?? '').toString();
    } else if (json['student'] != null) {
      studentId = json['student'].toString();
    }

    if (studentId.isEmpty) {
      studentId = (json['user']?['_id'] ?? json['studentId'] ?? json['userId'] ?? json['_id'] ?? json['id'] ?? '').toString();
    }

    return StudentRosterItem(
      id: studentId,
      name: name,
      enrollmentNumber: roll.toString(),
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
