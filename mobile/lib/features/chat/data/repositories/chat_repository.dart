import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/chat/data/models/chat_model.dart';

class ChatRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<ConversationModel>> fetchConversations(String currentUserId) async {
    try {
      final response = await _apiClient.get(ApiEndpoints.conversations);
      if (response.statusCode == 200 && response.data != null && response.data['conversations'] is List) {
        return (response.data['conversations'] as List)
            .map((c) => ConversationModel.fromJson(c, currentUserId))
            .toList();
      }
    } catch (e) {
      print('ChatRepository fetchConversations error: $e');
    }
    return [];
  }

  Future<List<ChatMessageModel>> fetchMessages(String conversationId, String currentUserId) async {
    try {
      final url = '${ApiEndpoints.messages}?conversationId=$conversationId';
      final response = await _apiClient.get(url);
      if (response.statusCode == 200 && response.data != null && response.data['messages'] is List) {
        return (response.data['messages'] as List)
            .map((m) => ChatMessageModel.fromJson(m, currentUserId))
            .toList();
      }
    } catch (e) {
      print('ChatRepository fetchMessages error: $e');
    }
    return [];
  }

  Future<ChatMessageModel?> sendMessage({
    required String conversationId,
    required String text,
    required String currentUserId,
    String? replyToId,
  }) async {
    try {
      final payload = <String, dynamic>{
        'conversationId': conversationId,
        'text': text,
      };
      if (replyToId != null && replyToId.isNotEmpty) {
        payload['replyTo'] = replyToId;
      }
      final response = await _apiClient.post(
        ApiEndpoints.messages,
        data: payload,
      );

      if ((response.statusCode == 200 || response.statusCode == 201) && response.data != null) {
        final msgData = response.data['message'] as Map<String, dynamic>?;
        if (msgData != null) {
          return ChatMessageModel.fromJson(msgData, currentUserId);
        }
      }
    } catch (e) {
      print('ChatRepository sendMessage error: $e');
    }
    return null;
  }

  Future<bool> markAsRead(String conversationId) async {
    try {
      final response = await _apiClient.post('${ApiEndpoints.conversations}/$conversationId/read');
      return response.statusCode == 200;
    } catch (e) {
      print('ChatRepository markAsRead error: $e');
    }
    return false;
  }
}
