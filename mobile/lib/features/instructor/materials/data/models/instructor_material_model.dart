class InstructorMaterialItem {
  final String id;
  final String title;
  final String? description;
  final String? fileUrl;
  final String? courseName;
  final String? batchName;
  final bool allowSubmissions;
  final int? totalMarks;
  final String? dueDate;
  final String? type;
  final String? category;
  final int? fileSize;
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
    this.dueDate,
    this.type,
    this.category,
    this.fileSize,
    this.createdAt,
  });

  bool get isAssignment => allowSubmissions || category == 'assignment';
  bool get isVideo =>
      type == 'video' ||
      (fileUrl?.contains('youtube.com') == true) ||
      (fileUrl?.contains('youtu.be') == true);
  bool get isPdf =>
      fileUrl?.toLowerCase().endsWith('.pdf') == true || type == 'document';

  String get formattedSize {
    if (fileSize != null && fileSize! > 0) {
      if (fileSize! > 1024 * 1024) {
        return '${(fileSize! / (1024 * 1024)).toStringAsFixed(1)} MB';
      }
      return '${(fileSize! / 1024).toStringAsFixed(1)} KB';
    }
    return isPdf ? 'PDF' : isVideo ? 'Video' : 'Resource';
  }

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
    int? size;
    String? fileType;
    if (json['file'] is Map) {
      url = json['file']['url']?.toString();
      size = int.tryParse(json['file']['size']?.toString() ?? '');
      fileType = json['file']['type']?.toString();
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
      dueDate: json['dueDate']?.toString(),
      type: (json['type'] ?? fileType)?.toString(),
      category: json['category']?.toString(),
      fileSize: size,
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

    final st = (json['student'] is Map) ? json['student'] : json;
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

    roll = (st['enrollmentNumber'] ?? st['rollNumber'] ?? json['enrollmentNumber'] ?? json['rollNumber'])?.toString();

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
