class InstructorExamItem {
  final String id;
  final String title;
  final String? courseName;
  final String? subjectName;
  final String status; // 'draft', 'published', 'ongoing', 'completed'
  final int totalMarks;
  final int duration;
  final String? scheduledAt;

  InstructorExamItem({
    required this.id,
    required this.title,
    this.courseName,
    this.subjectName,
    required this.status,
    required this.totalMarks,
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

    return InstructorExamItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Exam').toString(),
      courseName: course,
      subjectName: subject,
      status: (json['status'] ?? 'draft').toString(),
      totalMarks: int.tryParse(json['totalMarks']?.toString() ?? '100') ?? 100,
      duration: int.tryParse(json['duration']?.toString() ?? '60') ?? 60,
      scheduledAt: json['scheduledAt']?.toString(),
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

  QuestionBankItem({
    required this.id,
    required this.text,
    required this.type,
    required this.difficulty,
    required this.marks,
    required this.options,
  });

  factory QuestionBankItem.fromJson(Map<String, dynamic> json) {
    List<String> opts = [];
    if (json['options'] is List) {
      opts = (json['options'] as List).map((o) => o.toString()).toList();
    }

    return QuestionBankItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      text: (json['text'] ?? 'Question').toString(),
      type: (json['type'] ?? 'mcq').toString(),
      difficulty: (json['difficulty'] ?? 'medium').toString(),
      marks: int.tryParse(json['marks']?.toString() ?? '1') ?? 1,
      options: opts,
    );
  }
}
