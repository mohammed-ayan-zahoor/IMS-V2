import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/core/localization/language_picker_sheet.dart';
import 'package:student_app/features/chat/presentation/screens/chat_screen.dart';
import 'package:student_app/features/instructor/calendar/presentation/screens/instructor_calendar_screen.dart';
import 'package:student_app/features/instructor/exams/presentation/screens/instructor_exams_screen.dart';
import 'package:student_app/features/instructor/exams/presentation/screens/offline_exams_screen.dart';
import 'package:student_app/features/instructor/exams/presentation/screens/question_bank_screen.dart';
import 'package:student_app/features/instructor/syllabus/presentation/screens/instructor_syllabus_screen.dart';
import 'package:student_app/features/instructor/leaves/presentation/screens/instructor_leaves_screen.dart';
import 'package:student_app/features/instructor/materials/presentation/screens/instructor_materials_screen.dart';
import 'package:student_app/features/instructor/notices/presentation/screens/instructor_notices_screen.dart';
import 'package:student_app/features/notifications/presentation/screens/notifications_screen.dart';
import 'package:student_app/l10n/app_localizations.dart';

class InstructorHeaderCurveClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final path = Path();
    path.lineTo(0, size.height - 24);
    path.quadraticBezierTo(
      size.width / 2,
      size.height + 14,
      size.width,
      size.height - 24,
    );
    path.lineTo(size.width, 0);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => false;
}

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

  Future<void> _handleSignOut(BuildContext context, AuthProvider auth, AppLocalizations? l10n) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          l10n?.signOut ?? 'Sign Out',
          style: GoogleFonts.hankenGrotesk(fontWeight: FontWeight.bold, color: const Color(0xFF0D1C2E)),
        ),
        content: Text(
          'Are you sure you want to sign out of your instructor account?',
          style: GoogleFonts.inter(color: const Color(0xFF545F72)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: GoogleFonts.inter(color: const Color(0xFF545F72))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text(
              l10n?.signOut ?? 'Sign Out',
              style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );

    if (confirm == true && context.mounted) {
      Navigator.pop(context);
      await auth.logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final auth = context.watch<AuthProvider>();
    final l10n = AppLocalizations.of(context);
    final user = auth.user;

    final String teacherName = auth.userName;
    final String avatarUrl = auth.userAvatar;
    final String instituteName = user?['institute']?['name'] ?? 'Quantech';

    final String initials = teacherName.trim().isNotEmpty
        ? teacherName.trim().split(' ').where((e) => e.isNotEmpty).map((e) => e[0]).take(2).join('').toUpperCase()
        : 'TR';

    return Container(
      height: mediaQuery.size.height * 0.90,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          // 1. Curved Brand Navy Header (Matches Student MoreMenuSheet)
          ClipPath(
            clipper: InstructorHeaderCurveClipper(),
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Color(0xFF002045), // Deep brand navy
                    Color(0xFF0D2D59), // Rich navy slate
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 36),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Top Brand Bar with Close Icon
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            const Icon(Icons.school_rounded, color: Colors.white, size: 22),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                instituteName,
                                style: GoogleFonts.hankenGrotesk(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.2,
                                  height: 1.2,
                                ),
                                softWrap: true,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white, size: 22),
                        onPressed: () => Navigator.pop(context),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Enhanced Profile Avatar with Glow & Gradient Ring
                  Container(
                    width: 84,
                    height: 84,
                    padding: const EdgeInsets.all(3.5),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [
                          Colors.white,
                          Colors.white.withValues(alpha: 0.6),
                          const Color(0xFF60A5FA).withValues(alpha: 0.8),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.35),
                          blurRadius: 12,
                          offset: const Offset(0, 5),
                        ),
                        BoxShadow(
                          color: const Color(0xFF2563EB).withValues(alpha: 0.25),
                          blurRadius: 16,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: Container(
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Color(0xFF0F172A),
                      ),
                      child: ClipOval(
                        child: avatarUrl.isNotEmpty
                            ? Image.network(
                                avatarUrl,
                                fit: BoxFit.cover,
                                errorBuilder: (ctx, err, stack) => _buildInitials(initials),
                              )
                            : _buildInitials(initials),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Teacher Name & Designation
                  Text(
                    teacherName,
                    style: GoogleFonts.hankenGrotesk(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Faculty Member • Academic Instructor',
                    style: GoogleFonts.inter(
                      color: const Color(0xFF94A3B8),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Menu Items List
          Expanded(
            child: ListView(
              padding: const EdgeInsets.only(top: 8, bottom: 32),
              children: [
                _buildSectionHeader('ACADEMIC MANAGEMENT'),
                _buildMenuItem(
                  icon: Icons.menu_book_outlined,
                  label: l10n?.studyMaterials ?? 'Study Materials',
                  onTap: () => _navigate(context, const InstructorMaterialsScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.campaign_outlined,
                  label: l10n?.noticesTitle ?? 'Notices & Announcements',
                  onTap: () => _navigate(context, const InstructorNoticesScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.calendar_today_outlined,
                  label: l10n?.calendarTitle ?? 'School Calendar',
                  onTap: () => _navigate(context, const InstructorCalendarScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.assignment_outlined,
                  label: l10n?.examsTitle ?? 'Online Exams & Grading',
                  onTap: () => _navigate(context, const InstructorExamsScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.quiz_outlined,
                  label: l10n?.questionBankTitle ?? 'Question Bank',
                  onTap: () => _navigate(context, const QuestionBankScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.edit_note_rounded,
                  label: 'Offline Exams & Marks',
                  onTap: () => _navigate(context, const OfflineExamsScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.auto_stories_outlined,
                  label: 'Syllabus & Curriculum',
                  onTap: () => _navigate(context, const InstructorSyllabusScreen()),
                ),

                _buildSectionHeader('SELF SERVICE & COMMUNICATION'),
                _buildMenuItem(
                  icon: Icons.time_to_leave_outlined,
                  label: l10n?.leaveRequestsTitle ?? 'My Leave Requests (HR)',
                  onTap: () => _navigate(context, const InstructorLeavesScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.chat_bubble_outline_rounded,
                  label: 'Campus Messages',
                  onTap: () => _navigate(context, const ChatScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.notifications_none_rounded,
                  label: 'Notifications',
                  onTap: () => _navigate(context, const NotificationsScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.language_rounded,
                  label: l10n?.changeLanguage ?? 'Change Language',
                  onTap: () {
                    Navigator.pop(context);
                    LanguagePickerSheet.show(context);
                  },
                ),

                const SizedBox(height: 8),
                _buildMenuItem(
                  icon: Icons.logout_rounded,
                  label: l10n?.signOut ?? 'Sign Out',
                  iconColor: const Color(0xFFDC2626),
                  textColor: const Color(0xFFDC2626),
                  showChevron: false,
                  showDivider: false,
                  onTap: () => _handleSignOut(context, auth, l10n),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 20, right: 20, top: 22, bottom: 8),
      child: Text(
        title,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF6B7280),
          letterSpacing: 0.6,
        ),
      ),
    );
  }

  Widget _buildInitials(String initials) {
    return Center(
      child: Text(
        initials,
        style: GoogleFonts.hankenGrotesk(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 24,
        ),
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool showDivider = true,
    Color? iconColor,
    Color? textColor,
    bool showChevron = true,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        InkWell(
          onTap: onTap,
          splashColor: const Color(0xFF002045).withValues(alpha: 0.05),
          highlightColor: const Color(0xFF002045).withValues(alpha: 0.03),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 22,
                  color: iconColor ?? const Color(0xFF374151),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    label,
                    style: GoogleFonts.inter(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w500,
                      color: textColor ?? const Color(0xFF111827),
                    ),
                  ),
                ),
                if (showChevron)
                  const Icon(
                    Icons.chevron_right_rounded,
                    size: 20,
                    color: Color(0xFF9CA3AF),
                  ),
              ],
            ),
          ),
        ),
        if (showDivider)
          const Divider(
            height: 1,
            thickness: 1,
            color: Color(0xFFE5E7EB),
            indent: 20,
            endIndent: 20,
          ),
      ],
    );
  }
}
