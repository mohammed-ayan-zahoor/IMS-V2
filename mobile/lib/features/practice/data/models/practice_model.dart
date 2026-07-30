class QuestionModel {
  final String id;
  final String text;
  final List<String> options;
  final int correctOption;
  final String explanation;
  final String difficulty;

  QuestionModel({
    required this.id,
    required this.text,
    required this.options,
    required this.correctOption,
    required this.explanation,
    required this.difficulty,
  });

  factory QuestionModel.fromJson(Map<String, dynamic> json) {
    final opts = (json['options'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];

    int correct = 0;
    if (json['correctOption'] is num) {
      correct = (json['correctOption'] as num).toInt();
    } else if (json['correctAnswer'] != null) {
      correct = int.tryParse(json['correctAnswer'].toString()) ?? 0;
    }

    return QuestionModel(
      id: json['_id'] ?? '',
      text: json['text'] ?? 'Question',
      options: opts,
      correctOption: correct,
      explanation: json['explanation'] ?? 'No explanation available.',
      difficulty: json['difficulty'] ?? 'medium',
    );
  }
}

class PracticeSessionModel {
  final String id;
  final String subjectName;
  final int totalQuestions;
  final int correctCount;
  final double score;
  final String status;
  final DateTime createdAt;
  final String difficulty;

  PracticeSessionModel({
    required this.id,
    required this.subjectName,
    required this.totalQuestions,
    required this.correctCount,
    required this.score,
    required this.status,
    required this.createdAt,
    required this.difficulty,
  });

  factory PracticeSessionModel.fromJson(Map<String, dynamic> json) {
    final subj = (json['subject'] as Map?) ?? {};

    return PracticeSessionModel(
      id: json['_id'] ?? '',
      subjectName: subj['name']?.toString() ?? 'General',
      totalQuestions: (json['totalQuestions'] is num) ? (json['totalQuestions'] as num).toInt() : 0,
      correctCount: (json['correctCount'] is num) ? (json['correctCount'] as num).toInt() : 0,
      score: (json['score'] is num) ? (json['score'] as num).toDouble() : 0.0,
      status: json['status'] ?? 'completed',
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
      difficulty: (json['difficulty'] ?? 'MIXED').toString().toUpperCase(),
    );
  }
}
