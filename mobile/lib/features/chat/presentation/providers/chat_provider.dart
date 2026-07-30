import 'dart:async';
import 'package:flutter/material.dart';
import 'package:student_app/features/chat/data/models/chat_model.dart';
import 'package:student_app/features/chat/data/repositories/chat_repository.dart';

class ChatProvider extends ChangeNotifier {
  final ChatRepository _repository = ChatRepository();

  bool _isLoading = false;
  String? _errorMessage;
  List<ConversationModel> _conversations = [];

  ConversationModel? _activeConversation;
  List<ChatMessageModel> _activeMessages = [];
  bool _isSending = false;

  Timer? _pollingTimer;
  Timer? _conversationTimer;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<ConversationModel> get conversations => _conversations;
  ConversationModel? get activeConversation => _activeConversation;
  List<ChatMessageModel> get activeMessages => _activeMessages;
  bool get isSending => _isSending;

  Future<void> loadConversations(String currentUserId, {bool refresh = false}) async {
    if (_conversations.isNotEmpty && !refresh) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _conversations = await _repository.fetchConversations(currentUserId);
    } catch (e) {
      _errorMessage = 'Failed to load conversations.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> selectConversation(ConversationModel conv, String currentUserId) async {
    _activeConversation = conv;
    _activeMessages = [];
    notifyListeners();

    await _repository.markAsRead(conv.id);
    await loadMessages(conv.id, currentUserId);
    _startPolling(conv.id, currentUserId);
  }

  Future<void> loadMessages(String conversationId, String currentUserId) async {
    try {
      final msgs = await _repository.fetchMessages(conversationId, currentUserId);
      _activeMessages = msgs;
      notifyListeners();
    } catch (e) {
      print('ChatProvider loadMessages error: $e');
    }
  }

  Future<bool> sendMessage(String conversationId, String text, String currentUserId, {String? replyToId}) async {
    if (text.trim().isEmpty) return false;

    _isSending = true;
    notifyListeners();

    final newMsg = await _repository.sendMessage(
      conversationId: conversationId,
      text: text.trim(),
      currentUserId: currentUserId,
      replyToId: replyToId,
    );

    _isSending = false;
    if (newMsg != null) {
      _activeMessages.add(newMsg);
      notifyListeners();
      loadConversations(currentUserId, refresh: true);
      return true;
    }
    notifyListeners();
    return false;
  }

  void _startPolling(String conversationId, String currentUserId) {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (_activeConversation?.id == conversationId) {
        loadMessages(conversationId, currentUserId);
      }
    });
  }

  /// Call from ChatScreen initState to keep the conversation list fresh.
  void startConversationPolling(String currentUserId) {
    _conversationTimer?.cancel();
    _conversationTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      loadConversations(currentUserId, refresh: true);
    });
  }

  void stopConversationPolling() {
    _conversationTimer?.cancel();
  }

  void leaveConversation() {
    _pollingTimer?.cancel();
    _activeConversation = null;
    _activeMessages = [];
    notifyListeners();
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _conversationTimer?.cancel();
    super.dispose();
  }
}
