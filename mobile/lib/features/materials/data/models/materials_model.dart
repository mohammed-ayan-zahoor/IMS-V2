import 'package:flutter/material.dart';

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
  });

  bool get isPdf => fileType.toLowerCase() == 'pdf' || fileUrl.toLowerCase().endsWith('.pdf');
  bool get isVideo => fileType.toLowerCase() == 'video' || isYouTube;

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

  factory MaterialModel.fromJson(Map<String, dynamic> json) {
    final file = (json['file'] as Map?) ?? {};
    final course = (json['course'] as Map?) ?? {};

    return MaterialModel(
      id: json['_id'] ?? '',
      title: json['title'] ?? 'Learning Material',
      description: json['description'] ?? '',
      category: json['category'] ?? 'Lecture',
      courseName: course['name'] ?? 'General',
      fileUrl: file['url']?.toString() ?? '',
      fileType: file['type']?.toString() ?? 'pdf',
      originalName: file['originalName']?.toString() ?? 'document',
      sizeBytes: (file['size'] is num) ? (file['size'] as num).toInt() : 0,
      downloadCount: (json['downloadCount'] is num) ? (json['downloadCount'] as num).toInt() : 0,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
    );
  }
}

class MaterialsResponse {
  final List<MaterialModel> materials;

  MaterialsResponse({required this.materials});

  factory MaterialsResponse.fromJson(Map<String, dynamic> json) {
    final list = (json['materials'] as List<dynamic>?)
            ?.map((e) => MaterialModel.fromJson(e))
            .toList() ??
        [];
    return MaterialsResponse(materials: list);
  }
}
