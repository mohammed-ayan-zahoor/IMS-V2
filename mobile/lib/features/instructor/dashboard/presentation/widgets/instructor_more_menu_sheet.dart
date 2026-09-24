import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/core/localization/language_picker_sheet.dart';
import 'package:student_app/features/chat/presentation/screens/chat_screen.dart';
import 'package:student_app/features/instructor/calendar/presentation/screens/instructor_calendar_screen.dart';
import 'package:student_app/features/instructor/exams/presentation/screens/instructor_exams_screen.dart';
import 'package:student_app/features/instructor/exams/presentation/screens/question_bank_screen.dart';
import 'package:student_app/features/instructor/leaves/presentation/screens/instructor_leaves_screen.dart';
import 'package:student_app/features/instructor/materials/presentation/screens/instructor_materials_screen.dart';
import 'package:student_app/features/instructor/notices/presentation/screens/instructor_notices_screen.dart';
import 'package:student_app/features/instructor/exams/presentation/screens/offline_exams_screen.dart';
import 'package:student_app/features/notifications/presentation/screens/notifications_screen.dart';
import 'package:student_app/l10n/app_localizations.dart';

class InstructorMoreMenuSheet extends StatelessWidget {
  const InstructorMoreMenuSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const InstructorMoreMenuSheet(),
    );
  }

  void _navigate(BuildContext context, Widget screen) {
    Navigator.pop(context);
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final l10n = AppLocalizations.of(context);

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // Navy Header Card
          Container(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
            decoration: const BoxDecoration(
              color: Color(0xFF002045),
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: Column(
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Center(
                        child: Text(
                          auth.userFirstName.isNotEmpty ? auth.userFirstName[0].toUpperCase() : 'T',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            auth.userName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'Instructor Portal',
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Menu items list
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              children: [
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  child: Text(
                    'Academic Management',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.5),
                  ),
                ),
                _buildMenuItem(
                  icon: Icons.menu_book_rounded,
                  label: l10n?.studyMaterials ?? 'Study Materials',
                  color: const Color(0xFF2563EB),
                  onTap: () => _navigate(context, const InstructorMaterialsScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.campaign_rounded,
                  label: l10n?.noticesTitle ?? 'Notices & Announcements',
                  color: const Color(0xFFD97706),
                  onTap: () => _navigate(context, const InstructorNoticesScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.calendar_month_rounded,
                  label: l10n?.calendarTitle ?? 'School Calendar',
                  color: const Color(0xFF10B981),
                  onTap: () => _navigate(context, const InstructorCalendarScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.assignment_outlined,
                  label: l10n?.examsTitle ?? 'Exams & Grading',
                  color: const Color(0xFF7C3AED),
                  onTap: () => _navigate(context, const InstructorExamsScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.quiz_outlined,
                  label: l10n?.questionBankTitle ?? 'Question Bank',
                  color: const Color(0xFF0284C7),
                  onTap: () => _navigate(context, const QuestionBankScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.edit_note_rounded,
                  label: 'Offline Exams & Marks',
                  color: const Color(0xFF059669),
                  onTap: () => _navigate(context, const OfflineExamsScreen()),
                ),

                const SizedBox(height: 12),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  child: Text(
                    'Self Service & Communication',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.5),
                  ),
                ),
                _buildMenuItem(
                  icon: Icons.time_to_leave_rounded,
                  label: l10n?.leaveRequestsTitle ?? 'My Leave Requests (HR)',
                  color: const Color(0xFFE11D48),
                  onTap: () => _navigate(context, const InstructorLeavesScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.chat_bubble_outline_rounded,
                  label: 'Campus Messages',
                  color: const Color(0xFF0D9488),
                  onTap: () => _navigate(context, const ChatScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.notifications_none_rounded,
                  label: 'Notifications',
                  color: const Color(0xFFF59E0B),
                  onTap: () => _navigate(context, const NotificationsScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.language_rounded,
                  label: l10n?.changeLanguage ?? 'Change Language',
                  color: const Color(0xFF2563EB),
                  onTap: () {
                    Navigator.pop(context);
                    LanguagePickerSheet.show(context);
                  },
                ),

                const SizedBox(height: 16),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 8),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.logout_rounded, color: Color(0xFFEF4444), size: 20),
                  ),
                  title: Text(
                    l10n?.signOut ?? 'Sign Out',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFFEF4444)),
                  ),
                  onTap: () {
                    Navigator.pop(context);
                    auth.logout();
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      child: ListTile(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        tileColor: const Color(0xFFF8FAFC),
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        title: Text(
          label,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
        ),
        trailing: const Icon(Icons.chevron_right_rounded, size: 20, color: Color(0xFF94A3B8)),
        onTap: onTap,
      ),
    );
  }
}
