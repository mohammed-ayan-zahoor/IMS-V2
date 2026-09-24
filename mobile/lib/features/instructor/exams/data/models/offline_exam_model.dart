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

  factory OfflineExamBatchRef.fromJson(Map<String, dynamic> json) {
    return OfflineExamBatchRef(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? 'Batch').toString(),
    );
  }
}

class OfflineExamItem {
  final String id;
  final String title;
  final String? courseName;
  final String? sessionName;
  final String status;
  final List<OfflineExamSubject> subjects;
  final List<OfflineExamBatchRef> batches;
  final String? createdAt;

  OfflineExamItem({
    required this.id,
    required this.title,
    this.courseName,
    this.sessionName,
    required this.status,
    required this.subjects,
    required this.batches,
    this.createdAt,
  });

  factory OfflineExamItem.fromJson(Map<String, dynamic> json) {
    String? course;
    if (json['course'] is Map) {
      course = json['course']['name']?.toString();
    }

    String? session;
    if (json['session'] is Map) {
      session = json['session']['name']?.toString();
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
      bts = (json['batches'] as List)
          .whereType<Map<String, dynamic>>()
          .map((b) => OfflineExamBatchRef.fromJson(b))
          .toList();
    }

    return OfflineExamItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Offline Exam').toString(),
      courseName: course,
      sessionName: session,
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
    final st = json['student'] ?? {};
    final id = (st['_id'] ?? st['id'] ?? '').toString();
    final name = (st['name'] ?? 'Student').toString();
    final roll = st['rollNumber']?.toString();
    final enroll = st['enrollmentNumber']?.toString();

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
