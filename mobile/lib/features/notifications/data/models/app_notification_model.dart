import 'dart:convert';

class AppNotificationModel {
  final String id;
  final String title;
  final String body;
  final String type; // 'attendance', 'fee_due', 'notice', 'timeline', 'birthday', 'chat', 'general'
  final DateTime timestamp;
  final bool isRead;
  final Map<String, dynamic> data;

  AppNotificationModel({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.timestamp,
    this.isRead = false,
    this.data = const {},
  });

  AppNotificationModel copyWith({
    String? id,
    String? title,
    String? body,
    String? type,
    DateTime? timestamp,
    bool? isRead,
    Map<String, dynamic>? data,
  }) {
    return AppNotificationModel(
      id: id ?? this.id,
      title: title ?? this.title,
      body: body ?? this.body,
      type: type ?? this.type,
      timestamp: timestamp ?? this.timestamp,
      isRead: isRead ?? this.isRead,
      data: data ?? this.data,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'body': body,
      'type': type,
      'timestamp': timestamp.toIso8601String(),
      'isRead': isRead,
      'data': data,
    };
  }

  factory AppNotificationModel.fromMap(Map<String, dynamic> map) {
    return AppNotificationModel(
      id: map['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      title: map['title']?.toString() ?? 'Notification',
      body: map['body']?.toString() ?? '',
      type: map['type']?.toString() ?? 'general',
      timestamp: map['timestamp'] != null
          ? DateTime.tryParse(map['timestamp'].toString()) ?? DateTime.now()
          : DateTime.now(),
      isRead: map['isRead'] == true,
      data: map['data'] is Map ? Map<String, dynamic>.from(map['data']) : {},
    );
  }

  String toJson() => json.encode(toMap());

  factory AppNotificationModel.fromJson(String source) =>
      AppNotificationModel.fromMap(json.decode(source));
}
