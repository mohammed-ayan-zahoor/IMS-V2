class InstructorExamItem {
  final String id;
  final String title;
  final String? courseName;
  final String? subjectName;
  final String status; // 'draft', 'published', 'ongoing', 'completed'
  final int totalMarks;
  final int duration;
  final int passingMarks;
  final bool requiresManualGrading;
  final String? scheduledAt;

  InstructorExamItem({
    required this.id,
    required this.title,
    this.courseName,
    this.subjectName,
    required this.status,
    required this.totalMarks,
    this.passingMarks = 0,
    this.requiresManualGrading = false,
    required this.duration,
    this.scheduledAt,
  });

  factory InstructorExamItem.fromJson(Map<String, dynamic> json) {
    String? course;
    if (json['course'] is Map) {
      course = json['course']['name']?.toString();
    } else if (json['courseName'] != null) {
      course = json['courseName'].toString();
    }

    String? subject;
    if (json['subject'] is Map) {
      subject = json['subject']['name']?.toString();
    } else if (json['subjectName'] != null) {
      subject = json['subjectName'].toString();
    }

    final total = int.tryParse(json['totalMarks']?.toString() ?? '100') ?? 100;
    final pass = int.tryParse(json['passingMarks']?.toString() ?? '') ?? (total * 0.35).round();

    return InstructorExamItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Exam').toString(),
      courseName: course,
      subjectName: subject,
      status: (json['status'] ?? 'draft').toString(),
      totalMarks: total,
      passingMarks: pass,
      requiresManualGrading: json['requiresManualGrading'] == true,
      duration: int.tryParse(json['duration']?.toString() ?? '60') ?? 60,
      scheduledAt: json['scheduledAt']?.toString(),
    );
  }
}

class OnlineExamSubmissionItem {
  final String id;
  final String studentId;
  final String studentName;
  final String? rollNumber;
  final String? enrollmentNumber;
  final double score;
  final double percentage;
  final String status;
  final String gradingStatus;
  final String? submittedAt;
  final int timeSpentSeconds;

  OnlineExamSubmissionItem({
    required this.id,
    required this.studentId,
    required this.studentName,
    this.rollNumber,
    this.enrollmentNumber,
    required this.score,
    required this.percentage,
    required this.status,
    required this.gradingStatus,
    this.submittedAt,
    this.timeSpentSeconds = 0,
  });

  factory OnlineExamSubmissionItem.fromJson(Map<String, dynamic> json) {
    final st = (json['student'] is Map) ? json['student'] : json;
    final sId = (st['_id'] ?? st['id'] ?? st['studentId'] ?? json['studentId'] ?? '').toString();

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

    final roll = (st['profile'] is Map ? st['profile']['rollNumber'] : null) ?? st['rollNumber'] ?? json['rollNumber'];
    final enroll = st['enrollmentNumber'] ?? json['enrollmentNumber'];

    return OnlineExamSubmissionItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      studentId: sId,
      studentName: name,
      rollNumber: roll?.toString(),
      enrollmentNumber: enroll?.toString(),
      score: double.tryParse(json['score']?.toString() ?? '0') ?? 0.0,
      percentage: double.tryParse(json['percentage']?.toString() ?? '0') ?? 0.0,
      status: (json['status'] ?? 'submitted').toString(),
      gradingStatus: (json['gradingStatus'] ?? 'not_required').toString(),
      submittedAt: json['submittedAt']?.toString() ?? json['createdAt']?.toString(),
      timeSpentSeconds: int.tryParse(json['timeSpentSeconds']?.toString() ?? '0') ?? 0,
    );
  }
}

class QuestionBankItem {
  final String id;
  final String text;
  final String type; // 'mcq', 'essay', etc.
  final String difficulty; // 'easy', 'medium', 'hard'
  final int marks;
  final List<String> options;
  final String? courseId;
  final String? courseName;
  final String? batchId;
  final String? batchName;
  final String? explanation;
  final dynamic correctAnswer;
  final String? chapter;
  final String? topic;

  QuestionBankItem({
    required this.id,
    required this.text,
    required this.type,
    required this.difficulty,
    required this.marks,
    required this.options,
    this.courseId,
    this.courseName,
    this.batchId,
    this.batchName,
    this.explanation,
    this.correctAnswer,
    this.chapter,
    this.topic,
  });

  factory QuestionBankItem.fromJson(Map<String, dynamic> json) {
    List<String> opts = [];
    if (json['options'] is List) {
      opts = (json['options'] as List).map((o) => o.toString()).toList();
    }

    String? cId;
    String? cName;
    if (json['course'] is Map) {
      cId = (json['course']['_id'] ?? json['course']['id'])?.toString();
      cName = json['course']['name']?.toString();
    } else if (json['course'] != null) {
      cId = json['course'].toString();
    }

    String? bId;
    String? bName;
    if (json['batch'] is Map) {
      bId = (json['batch']['_id'] ?? json['batch']['id'])?.toString();
      bName = json['batch']['name']?.toString();
    } else if (json['batch'] != null) {
      bId = json['batch'].toString();
    }

    return QuestionBankItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      text: (json['text'] ?? 'Question').toString(),
      type: (json['type'] ?? 'mcq').toString(),
      difficulty: (json['difficulty'] ?? 'medium').toString(),
      marks: int.tryParse(json['marks']?.toString() ?? '1') ?? 1,
      options: opts,
      courseId: cId,
      courseName: cName,
      batchId: bId,
      batchName: bName,
      explanation: json['explanation']?.toString(),
      correctAnswer: json['correctAnswer'],
      chapter: json['chapter']?.toString(),
      topic: json['topic']?.toString(),
    );
  }
}
