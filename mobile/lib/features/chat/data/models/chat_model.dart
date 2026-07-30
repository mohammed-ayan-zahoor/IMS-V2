class ChatMessageModel {
  final String id;
  final String conversationId;
  final String senderId;
  final String senderName;
  final String senderRole;
  final String text;
  final DateTime createdAt;
  final bool isMe;
  final String? replyToId;
  final String? replyToText;
  final String? replyToSenderName;
  final List<String> readBy;

  /// True if someone OTHER than the sender has read this message.
  /// Pass the senderId — any readBy entry that isn't the sender counts as read.
  bool get isReadByOthers => readBy.any((id) => id != senderId);

  ChatMessageModel({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.senderName,
    required this.senderRole,
    required this.text,
    required this.createdAt,
    required this.isMe,
    this.replyToId,
    this.replyToText,
    this.replyToSenderName,
    this.readBy = const [],
  });

  factory ChatMessageModel.fromJson(Map<String, dynamic> json, String currentUserId) {
    final senderObj = json['sender'] is Map ? (json['sender'] as Map) : {};
    final String sId = senderObj['_id'] ?? senderObj['id'] ?? (json['sender']?.toString() ?? '');

    String sName = 'User';
    if (senderObj['profile'] is Map) {
      final p = senderObj['profile'] as Map;
      final fName = p['firstName'] ?? '';
      final lName = p['lastName'] ?? '';
      sName = '$fName $lName'.trim();
    }
    if (sName.isEmpty) {
      sName = senderObj['fullName'] ?? senderObj['email'] ?? 'User';
    }

    String? replyId;
    String? replyText;
    String? replySenderName;

    if (json['replyTo'] is Map) {
      final rObj = json['replyTo'] as Map;
      replyId = rObj['_id'] ?? rObj['id'];
      replyText = rObj['text'];

      final rSender = rObj['sender'] is Map ? (rObj['sender'] as Map) : {};
      if (rSender['profile'] is Map) {
        final p = rSender['profile'] as Map;
        final fName = p['firstName'] ?? '';
        final lName = p['lastName'] ?? '';
        replySenderName = '$fName $lName'.trim();
      }
      if (replySenderName == null || replySenderName.isEmpty) {
        replySenderName = rSender['fullName'] ?? rSender['email'] ?? 'User';
      }
    }

    final rawReadBy = (json['readBy'] as List?) ?? [];
    final parsedReadBy = rawReadBy.map((item) {
      if (item is Map) return (item['_id'] ?? item['id'] ?? '').toString();
      return item.toString();
    }).where((id) => id.isNotEmpty).toList();

    return ChatMessageModel(
      id: json['_id'] ?? json['id'] ?? '',
      conversationId: json['conversationId'] ?? '',
      senderId: sId,
      senderName: sName,
      senderRole: senderObj['role'] ?? 'user',
      text: json['text'] ?? '',
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
      isMe: sId == currentUserId,
      replyToId: replyId,
      replyToText: replyText,
      replyToSenderName: replySenderName,
      readBy: List<String>.from(parsedReadBy),
    );
  }
}

class ConversationModel {
  final String id;
  final String type; // 'direct' or 'batch'
  final String title;
  final String lastMessageText;
  final DateTime? lastMessageAt;
  final String otherParticipantName;
  final String otherParticipantRole;
  final int unreadCount;

  ConversationModel({
    required this.id,
    required this.type,
    required this.title,
    required this.lastMessageText,
    this.lastMessageAt,
    required this.otherParticipantName,
    required this.otherParticipantRole,
    this.unreadCount = 0,
  });

  factory ConversationModel.fromJson(Map<String, dynamic> json, String currentUserId) {
    final List participants = (json['participants'] as List?) ?? [];
    String otherName = 'Support Chat';
    String otherRole = 'admin';

    for (final p in participants) {
      if (p is Map) {
        final pId = p['_id'] ?? p['id'];
        if (pId != currentUserId) {
          final profile = p['profile'] is Map ? (p['profile'] as Map) : {};
          final fName = profile['firstName'] ?? '';
          final lName = profile['lastName'] ?? '';
          otherName = '$fName $lName'.trim();
          if (otherName.isEmpty) {
            otherName = p['fullName'] ?? p['email'] ?? 'User';
          }
          otherRole = p['role'] ?? 'user';
          break;
        }
      }
    }

    final batchObj = json['batch'] is Map ? (json['batch'] as Map) : null;
    final String chatTitle = json['type'] == 'batch'
        ? (batchObj?['name'] ?? 'Batch Group')
        : (otherName.isNotEmpty ? otherName : 'Direct Chat');

    final lastMsg = json['lastMessage'] is Map ? (json['lastMessage'] as Map) : null;

    return ConversationModel(
      id: json['_id'] ?? json['id'] ?? '',
      type: json['type'] ?? 'direct',
      title: chatTitle,
      lastMessageText: lastMsg?['text'] ?? 'No messages yet.',
      lastMessageAt: json['lastMessageAt'] != null ? DateTime.parse(json['lastMessageAt']) : null,
      otherParticipantName: otherName,
      otherParticipantRole: otherRole,
      unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
    );
  }
}
