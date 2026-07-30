class ExamModel {
  final String id;
  final String title;
  final String courseName;
  final String subjectName;
  final int duration; // in minutes
  final int totalMarks;
  final int passingMarks;
  final String submissionStatus; // 'available', 'in_progress', 'submitted', 'upcoming', 'missed'
  final int attemptsUsed;
  final dynamic maxAttempts; // int or 'Unlimited'
  final DateTime startTime;
  final DateTime endTime;
  final String instructions;
  final bool showCorrectAnswers;
  final bool showExplanations;
  final bool negativeMarking;
  final double negativeMarkingPercentage;
  final double? bestScore;
  final double? bestPercentage;

  ExamModel({
    required this.id,
    required this.title,
    required this.courseName,
    required this.subjectName,
    required this.duration,
    required this.totalMarks,
    required this.passingMarks,
    required this.submissionStatus,
    required this.attemptsUsed,
    required this.maxAttempts,
    required this.startTime,
    required this.endTime,
    required this.instructions,
    required this.showCorrectAnswers,
    required this.showExplanations,
    required this.negativeMarking,
    required this.negativeMarkingPercentage,
    this.bestScore,
    this.bestPercentage,
  });

  factory ExamModel.fromJson(Map<String, dynamic> json) {
    final course = (json['course'] is Map) ? json['course'] : {};
    final subject = (json['subject'] is Map) ? json['subject'] : {};
    final schedule = (json['schedule'] is Map) ? json['schedule'] : {};

    DateTime start = DateTime.now();
    if (schedule['startTime'] != null) {
      start = DateTime.parse(schedule['startTime']);
    } else if (json['scheduledAt'] != null) {
      start = DateTime.parse(json['scheduledAt']);
    }

    DateTime end = start.add(Duration(minutes: (json['duration'] is num) ? (json['duration'] as num).toInt() : 60));
    if (schedule['endTime'] != null) {
      end = DateTime.parse(schedule['endTime']);
    }

    final bestResult = json['bestResult'] as Map?;

    return ExamModel(
      id: json['_id'] ?? '',
      title: json['title'] ?? 'Exam',
      courseName: course['name']?.toString() ?? 'Course',
      subjectName: subject['name']?.toString() ?? 'General',
      duration: (json['duration'] is num) ? (json['duration'] as num).toInt() : 60,
      totalMarks: (json['totalMarks'] is num) ? (json['totalMarks'] as num).toInt() : 0,
      passingMarks: (json['passingMarks'] is num) ? (json['passingMarks'] as num).toInt() : 0,
      submissionStatus: json['submissionStatus']?.toString() ?? 'available',
      attemptsUsed: (json['attemptsUsed'] is num) ? (json['attemptsUsed'] as num).toInt() : 0,
      maxAttempts: json['maxAttempts'] ?? 1,
      startTime: start,
      endTime: end,
      instructions: json['instructions']?.toString() ?? 'No special instructions.',
      showCorrectAnswers: json['showCorrectAnswers'] ?? true,
      showExplanations: json['showExplanations'] ?? true,
      negativeMarking: json['negativeMarking'] ?? false,
      negativeMarkingPercentage: (json['negativeMarkingPercentage'] is num)
          ? (json['negativeMarkingPercentage'] as num).toDouble()
          : 0.0,
      bestScore: (bestResult != null && bestResult['score'] is num)
          ? (bestResult['score'] as num).toDouble()
          : null,
      bestPercentage: (bestResult != null && bestResult['percentage'] is num)
          ? (bestResult['percentage'] as num).toDouble()
          : null,
    );
  }
}

class ExamQuestionModel {
  final String id;
  final String text;
  final String type; // 'mcq', 'true_false', 'short_answer'
  final List<String> options;
  final int marks;

  ExamQuestionModel({
    required this.id,
    required this.text,
    required this.type,
    required this.options,
    required this.marks,
  });

  factory ExamQuestionModel.fromJson(Map<String, dynamic> json) {
    final opts = (json['options'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];

    return ExamQuestionModel(
      id: json['_id'] ?? '',
      text: json['text'] ?? 'Question',
      type: json['type'] ?? 'mcq',
      options: opts,
      marks: (json['marks'] is num) ? (json['marks'] as num).toInt() : 1,
    );
  }
}

class ExamAnswerResultModel {
  final String questionId;
  final String questionText;
  final String type;
  final dynamic yourAnswer;
  final dynamic correctAnswer;
  final List<String> options;
  final int marksAwarded;
  final int maxMarks;
  final bool isCorrect;

  ExamAnswerResultModel({
    required this.questionId,
    required this.questionText,
    required this.type,
    this.yourAnswer,
    this.correctAnswer,
    required this.options,
    required this.marksAwarded,
    required this.maxMarks,
    required this.isCorrect,
  });

  factory ExamAnswerResultModel.fromJson(Map<String, dynamic> json) {
    final opts = (json['options'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];

    return ExamAnswerResultModel(
      questionId: json['questionId'] ?? '',
      questionText: json['questionText'] ?? '',
      type: json['type'] ?? 'mcq',
      yourAnswer: json['yourAnswer'],
      correctAnswer: json['correctAnswer'],
      options: opts,
      marksAwarded: (json['marksAwarded'] is num) ? (json['marksAwarded'] as num).toInt() : 0,
      maxMarks: (json['maxMarks'] is num) ? (json['maxMarks'] as num).toInt() : 0,
      isCorrect: json['isCorrect'] ?? false,
    );
  }
}

class ExamSubmissionResultModel {
  final double score;
  final double percentage;
  final String status;
  final DateTime? submittedAt;
  final List<ExamAnswerResultModel> answers;
  final String examTitle;
  final int totalMarks;
  final int passingMarks;
  final bool isPassed;
  final String? message;

  ExamSubmissionResultModel({
    required this.score,
    required this.percentage,
    required this.status,
    this.submittedAt,
    required this.answers,
    required this.examTitle,
    required this.totalMarks,
    required this.passingMarks,
    required this.isPassed,
    this.message,
  });

  factory ExamSubmissionResultModel.fromJson(Map<String, dynamic> json) {
    final sub = json['submission'] as Map? ?? {};
    final exam = json['exam'] as Map? ?? {};

    final rawAnswers = (sub['answers'] as List<dynamic>?) ?? [];
    final ansList = rawAnswers.map((a) => ExamAnswerResultModel.fromJson(a)).toList();

    final scoreVal = (sub['score'] is num) ? (sub['score'] as num).toDouble() : 0.0;
    final totalM = (exam['totalMarks'] is num) ? (exam['totalMarks'] as num).toInt() : 0;
    final passingM = (exam['passingMarks'] is num) ? (exam['passingMarks'] as num).toInt() : 0;

    return ExamSubmissionResultModel(
      score: scoreVal,
      percentage: (sub['percentage'] is num) ? (sub['percentage'] as num).toDouble() : 0.0,
      status: sub['status'] ?? 'submitted',
      submittedAt: sub['submittedAt'] != null ? DateTime.parse(sub['submittedAt']) : null,
      answers: ansList,
      examTitle: exam['title'] ?? 'Exam Result',
      totalMarks: totalM,
      passingMarks: passingM,
      isPassed: totalM > 0 ? (scoreVal >= passingM) : true,
      message: sub['message']?.toString(),
    );
  }
}
