import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/features/chat/data/models/chat_model.dart';
import 'package:student_app/features/chat/presentation/providers/chat_provider.dart';
import 'individual_chat_screen.dart';

class ChatScreen extends StatefulWidget {
  final String? initialConversationId;
  const ChatScreen({super.key, this.initialConversationId});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final currentUserId = auth.user?['_id'] ?? auth.user?['id'] ?? '';
      if (currentUserId.isNotEmpty) {
        final chatProvider = Provider.of<ChatProvider>(context, listen: false);
        await chatProvider.loadConversations(currentUserId, refresh: true);
        chatProvider.startConversationPolling(currentUserId);
        // Deep-link from notification tap: open the specific conversation
        final targetId = widget.initialConversationId;
        if (targetId != null && targetId.isNotEmpty && mounted) {
          final conv = chatProvider.conversations
              .where((c) => c.id == targetId)
              .firstOrNull;
          if (conv != null) {
            chatProvider.selectConversation(conv, currentUserId);
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => IndividualChatScreen(conversation: conv),
              ),
            );
          }
        }
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    // Stop polling when leaving the chat list
    // ignore: use_build_context_synchronously
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    chatProvider.stopConversationPolling();
    super.dispose();
  }

  String _formatTime(DateTime? dt) {
    if (dt == null) return '';
    final now = DateTime.now();
    if (now.day == dt.day && now.month == dt.month && now.year == dt.year) {
      return DateFormat('h:mm a').format(dt);
    }
    return DateFormat('MMM d').format(dt);
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final currentUserId = auth.user?['_id'] ?? auth.user?['id'] ?? '';
    final chatProvider = Provider.of<ChatProvider>(context);

    final conversations = chatProvider.conversations.where((c) {
      if (_searchQuery.isEmpty) return true;
      return c.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          c.lastMessageText.toLowerCase().contains(_searchQuery.toLowerCase());
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FF),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0D1C2E)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Messages',
          style: GoogleFonts.hankenGrotesk(
            color: const Color(0xFF0D1C2E),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF0D1C2E)),
            onPressed: () => chatProvider.loadConversations(currentUserId, refresh: true),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Box
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFC4C6CF)),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  const Icon(Icons.search, color: Color(0xFF545F72)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      onChanged: (val) => setState(() => _searchQuery = val),
                      style: GoogleFonts.inter(fontSize: 14, color: const Color(0xFF0D1C2E)),
                      decoration: InputDecoration(
                        hintText: 'Search chats...',
                        hintStyle: GoogleFonts.inter(
                          color: const Color(0xFF545F72).withValues(alpha: 0.7),
                          fontSize: 14,
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Content
          Expanded(
            child: chatProvider.isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF002045)))
                : conversations.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        color: const Color(0xFF002045),
                        onRefresh: () => chatProvider.loadConversations(currentUserId, refresh: true),
                        child: ListView.separated(
                          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                          itemCount: conversations.length,
                          separatorBuilder: (context, index) => const Divider(
                            color: Color(0xFFC4C6CF),
                            height: 1,
                            indent: 76,
                          ),
                          itemBuilder: (context, index) {
                            final chat = conversations[index];
                            final timeStr = _formatTime(chat.lastMessageAt);

                            return ListTile(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              leading: CircleAvatar(
                                radius: 24,
                                backgroundColor: const Color(0xFFEFF4FF),
                                child: Icon(
                                  chat.type == 'batch' ? Icons.groups : Icons.person,
                                  color: const Color(0xFF002045),
                                  size: 24,
                                ),
                              ),
                              title: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      chat.title,
                                      style: GoogleFonts.hankenGrotesk(
                                        color: const Color(0xFF0D1C2E),
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: _getRoleBgColor(chat.otherParticipantRole),
                                      borderRadius: BorderRadius.circular(100),
                                    ),
                                    child: Text(
                                      (chat.type == 'batch' ? 'BATCH' : chat.otherParticipantRole).toUpperCase(),
                                      style: GoogleFonts.inter(
                                        color: _getRoleTextColor(chat.otherParticipantRole),
                                        fontSize: 8,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              subtitle: Padding(
                                padding: const EdgeInsets.only(top: 4.0),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        chat.lastMessageText,
                                        style: GoogleFonts.inter(
                                          color: chat.unreadCount > 0 ? const Color(0xFF0D1C2E) : const Color(0xFF545F72),
                                          fontWeight: chat.unreadCount > 0 ? FontWeight.w600 : FontWeight.normal,
                                          fontSize: 13,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Row(
                                      children: [
                                        Text(
                                          timeStr,
                                          style: GoogleFonts.inter(
                                            color: const Color(0xFF545F72),
                                            fontSize: 10,
                                          ),
                                        ),
                                        if (chat.unreadCount > 0) ...[
                                          const SizedBox(width: 6),
                                          Container(
                                            padding: const EdgeInsets.all(6),
                                            decoration: const BoxDecoration(
                                              color: Color(0xFF0056D2),
                                              shape: BoxShape.circle,
                                            ),
                                            child: Text(
                                              '${chat.unreadCount > 99 ? '99+' : chat.unreadCount}',
                                              style: GoogleFonts.inter(
                                                color: Colors.white,
                                                fontSize: 9,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              onTap: () {
                                chatProvider.selectConversation(chat, currentUserId);
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => IndividualChatScreen(
                                      conversation: chat,
                                    ),
                                  ),
                                );
                              },
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.forum_outlined, size: 54, color: Color(0xFFC4C6CF)),
            const SizedBox(height: 12),
            Text(
              'No conversations yet',
              style: GoogleFonts.hankenGrotesk(
                color: const Color(0xFF0D1C2E),
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Your direct chats with instructors and batch group messages will appear here.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }

  Color _getRoleBgColor(String role) {
    switch (role.toLowerCase()) {
      case 'admin':
      case 'super_admin':
        return const Color(0xFFEFF4FF);
      case 'teacher':
      case 'instructor':
        return const Color(0xFFD5E0F7);
      case 'student':
        return const Color(0xFFD4E4FC);
      default:
        return const Color(0xFFEFF4FF);
    }
  }

  Color _getRoleTextColor(String role) {
    switch (role.toLowerCase()) {
      case 'admin':
      case 'super_admin':
        return const Color(0xFF002045);
      case 'teacher':
      case 'instructor':
        return const Color(0xFF586377);
      case 'student':
        return const Color(0xFF43474e);
      default:
        return const Color(0xFF002045);
    }
  }
}
