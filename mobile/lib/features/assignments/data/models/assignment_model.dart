class AssignmentModel {
  final String id;
  final String title;
  final String description;
  final String category;
  final bool allowSubmissions;
  final DateTime? dueDate;
  final int? totalMarks;
  final String? fileUrl;
  final String? fileName;
  final int? fileSize;
  final String courseName;
  final DateTime createdAt;

  AssignmentModel({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.allowSubmissions,
    this.dueDate,
    this.totalMarks,
    this.fileUrl,
    this.fileName,
    this.fileSize,
    required this.courseName,
    required this.createdAt,
  });

  factory AssignmentModel.fromJson(Map<String, dynamic> json) {
    final fileObj = json['file'] is Map ? (json['file'] as Map) : {};
    final courseObj = json['course'] is Map ? (json['course'] as Map) : {};

    return AssignmentModel(
      id: json['_id'] ?? json['id'] ?? '',
      title: json['title'] ?? 'Assignment',
      description: json['description'] ?? '',
      category: json['category'] ?? 'assignment',
      allowSubmissions: json['allowSubmissions'] == true,
      dueDate: json['dueDate'] != null ? DateTime.parse(json['dueDate']) : null,
      totalMarks: json['totalMarks'] is num ? (json['totalMarks'] as num).toInt() : null,
      fileUrl: fileObj['url'],
      fileName: fileObj['originalName'],
      fileSize: fileObj['size'] is num ? (fileObj['size'] as num).toInt() : null,
      courseName: courseObj['name'] ?? 'General',
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
    );
  }
}

class AssignmentSubmissionModel {
  final String id;
  final String assignmentId;
  final String fileUrl;
  final String fileName;
  final int fileSize;
  final String status; // 'pending', 'graded', 'rejected'
  final int? score;
  final String? feedback;
  final String? gradedByName;
  final DateTime submittedAt;
  final DateTime? gradedAt;

  AssignmentSubmissionModel({
    required this.id,
    required this.assignmentId,
    required this.fileUrl,
    required this.fileName,
    required this.fileSize,
    required this.status,
    this.score,
    this.feedback,
    this.gradedByName,
    required this.submittedAt,
    this.gradedAt,
  });

  factory AssignmentSubmissionModel.fromJson(Map<String, dynamic> json) {
    final fileObj = json['file'] is Map ? (json['file'] as Map) : {};
    final gradedByObj = json['gradedBy'] is Map ? (json['gradedBy'] as Map) : {};

    String gName = 'Teacher';
    if (gradedByObj['profile'] is Map) {
      final p = gradedByObj['profile'] as Map;
      final fName = p['firstName'] ?? '';
      final lName = p['lastName'] ?? '';
      gName = '$fName $lName'.trim();
    }
    if (gName.isEmpty) {
      gName = gradedByObj['fullName'] ?? 'Teacher';
    }

    return AssignmentSubmissionModel(
      id: json['_id'] ?? json['id'] ?? '',
      assignmentId: json['assignment']?.toString() ?? '',
      fileUrl: fileObj['url'] ?? '',
      fileName: fileObj['originalName'] ?? 'submitted_file.pdf',
      fileSize: fileObj['size'] is num ? (fileObj['size'] as num).toInt() : 0,
      status: json['status'] ?? 'pending',
      score: json['score'] is num ? (json['score'] as num).toInt() : null,
      feedback: json['feedback'],
      gradedByName: gName,
      submittedAt: json['submittedAt'] != null ? DateTime.parse(json['submittedAt']) : DateTime.now(),
      gradedAt: json['gradedAt'] != null ? DateTime.parse(json['gradedAt']) : null,
    );
  }
}
