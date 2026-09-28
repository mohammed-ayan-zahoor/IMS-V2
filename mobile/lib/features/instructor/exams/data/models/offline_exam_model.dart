class OfflineExamSubject {
  final String id;
  final String name;
  final String? code;
  final int maxMarks;
  final int passMarks;

  OfflineExamSubject({
    required this.id,
    required this.name,
    this.code,
    required this.maxMarks,
    required this.passMarks,
  });

  factory OfflineExamSubject.fromJson(Map<String, dynamic> json) {
    String name = 'Subject';
    String? code;
    String id = '';
    if (json['subject'] is Map) {
      name = json['subject']['name']?.toString() ?? 'Subject';
      code = json['subject']['code']?.toString();
      id = (json['subject']['_id'] ?? json['subject']['id'] ?? '').toString();
    } else if (json['name'] != null) {
      name = json['name'].toString();
    }

    if (id.isEmpty) {
      id = (json['_id'] ?? json['id'] ?? '').toString();
    }

    return OfflineExamSubject(
      id: id,
      name: name,
      code: code,
      maxMarks: int.tryParse(json['maxMarks']?.toString() ?? '100') ?? 100,
      passMarks: int.tryParse(json['passMarks']?.toString() ?? '35') ?? 35,
    );
  }
}

class OfflineExamBatchRef {
  final String id;
  final String name;

  OfflineExamBatchRef({required this.id, required this.name});

  OfflineExamBatchRef copyWith({String? id, String? name}) {
    return OfflineExamBatchRef(
      id: id ?? this.id,
      name: name ?? this.name,
    );
  }

  factory OfflineExamBatchRef.fromJson(dynamic json) {
    if (json is Map) {
      return OfflineExamBatchRef(
        id: (json['_id'] ?? json['id'] ?? '').toString(),
        name: (json['name'] ?? 'Batch').toString(),
      );
    }
    return OfflineExamBatchRef(
      id: json?.toString() ?? '',
      name: 'Batch',
    );
  }
}

class OfflineExamItem {
  final String id;
  final String title;
  final String? courseName;
  final String? courseId;
  final String? sessionName;
  final String? sessionId;
  final String status;
  final List<OfflineExamSubject> subjects;
  final List<OfflineExamBatchRef> batches;
  final String? createdAt;

  OfflineExamItem({
    required this.id,
    required this.title,
    this.courseName,
    this.courseId,
    this.sessionName,
    this.sessionId,
    required this.status,
    required this.subjects,
    required this.batches,
    this.createdAt,
  });

  factory OfflineExamItem.fromJson(Map<String, dynamic> json) {
    String? course;
    String? courseId;
    if (json['course'] is Map) {
      course = json['course']['name']?.toString();
      courseId = (json['course']['_id'] ?? json['course']['id'])?.toString();
    } else if (json['course'] != null) {
      courseId = json['course'].toString();
    }

    String? session;
    String? sessionId;
    if (json['session'] is Map) {
      session = json['session']['name']?.toString();
      sessionId = (json['session']['_id'] ?? json['session']['id'])?.toString();
    } else if (json['session'] != null) {
      sessionId = json['session'].toString();
    }

    List<OfflineExamSubject> subjs = [];
    if (json['subjects'] is List) {
      subjs = (json['subjects'] as List)
          .whereType<Map<String, dynamic>>()
          .map((s) => OfflineExamSubject.fromJson(s))
          .toList();
    }

    List<OfflineExamBatchRef> bts = [];
    if (json['batches'] is List) {
      for (var b in json['batches']) {
        if (b is Map<String, dynamic>) {
          bts.add(OfflineExamBatchRef.fromJson(b));
        } else if (b != null && b.toString().isNotEmpty) {
          bts.add(OfflineExamBatchRef(id: b.toString(), name: 'Batch'));
        }
      }
    }

    return OfflineExamItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Offline Exam').toString(),
      courseName: course,
      courseId: courseId,
      sessionName: session,
      sessionId: sessionId,
      status: (json['status'] ?? 'draft').toString(),
      subjects: subjs,
      batches: bts,
      createdAt: json['createdAt']?.toString(),
    );
  }
}

class OfflineStudentSubjectMark {
  final String subjectId;
  int? obtainedMarks;
  bool isAbsent;

  OfflineStudentSubjectMark({
    required this.subjectId,
    this.obtainedMarks,
    this.isAbsent = false,
  });

  factory OfflineStudentSubjectMark.fromJson(Map<String, dynamic> json) {
    return OfflineStudentSubjectMark(
      subjectId: (json['subject']?.toString() ?? json['subjectId']?.toString() ?? ''),
      obtainedMarks: json['obtainedMarks'] != null ? int.tryParse(json['obtainedMarks'].toString()) : null,
      isAbsent: json['isAbsent'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
    'subject': subjectId,
    'obtainedMarks': isAbsent ? 0 : (obtainedMarks ?? 0),
    'isAbsent': isAbsent,
  };
}

class OfflineStudentResultEntry {
  final String studentId;
  final String studentName;
  final String? rollNumber;
  final String? enrollmentNumber;
  Map<String, OfflineStudentSubjectMark> subjectMarks;
  String teacherRemarks;

  OfflineStudentResultEntry({
    required this.studentId,
    required this.studentName,
    this.rollNumber,
    this.enrollmentNumber,
    required this.subjectMarks,
    this.teacherRemarks = '',
  });

  factory OfflineStudentResultEntry.fromApiResponse(
    Map<String, dynamic> json,
    List<OfflineExamSubject> subjects,
  ) {
    final st = (json['student'] is Map) ? json['student'] : json;
    final id = (st['_id'] ?? st['id'] ?? st['studentId'] ?? json['studentId'] ?? '').toString();
    
    String name = 'Student';
    final direct = (st['name'] ?? st['fullName'] ?? json['name'] ?? json['fullName'])?.toString().trim();
    if (direct != null && direct.isNotEmpty && direct.toLowerCase() != 'student') {
      name = direct;
    } else if (st['profile'] is Map) {
      final first = st['profile']['firstName']?.toString().trim() ?? '';
      final last = st['profile']['lastName']?.toString().trim() ?? '';
      final full = '$first $last'.trim();
      if (full.isNotEmpty) name = full;
    } else if (st['user'] is Map) {
      final u = st['user'];
      final uName = (u['name'] ?? u['fullName'])?.toString().trim();
      if (uName != null && uName.isNotEmpty) {
        name = uName;
      } else if (u['profile'] is Map) {
        final first = u['profile']['firstName']?.toString().trim() ?? '';
        final last = u['profile']['lastName']?.toString().trim() ?? '';
        final full = '$first $last'.trim();
        if (full.isNotEmpty) name = full;
      }
    }

    if (name == 'Student') {
      final email = (st['email'] ?? st['user']?['email'])?.toString().trim();
      if (email != null && email.contains('@')) {
        final prefix = email.split('@').first.replaceAll('.', ' ').replaceAll('_', ' ');
        if (prefix.trim().isNotEmpty) {
          name = prefix.split(' ').where((w) => w.isNotEmpty).map((w) => '${w[0].toUpperCase()}${w.substring(1)}').join(' ');
        }
      }
    }

    final roll = (st['rollNumber'] ?? json['rollNumber'])?.toString();
    final enroll = (st['enrollmentNumber'] ?? json['enrollmentNumber'])?.toString();

    final marksMap = <String, OfflineStudentSubjectMark>{};

    // Initialize with existing marks if any
    if (json['marks'] is List) {
      for (var m in json['marks']) {
        if (m is Map) {
          final subjId = (m['subject']?['_id'] ?? m['subject'] ?? '').toString();
          if (subjId.isNotEmpty) {
            marksMap[subjId] = OfflineStudentSubjectMark(
              subjectId: subjId,
              obtainedMarks: m['obtainedMarks'] != null ? int.tryParse(m['obtainedMarks'].toString()) : null,
              isAbsent: m['isAbsent'] == true,
            );
          }
        }
      }
    }

    // Ensure all exam subjects have an entry
    for (var s in subjects) {
      marksMap.putIfAbsent(
        s.id,
        () => OfflineStudentSubjectMark(subjectId: s.id),
      );
    }

    return OfflineStudentResultEntry(
      studentId: id,
      studentName: name,
      rollNumber: roll,
      enrollmentNumber: enroll,
      subjectMarks: marksMap,
      teacherRemarks: json['teacherRemarks']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toPostJson() => {
    'studentId': studentId,
    'marks': subjectMarks.values.map((m) => m.toJson()).toList(),
    'teacherRemarks': teacherRemarks,
  };
}
