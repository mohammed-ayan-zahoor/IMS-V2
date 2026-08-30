import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:student_app/features/notifications/presentation/providers/notifications_provider.dart';
import 'package:student_app/features/notifications/data/models/app_notification_model.dart';
import 'package:student_app/features/attendance/presentation/screens/attendance_screen.dart';
import 'package:student_app/features/fees/presentation/screens/fees_screen.dart';
import 'package:student_app/features/notices/presentation/screens/notices_screen.dart';
import 'package:student_app/features/timeline/presentation/screens/timeline_screen.dart';
import 'package:student_app/features/chat/presentation/screens/chat_screen.dart';
import 'package:student_app/features/notifications/presentation/widgets/empty_notifications_view.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  Color _getTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'attendance':
        return const Color(0xFF059669); // Emerald
      case 'fee_payment':
        return const Color(0xFF059669); // Emerald for receipt
      case 'fee_due':
      case 'fee':
        return const Color(0xFFDC2626); // Crimson/Red
      case 'notice':
        return const Color(0xFF2563EB); // Blue
      case 'timeline':
        return const Color(0xFF7C3AED); // Purple
      case 'birthday':
        return const Color(0xFFD97706); // Amber
      case 'chat':
        return const Color(0xFF0F766E); // Teal
      default:
        return const Color(0xFF002045);
    }
  }

  IconData _getTypeIcon(String type) {
    switch (type.toLowerCase()) {
      case 'attendance':
        return Icons.calendar_today_rounded;
      case 'fee_payment':
        return Icons.receipt_long_rounded;
      case 'fee_due':
      case 'fee':
        return Icons.receipt_long_rounded;
      case 'notice':
        return Icons.campaign_rounded;
      case 'timeline':
        return Icons.auto_awesome_rounded;
      case 'birthday':
        return Icons.cake_rounded;
      case 'chat':
        return Icons.chat_bubble_rounded;
      default:
        return Icons.notifications_rounded;
    }
  }

  String _formatTime(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24 && now.day == date.day) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 2) {
      return 'Yesterday';
    } else {
      return DateFormat('MMM d, h:mm a').format(date);
    }
  }

  void _handleNotificationTap(BuildContext context, AppNotificationModel notif) {
    // Mark as read
    context.read<NotificationsProvider>().markAsRead(notif.id);

    // Deep-link to appropriate screen
    final type = notif.type.toLowerCase();
    switch (type) {
      case 'attendance':
        Navigator.push(context, MaterialPageRoute(builder: (_) => const AttendanceScreen()));
        break;
      case 'fee_due':
      case 'fee':
      case 'fee_payment':
        Navigator.push(context, MaterialPageRoute(builder: (_) => const FeesScreen()));
        break;
      case 'notice':
        Navigator.push(context, MaterialPageRoute(builder: (_) => const NoticesScreen()));
        break;
      case 'timeline':
        Navigator.push(context, MaterialPageRoute(builder: (_) => const TimelineScreen()));
        break;
      case 'chat':
        final convId = notif.data['conversationId']?.toString();
        Navigator.push(context, MaterialPageRoute(builder: (_) => ChatScreen(initialConversationId: convId)));
        break;
      default:
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF002045)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Notifications',
          style: GoogleFonts.hankenGrotesk(
            color: const Color(0xFF0D1C2E),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: [
          Consumer<NotificationsProvider>(
            builder: (context, provider, _) {
              if (provider.notifications.isEmpty) return const SizedBox.shrink();
              return PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert_rounded, color: Color(0xFF002045)),
                onSelected: (value) {
                  if (value == 'read_all') {
                    provider.markAllAsRead();
                  } else if (value == 'clear_all') {
                    provider.clearAll();
                  }
                },
                itemBuilder: (context) => [
                  PopupMenuItem(
                    value: 'read_all',
                    child: Row(
                      children: [
                        const Icon(Icons.done_all_rounded, size: 18, color: Color(0xFF002045)),
                        const SizedBox(width: 10),
                        Text('Mark all as read', style: GoogleFonts.inter(fontSize: 13)),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'clear_all',
                    child: Row(
                      children: [
                        const Icon(Icons.delete_outline_rounded, size: 18, color: Colors.red),
                        const SizedBox(width: 10),
                        Text('Clear all history', style: GoogleFonts.inter(fontSize: 13, color: Colors.red)),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
      body: Consumer<NotificationsProvider>(
        builder: (context, provider, _) {
          final categories = [
            {'id': 'all', 'label': 'All'},
            {'id': 'attendance', 'label': 'Attendance'},
            {'id': 'fee_due', 'label': 'Fees'},
            {'id': 'notice', 'label': 'Notices'},
            {'id': 'timeline', 'label': 'Timeline'},
            {'id': 'birthday', 'label': 'Birthdays'},
          ];

          return Column(
            children: [
              // Category Filter Bar
              Container(
                color: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: categories.map((cat) {
                      final isSelected = provider.selectedCategory == cat['id'];
                      return Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: FilterChip(
                          label: Text(cat['label']!),
                          selected: isSelected,
                          onSelected: (_) => provider.setCategory(cat['id']!),
                          selectedColor: const Color(0xFF002045),
                          backgroundColor: const Color(0xFFF1F5F9),
                          labelStyle: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            color: isSelected ? Colors.white : const Color(0xFF475569),
                          ),
                          checkmarkColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),

              // Notification List
              Expanded(
                child: provider.filteredNotifications.isEmpty
                    ? EmptyNotificationsView(
                        onCheckAgain: () => provider.loadNotifications(),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        itemCount: provider.filteredNotifications.length,
                        itemBuilder: (context, index) {
                          final notif = provider.filteredNotifications[index];
                          final color = _getTypeColor(notif.type);
                          final icon = _getTypeIcon(notif.type);

                          return Dismissible(
                            key: Key(notif.id),
                            direction: DismissDirection.endToStart,
                            background: Container(
                              alignment: Alignment.centerRight,
                              padding: const EdgeInsets.only(right: 20),
                              decoration: BoxDecoration(
                                color: Colors.red.shade400,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: const Icon(Icons.delete_outline_rounded, color: Colors.white),
                            ),
                            onDismissed: (_) => provider.deleteNotification(notif.id),
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              decoration: BoxDecoration(
                                color: notif.isRead ? Colors.white : const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: notif.isRead
                                      ? const Color(0xFFE2E8F0)
                                      : color.withValues(alpha: 0.35),
                                  width: notif.isRead ? 1 : 1.5,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.02),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(16),
                                  onTap: () => _handleNotificationTap(context, notif),
                                  child: Padding(
                                    padding: const EdgeInsets.all(14.0),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        // Icon Avatar
                                        Container(
                                          width: 42,
                                          height: 42,
                                          decoration: BoxDecoration(
                                            color: color.withValues(alpha: 0.1),
                                            shape: BoxShape.circle,
                                          ),
                                          child: Icon(icon, color: color, size: 20),
                                        ),
                                        const SizedBox(width: 12),

                                        // Text Details
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                children: [
                                                  Expanded(
                                                    child: Text(
                                                      notif.title,
                                                      style: GoogleFonts.hankenGrotesk(
                                                        fontSize: 14,
                                                        fontWeight: notif.isRead
                                                            ? FontWeight.bold
                                                            : FontWeight.w900,
                                                        color: const Color(0xFF0F172A),
                                                      ),
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                    ),
                                                  ),
                                                  const SizedBox(width: 8),
                                                  Text(
                                                    _formatTime(notif.timestamp),
                                                    style: GoogleFonts.inter(
                                                      fontSize: 11,
                                                      fontWeight: FontWeight.w500,
                                                      color: const Color(0xFF94A3B8),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                notif.body,
                                                style: GoogleFonts.inter(
                                                  fontSize: 12.5,
                                                  color: const Color(0xFF475569),
                                                  height: 1.35,
                                                ),
                                                maxLines: 3,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ],
                                          ),
                                        ),

                                        // Unread Indicator Dot
                                        if (!notif.isRead) ...[
                                          const SizedBox(width: 8),
                                          Container(
                                            width: 8,
                                            height: 8,
                                            margin: const EdgeInsets.only(top: 6),
                                            decoration: BoxDecoration(
                                              color: color,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}
