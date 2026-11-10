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

class NoticeTranslation {
  final String title;
  final String content;

  NoticeTranslation({required this.title, required this.content});

  factory NoticeTranslation.fromJson(Map<String, dynamic> json) {
    return NoticeTranslation(
      title: json['title']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
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
  final Map<String, NoticeTranslation> translations;

  NoticeModel({
    required this.id,
    required this.title,
    required this.content,
    required this.type,
    required this.isPinned,
    required this.createdAt,
    required this.attachments,
    Map<String, NoticeTranslation>? translations,
  }) : translations = translations != null
            ? Map<String, NoticeTranslation>.from(translations)
            : <String, NoticeTranslation>{};

  /// Returns whether a translation is available for the given language code
  bool hasTranslationFor(String langCode) {
    if (langCode == 'en') return false;
    final t = translations[langCode];
    return t != null && (t.title.trim().isNotEmpty || t.content.trim().isNotEmpty);
  }

  /// Appends or updates a localized translation for this notice
  void addTranslation(String langCode, {required String title, required String content}) {
    translations[langCode] = NoticeTranslation(
      title: title.trim().isNotEmpty ? title.trim() : this.title,
      content: content.trim().isNotEmpty ? content.trim() : this.content,
    );
  }

  /// Returns the translated title for the active locale or the original title
  String getTitle(BuildContext context, {bool forceOriginal = false, String? lang}) {
    if (forceOriginal) return title;
    final langCode = lang ?? Localizations.localeOf(context).languageCode;
    if (langCode == 'en') return title;
    final t = translations[langCode];
    if (t != null && t.title.trim().isNotEmpty) {
      return t.title.trim();
    }
    return title;
  }

  /// Returns the translated content for the active locale or the original content
  String getContent(BuildContext context, {bool forceOriginal = false, String? lang}) {
    if (forceOriginal) return content;
    final langCode = lang ?? Localizations.localeOf(context).languageCode;
    if (langCode == 'en') return content;
    final t = translations[langCode];
    if (t != null && t.content.trim().isNotEmpty) {
      return t.content.trim();
    }
    return content;
  }

  /// Checks whether a translation exists for the current locale
  bool hasTranslation(BuildContext context, {String? lang}) {
    final langCode = lang ?? Localizations.localeOf(context).languageCode;
    return hasTranslationFor(langCode);
  }

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

    final rawTranslations = json['translations'];
    final Map<String, NoticeTranslation> transMap = {};
    if (rawTranslations is Map) {
      rawTranslations.forEach((key, val) {
        if (val is Map) {
          transMap[key.toString()] = NoticeTranslation.fromJson(Map<String, dynamic>.from(val));
        }
      });
    }

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
      translations: transMap,
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
