import 'package:flutter/material.dart';
import 'package:student_app/features/assignments/data/models/assignment_model.dart';

class MaterialModel {
  final String id;
  final String title;
  final String description;
  final String category;
  final String courseName;
  final String fileUrl;
  final String fileType;
  final String originalName;
  final int sizeBytes;
  final int downloadCount;
  final DateTime createdAt;
  final bool allowSubmissions;
  final DateTime? dueDate;
  final int? totalMarks;

  MaterialModel({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.courseName,
    required this.fileUrl,
    required this.fileType,
    required this.originalName,
    required this.sizeBytes,
    required this.downloadCount,
    required this.createdAt,
    this.allowSubmissions = false,
    this.dueDate,
    this.totalMarks,
  });

  bool get isPdf => fileType.toLowerCase() == 'pdf' || fileUrl.toLowerCase().endsWith('.pdf');
  bool get isVideo => fileType.toLowerCase() == 'video' || isYouTube;
  bool get isAssignment => category.toLowerCase() == 'assignment' || allowSubmissions;

  bool get isYouTube {
    final lower = fileUrl.toLowerCase();
    return lower.contains('youtube.com') || lower.contains('youtu.be');
  }

  String? get youtubeVideoId {
    if (!isYouTube) return null;
    final regExp = RegExp(
      r'^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*',
      caseSensitive: false,
      multiLine: false,
    );
    final match = regExp.firstMatch(fileUrl);
    if (match != null && match.groupCount >= 2) {
      return match.group(2);
    }
    return null;
  }

  String get youtubeThumbnailUrl {
    final id = youtubeVideoId;
    if (id != null && id.isNotEmpty) {
      return 'https://img.youtube.com/vi/$id/hqdefault.jpg';
    }
    return '';
  }

  String get formattedSize {
    if (sizeBytes <= 0) return 'Video Stream';
    if (sizeBytes < 1024 * 1024) {
      return '${(sizeBytes / 1024).toStringAsFixed(1)} KB';
    }
    return '${(sizeBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  Color get categoryColor {
    if (isPdf) return const Color(0xFFEF4444);
    if (isVideo) return const Color(0xFF2563EB);
    return const Color(0xFF10B981);
  }

  AssignmentModel toAssignmentModel() {
    return AssignmentModel(
      id: id,
      title: title,
      description: description,
      category: category,
      allowSubmissions: allowSubmissions,
      dueDate: dueDate,
      totalMarks: totalMarks,
      fileUrl: fileUrl,
      fileName: originalName,
      fileSize: sizeBytes,
      courseName: courseName,
      createdAt: createdAt,
    );
  }

  factory MaterialModel.fromJson(Map<String, dynamic> json) {
    final file = (json['file'] as Map?) ?? {};
    final course = (json['course'] as Map?) ?? {};
    final cat = json['category']?.toString() ?? 'Lecture';

    return MaterialModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Learning Material',
      description: json['description']?.toString() ?? '',
      category: cat,
      courseName: course['name']?.toString() ?? 'General',
      fileUrl: file['url']?.toString() ?? '',
      fileType: file['type']?.toString() ?? 'pdf',
      originalName: file['originalName']?.toString() ?? 'document',
      sizeBytes: (file['size'] is num) ? (file['size'] as num).toInt() : 0,
      downloadCount: (json['downloadCount'] is num) ? (json['downloadCount'] as num).toInt() : 0,
      createdAt: json['createdAt'] != null
          ? (DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now())
          : DateTime.now(),
      allowSubmissions: json['allowSubmissions'] == true || cat.toLowerCase() == 'assignment',
      dueDate: json['dueDate'] != null ? DateTime.tryParse(json['dueDate'].toString()) : null,
      totalMarks: (json['totalMarks'] is num) ? (json['totalMarks'] as num).toInt() : null,
    );
  }
}

class MaterialsResponse {
  final List<MaterialModel> materials;

  MaterialsResponse({required this.materials});

  factory MaterialsResponse.fromJson(Map<String, dynamic> json) {
    final list = <MaterialModel>[];
    if (json['materials'] is List) {
      for (final e in (json['materials'] as List)) {
        if (e is Map) {
          try {
            list.add(MaterialModel.fromJson(Map<String, dynamic>.from(e)));
          } catch (err) {
            debugPrint('MaterialModel parse error: $err');
          }
        }
      }
    }
    return MaterialsResponse(materials: list);
  }
}
