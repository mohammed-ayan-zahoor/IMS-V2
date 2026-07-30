import 'package:flutter/material.dart';

class NoticeAttachment {
  final String name;
  final String url;

  NoticeAttachment({required this.name, required this.url});

  factory NoticeAttachment.fromJson(Map<String, dynamic> json) {
    return NoticeAttachment(
      name: json['name'] ?? 'Attachment',
      url: json['url'] ?? '',
    );
  }
}

class NoticeModel {
  final String id;
  final String title;
  final String content;
  final String type;
  final bool isPinned;
  final DateTime createdAt;
  final List<NoticeAttachment> attachments;

  NoticeModel({
    required this.id,
    required this.title,
    required this.content,
    required this.type,
    required this.isPinned,
    required this.createdAt,
    required this.attachments,
  });

  String get categoryDisplay {
    switch (type.toLowerCase()) {
      case 'urgent':
        return 'Urgent';
      case 'event':
        return 'Event';
      case 'warning':
        return 'Warning';
      case 'success':
        return 'Academic';
      default:
        return 'General';
    }
  }

  IconData get categoryIcon {
    switch (type.toLowerCase()) {
      case 'urgent':
        return Icons.campaign_outlined;
      case 'event':
        return Icons.event_note_outlined;
      case 'warning':
        return Icons.warning_amber_outlined;
      default:
        return Icons.info_outline;
    }
  }

  Color get categoryTextColor {
    switch (type.toLowerCase()) {
      case 'urgent':
        return const Color(0xFFBA1A1A);
      case 'event':
        return const Color(0xFF1A365D);
      case 'warning':
        return const Color(0xFFE37400);
      default:
        return const Color(0xFF002045);
    }
  }

  Color get categoryBgColor {
    switch (type.toLowerCase()) {
      case 'urgent':
        return const Color(0xFFFFDAD6);
      case 'event':
        return const Color(0xFFD5E0F7);
      case 'warning':
        return const Color(0xFFFEF7E0);
      default:
        return const Color(0xFFEFF4FF);
    }
  }

  factory NoticeModel.fromJson(Map<String, dynamic> json) {
    final atts = (json['attachments'] as List<dynamic>?)
            ?.map((e) => NoticeAttachment.fromJson(e))
            .toList() ??
        [];

    return NoticeModel(
      id: json['_id'] ?? '',
      title: json['title'] ?? 'Notice',
      content: json['content'] ?? '',
      type: json['type'] ?? 'info',
      isPinned: json['isPinned'] == true,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      attachments: atts,
    );
  }
}

class NoticesResponse {
  final List<NoticeModel> notices;

  NoticesResponse({required this.notices});

  factory NoticesResponse.fromJson(Map<String, dynamic> json) {
    final list = (json['notices'] as List<dynamic>?)
            ?.map((e) => NoticeModel.fromJson(e))
            .toList() ??
        [];
    return NoticesResponse(notices: list);
  }
}
