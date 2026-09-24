class InstructorMaterialItem {
  final String id;
  final String title;
  final String? description;
  final String? fileUrl;
  final String? courseName;
  final String? batchName;
  final bool allowSubmissions;
  final int? totalMarks;
  final String? createdAt;

  InstructorMaterialItem({
    required this.id,
    required this.title,
    this.description,
    this.fileUrl,
    this.courseName,
    this.batchName,
    required this.allowSubmissions,
    this.totalMarks,
    this.createdAt,
  });

  factory InstructorMaterialItem.fromJson(Map<String, dynamic> json) {
    String? course;
    if (json['courses'] is List && (json['courses'] as List).isNotEmpty) {
      final first = (json['courses'] as List).first;
      course = first is Map ? first['name']?.toString() : first?.toString();
    } else if (json['course'] is Map) {
      course = json['course']['name']?.toString();
    }

    String? batch;
    if (json['batches'] is List && (json['batches'] as List).isNotEmpty) {
      final first = (json['batches'] as List).first;
      batch = first is Map ? first['name']?.toString() : first?.toString();
    }

    String? url;
    if (json['file'] is Map) {
      url = json['file']['url']?.toString();
    } else if (json['url'] != null) {
      url = json['url'].toString();
    }

    return InstructorMaterialItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Untitled Material').toString(),
      description: json['description']?.toString(),
      fileUrl: url,
      courseName: course,
      batchName: batch,
      allowSubmissions: json['allowSubmissions'] == true,
      totalMarks: json['totalMarks'] != null ? int.tryParse(json['totalMarks'].toString()) : null,
      createdAt: json['createdAt']?.toString(),
    );
  }
}

class StudentSubmissionItem {
  final String id;
  final String studentName;
  final String? enrollmentNumber;
  final String? fileUrl;
  final String? submittedAt;
  final String status;
  final int? marksAwarded;
  final String? feedback;

  StudentSubmissionItem({
    required this.id,
    required this.studentName,
    this.enrollmentNumber,
    this.fileUrl,
    this.submittedAt,
    required this.status,
    this.marksAwarded,
    this.feedback,
  });

  factory StudentSubmissionItem.fromJson(Map<String, dynamic> json) {
    String name = 'Student';
    String? roll;
    if (json['student'] is Map) {
      final st = json['student'];
      if (st['profile'] is Map) {
        final first = st['profile']['firstName']?.toString() ?? '';
        final last = st['profile']['lastName']?.toString() ?? '';
        name = '$first $last'.trim();
      } else if (st['name'] != null) {
        name = st['name'].toString();
      }
      roll = (st['enrollmentNumber'] ?? st['rollNumber'])?.toString();
    }

    String? url;
    if (json['file'] is Map) {
      url = json['file']['url']?.toString();
    }

    return StudentSubmissionItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      studentName: name.isNotEmpty ? name : 'Student',
      enrollmentNumber: roll,
      fileUrl: url,
      submittedAt: json['submittedAt']?.toString(),
      status: (json['status'] ?? 'submitted').toString(),
      marksAwarded: json['marksAwarded'] != null ? int.tryParse(json['marksAwarded'].toString()) : null,
      feedback: json['feedback']?.toString(),
    );
  }
}
