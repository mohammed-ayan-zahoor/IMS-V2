class DashboardDataModel {
  final int attendance;
  final int examsTaken;
  final int materialsCount;
  final List<UpcomingExamModel> upcomingExams;
  final List<RecentMaterialModel> recentMaterials;
  final List<SyllabusProgressModel> syllabusProgress;

  DashboardDataModel({
    required this.attendance,
    required this.examsTaken,
    required this.materialsCount,
    required this.upcomingExams,
    required this.recentMaterials,
    required this.syllabusProgress,
  });

  factory DashboardDataModel.fromJson(Map<String, dynamic> json) {
    return DashboardDataModel(
      attendance: json['attendance'] ?? 0,
      examsTaken: json['examsTaken'] ?? 0,
      materialsCount: json['materialsCount'] ?? 0,
      upcomingExams: (json['upcomingExams'] as List<dynamic>?)
              ?.map((e) => UpcomingExamModel.fromJson(e))
              .toList() ??
          [],
      recentMaterials: (json['recentMaterials'] as List<dynamic>?)
              ?.map((e) => RecentMaterialModel.fromJson(e))
              .toList() ??
          [],
      syllabusProgress: (json['syllabusProgress'] as List<dynamic>?)
              ?.map((e) => SyllabusProgressModel.fromJson(e))
              .toList() ??
          [],
    );
  }
}

class UpcomingExamModel {
  final String id;
  final String title;
  final DateTime? scheduledAt;
  final int duration;
  final int passingMarks;

  UpcomingExamModel({
    required this.id,
    required this.title,
    this.scheduledAt,
    required this.duration,
    required this.passingMarks,
  });

  factory UpcomingExamModel.fromJson(Map<String, dynamic> json) {
    return UpcomingExamModel(
      id: json['_id'] ?? '',
      title: json['title'] ?? 'Upcoming Exam',
      scheduledAt: json['scheduledAt'] != null
          ? DateTime.tryParse(json['scheduledAt'])
          : null,
      duration: json['duration'] ?? 0,
      passingMarks: json['passingMarks'] ?? 0,
    );
  }
}

class RecentMaterialModel {
  final String id;
  final String title;
  final String courseName;
  final String? fileUrl;
  final String? type;

  RecentMaterialModel({
    required this.id,
    required this.title,
    required this.courseName,
    this.fileUrl,
    this.type,
  });

  factory RecentMaterialModel.fromJson(Map<String, dynamic> json) {
    String course = '';
    if (json['course'] != null && json['course'] is Map) {
      course = json['course']['name'] ?? '';
    }
    return RecentMaterialModel(
      id: json['_id'] ?? '',
      title: json['title'] ?? 'Study Material',
      courseName: course,
      fileUrl: json['fileUrl'] ?? json['url'],
      type: json['type'] ?? 'file',
    );
  }
}

class SyllabusProgressModel {
  final String subject;
  final String code;
  final int progress;

  SyllabusProgressModel({
    required this.subject,
    required this.code,
    required this.progress,
  });

  factory SyllabusProgressModel.fromJson(Map<String, dynamic> json) {
    return SyllabusProgressModel(
      subject: json['subject'] ?? 'Subject',
      code: json['code'] ?? '',
      progress: json['progress'] is num ? (json['progress'] as num).round() : 0,
    );
  }
}
