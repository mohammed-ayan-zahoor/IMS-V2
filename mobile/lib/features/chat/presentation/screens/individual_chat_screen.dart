import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/features/chat/data/models/chat_model.dart';
import 'package:student_app/features/chat/presentation/providers/chat_provider.dart';

class IndividualChatScreen extends StatefulWidget {
  final ConversationModel conversation;

  const IndividualChatScreen({
    super.key,
    required this.conversation,
  });

  @override
  State<IndividualChatScreen> createState() => _IndividualChatScreenState();
}

class _IndividualChatScreenState extends State<IndividualChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  int _lastMessageCount = -1;
  ChatMessageModel? _replyingToMessage;
  // Key per message index for reply-tap scroll
  final Map<String, GlobalKey> _messageKeys = {};
  String? _highlightedMessageId;

  @override
  void initState() {
    super.initState();
    // Provider already polls messages every 4 seconds via _startPolling
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    }
  }

  Future<void> _handleSend(String currentUserId, ChatProvider chatProvider) async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    _controller.clear();
    final replyId = _replyingToMessage?.id;
    setState(() => _replyingToMessage = null);

    final success = await chatProvider.sendMessage(
      widget.conversation.id,
      text,
      currentUserId,
      replyToId: replyId,
    );

    if (success) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
    }
  }

  String _formatTime(DateTime dt) {
    return DateFormat('h:mm a').format(dt);
  }

  void _scrollToMessage(String messageId) {
    final key = _messageKeys[messageId];
    if (key?.currentContext == null) return;
    Scrollable.ensureVisible(
      key!.currentContext!,
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeInOut,
      alignment: 0.3,
    );
    setState(() => _highlightedMessageId = messageId);
    Future.delayed(const Duration(milliseconds: 1200), () {
      if (mounted) setState(() => _highlightedMessageId = null);
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final currentUserId = auth.user?['_id'] ?? auth.user?['id'] ?? '';
    final chatProvider = Provider.of<ChatProvider>(context);

    // Only scroll to bottom when message count actually increases
    if (chatProvider.activeMessages.length != _lastMessageCount) {
      _lastMessageCount = chatProvider.activeMessages.length;
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
    }

    return PopScope(
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) {
          chatProvider.leaveConversation();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8F9FF),
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0.5,
          leadingWidth: 40,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Color(0xFF0D1C2E)),
            onPressed: () {
              chatProvider.leaveConversation();
              Navigator.pop(context);
            },
          ),
          title: Row(
            children: [
              Stack(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: const Color(0xFFEFF4FF),
                    child: Icon(
                      widget.conversation.type == 'batch' ? Icons.groups : Icons.person,
                      color: const Color(0xFF002045),
                      size: 20,
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: const Color(0xFF22C55E),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 1.5),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.conversation.title,
                      style: GoogleFonts.hankenGrotesk(
                        color: const Color(0xFF0D1C2E),
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Row(
                      children: [
                        Text(
                          widget.conversation.type == 'batch'
                              ? 'Batch Group'
                              : widget.conversation.otherParticipantRole.toUpperCase(),
                          style: GoogleFonts.inter(
                            color: const Color(0xFF545F72),
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text('• Online', style: GoogleFonts.inter(color: const Color(0xFF22C55E), fontSize: 10, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh, color: Color(0xFF545F72), size: 22),
              onPressed: () => chatProvider.loadMessages(widget.conversation.id, currentUserId),
            ),
          ],
        ),
        body: Column(
          children: [
            // Message List Area
            Expanded(
              child: chatProvider.activeMessages.isEmpty
                  ? Center(
                      child: Text(
                        'No messages yet. Send a message below!',
                        style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 13),
                      ),
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16.0),
                      physics: const BouncingScrollPhysics(),
                      itemCount: chatProvider.activeMessages.length,
                      itemBuilder: (context, index) {
                        final msg = chatProvider.activeMessages[index];
                        _messageKeys.putIfAbsent(msg.id, () => GlobalKey());
                        final isHighlighted = _highlightedMessageId == msg.id;
                        return GestureDetector(
                          key: _messageKeys[msg.id],
                          onLongPress: () {
                            setState(() => _replyingToMessage = msg);
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            decoration: BoxDecoration(
                              color: isHighlighted
                                  ? const Color(0xFF002045).withValues(alpha: 0.08)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: _buildMessageBubble(msg),
                          ),
                        );
                      },
                    ),
            ),

            // Quoted Reply Preview Bar if user selected a message to reply to
            if (_replyingToMessage != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: const Color(0xFFEFF4FF),
                child: Row(
                  children: [
                    Container(
                      width: 4,
                      height: 36,
                      decoration: BoxDecoration(
                        color: const Color(0xFF002045),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Replying to ${_replyingToMessage!.senderName}',
                            style: GoogleFonts.inter(color: const Color(0xFF002045), fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            _replyingToMessage!.text,
                            style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 12),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 18, color: Color(0xFF545F72)),
                      onPressed: () => setState(() => _replyingToMessage = null),
                    ),
                  ],
                ),
              ),

            // Bottom Input Footer
            Container(
              padding: const EdgeInsets.only(left: 12, right: 12, top: 8, bottom: 24),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(color: Color(0xFFC4C6CF)),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8F9FF),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFC4C6CF)),
                      ),
                      child: TextField(
                        controller: _controller,
                        maxLines: 4,
                        minLines: 1,
                        style: GoogleFonts.inter(
                          color: const Color(0xFF0D1C2E),
                          fontSize: 14,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Type a message...',
                          hintStyle: GoogleFonts.inter(
                            color: const Color(0xFF545F72).withValues(alpha: 0.7),
                            fontSize: 14,
                          ),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: chatProvider.isSending ? null : () => _handleSend(currentUserId, chatProvider),
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: const BoxDecoration(
                        color: Color(0xFF002045),
                        shape: BoxShape.circle,
                      ),
                      child: chatProvider.isSending
                          ? const Padding(
                              padding: EdgeInsets.all(14.0),
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Icon(
                              Icons.send,
                              color: Colors.white,
                              size: 20,
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuotedReplyBox(String senderName, String replyText, {required bool isMe, String? replyToId}) {
    return GestureDetector(
      onTap: replyToId != null ? () => _scrollToMessage(replyToId) : null,
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: isMe ? Colors.white.withValues(alpha: 0.15) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
          border: Border(
            left: BorderSide(
              color: isMe ? Colors.white : const Color(0xFF002045),
              width: 3.5,
            ),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              senderName,
              style: GoogleFonts.inter(
                color: isMe ? Colors.white : const Color(0xFF002045),
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              replyText,
              style: GoogleFonts.inter(
                color: isMe ? Colors.white.withValues(alpha: 0.9) : const Color(0xFF475569),
                fontSize: 12,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessageModel msg) {
    final timeStr = _formatTime(msg.createdAt);
    final hasReply = msg.replyToText != null && msg.replyToText!.isNotEmpty;

    if (msg.isMe) {
      // OUTGOING bubble
      return Padding(
        padding: const EdgeInsets.only(bottom: 12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              constraints: const BoxConstraints(maxWidth: 270),
              decoration: const BoxDecoration(
                color: Color(0xFF002045),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(4),
                  bottomLeft: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (hasReply)
                    _buildQuotedReplyBox(
                      msg.replyToSenderName ?? 'Message',
                      msg.replyToText!,
                      isMe: true,
                      replyToId: msg.replyToId,
                    ),
                  Text(
                    msg.text,
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 2),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  timeStr,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF545F72),
                    fontSize: 10,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(
                  msg.isReadByOthers ? Icons.done_all : Icons.done,
                  color: msg.isReadByOthers ? const Color(0xFF0284C7) : const Color(0xFF94A3B8),
                  size: 14,
                ),
              ],
            ),
          ],
        ),
      );
    } else {
      // INCOMING bubble
      return Padding(
        padding: const EdgeInsets.only(bottom: 12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 4.0, bottom: 4),
              child: Text(
                '${msg.senderName.toUpperCase()} (${msg.senderRole.toUpperCase()})',
                style: GoogleFonts.inter(
                  color: const Color(0xFF002045),
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              constraints: const BoxConstraints(maxWidth: 270),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: const Color(0xFFC4C6CF)),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(4),
                  topRight: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (hasReply)
                    _buildQuotedReplyBox(
                      msg.replyToSenderName ?? 'Message',
                      msg.replyToText!,
                      isMe: false,
                      replyToId: msg.replyToId,
                    ),
                  Text(
                    msg.text,
                    style: GoogleFonts.inter(
                      color: const Color(0xFF0D1C2E),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 2),
            Padding(
              padding: const EdgeInsets.only(left: 4.0),
              child: Text(
                timeStr,
                style: GoogleFonts.inter(
                  color: const Color(0xFF545F72),
                  fontSize: 10,
                ),
              ),
            ),
          ],
        ),
      );
    }
  }
}
