import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/features/fees/presentation/screens/fees_screen.dart';
import 'package:student_app/features/notices/presentation/screens/notices_screen.dart';
import 'package:student_app/features/timeline/presentation/screens/timeline_screen.dart';
import 'package:student_app/features/materials/presentation/screens/learning_materials_screen.dart';
import 'package:student_app/features/practice/presentation/screens/practice_screen.dart';
import 'package:student_app/features/exams/presentation/screens/exams_screen.dart';
import 'package:student_app/features/vault/presentation/screens/vault_screen.dart';
import 'package:student_app/features/library/presentation/screens/my_library_screen.dart';
import 'package:student_app/features/chat/presentation/screens/chat_screen.dart';
import 'package:student_app/features/notifications/presentation/screens/notifications_screen.dart';
import 'package:student_app/features/profile/presentation/screens/profile_screen.dart';

class HeaderCurveClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final path = Path();
    path.lineTo(0, size.height - 24);
    // Smooth convex dip downwards in center
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

class MoreMenuSheet extends StatelessWidget {
  const MoreMenuSheet({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const MoreMenuSheet(),
    );
  }

  void _navigateTo(BuildContext context, Widget screen) {
    Navigator.pop(context);
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
  }

  Future<void> _handleSignOut(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Sign Out',
          style: GoogleFonts.hankenGrotesk(fontWeight: FontWeight.bold, color: const Color(0xFF0D1C2E)),
        ),
        content: Text(
          'Are you sure you want to sign out of your student account?',
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
              'Sign Out',
              style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );

    if (confirm == true && context.mounted) {
      Navigator.pop(context);
      await Provider.of<AuthProvider>(context, listen: false).logout();
    }
  }

  void _showHelpDialog(BuildContext context, String instituteName, String instituteCode) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: const BoxDecoration(
                color: Color(0xFFEFF4FF),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.info_outline, color: Color(0xFF002045), size: 20),
            ),
            const SizedBox(width: 12),
            Text(
              'Student Support',
              style: GoogleFonts.hankenGrotesk(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              instituteName,
              style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14, color: const Color(0xFF0D1C2E)),
            ),
            const SizedBox(height: 4),
            Text(
              'Campus Code: $instituteCode',
              style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF545F72)),
            ),
            const SizedBox(height: 12),
            Text(
              'Need assistance with courses, exams, or fee receipts? Please reach out to your institute administration or advisor.',
              style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF545F72), height: 1.4),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF002045),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Close', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;

    final String studentName = auth.userName;
    final String avatarUrl = auth.userAvatar;
    final String instituteName = user?['institute']?['name'] ?? 'Quantech';
    final String instituteCode = user?['institute']?['code'] ?? 'IMS';
    final bool isCollege = auth.isCollege;

    final String initials = studentName.trim().isNotEmpty
        ? studentName.trim().split(' ').where((e) => e.isNotEmpty).map((e) => e[0]).take(2).join('').toUpperCase()
        : 'ST';

    final String subtitle = isCollege
        ? 'Enrolled Scholar • Higher Education'
        : 'Active Student • Learning & Growing';

    return Container(
      height: mediaQuery.size.height * 0.90,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          // 1. Curved Brand Navy Header
          ClipPath(
            clipper: HeaderCurveClipper(),
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
                            const Icon(Icons.bubble_chart_rounded, color: Colors.white, size: 22),
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
                    padding: const EdgeInsets.all(3.5), // Double-ring effect
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [
                          Colors.white,
                          Colors.white.withValues(alpha: 0.6),
                          const Color(0xFF60A5FA).withValues(alpha: 0.8), // Soft electric blue rim
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
                                errorBuilder: (_, __, ___) => _buildInitials(initials),
                              )
                            : _buildInitials(initials),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Student Name
                  Text(
                    studentName,
                    textAlign: TextAlign.center,
                    style: GoogleFonts.hankenGrotesk(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),

                  // Tagline
                  Text(
                    subtitle,
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 2. Scrollable Body List
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              children: [
                // General Section
                _buildSectionHeader('General'),
                const SizedBox(height: 8),

                _buildMenuItem(
                  icon: Icons.receipt_long_outlined,
                  title: 'Fees & Payments',
                  onTap: () => _navigateTo(context, const FeesScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.assignment_outlined,
                  title: isCollege ? 'Exams & Assessments' : 'Exams & Tests',
                  onTap: () => _navigateTo(context, const ExamsScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.menu_book_outlined,
                  title: isCollege ? 'Module Resources' : 'Learning Materials',
                  isHighlighted: true, // Freud-style subtle pill highlight
                  onTap: () => _navigateTo(context, const LearningMaterialsScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.local_library_outlined,
                  title: 'Digital Library Card',
                  onTap: () => _navigateTo(context, const MyLibraryScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.quiz_outlined,
                  title: 'Practice & Quizzes',
                  onTap: () => _navigateTo(context, const PracticeScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.campaign_outlined,
                  title: 'Notices & Circulars',
                  onTap: () => _navigateTo(context, const NoticesScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.auto_awesome_outlined,
                  title: 'Academic Timeline',
                  onTap: () => _navigateTo(context, const TimelineScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.chat_bubble_outline,
                  title: 'Campus Messages',
                  onTap: () => _navigateTo(context, const ChatScreen()),
                ),

                const SizedBox(height: 12),
                const Divider(color: Color(0xFFF1F5F9), height: 1, thickness: 1),
                const SizedBox(height: 16),

                // Profile Section
                _buildSectionHeader('Profile'),
                const SizedBox(height: 8),

                _buildMenuItem(
                  icon: Icons.folder_shared_outlined,
                  title: 'Document Vault',
                  onTap: () => _navigateTo(context, const VaultScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.notifications_none_rounded,
                  title: 'Notifications',
                  onTap: () => _navigateTo(context, const NotificationsScreen()),
                ),
                _buildMenuItem(
                  icon: Icons.person_outline_rounded,
                  title: 'Student Profile & Details',
                  onTap: () => _navigateTo(context, const ProfileScreen()),
                ),

                const SizedBox(height: 12),
                const Divider(color: Color(0xFFF1F5F9), height: 1, thickness: 1),
                const SizedBox(height: 14),

                // Sign Out
                _buildMenuItem(
                  icon: Icons.logout_rounded,
                  title: 'Sign Out',
                  iconColor: const Color(0xFFF43F5E),
                  textColor: const Color(0xFFF43F5E),
                  onTap: () => _handleSignOut(context),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),

          // 3. Bottom Footer Pills (Freud style: Olive button & Outlined button)
          Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Colors.grey.withValues(alpha: 0.15))),
            ),
            child: Row(
              children: [
                // Left: Olive Green Pill
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _navigateTo(context, const ProfileScreen()),
                    icon: const Icon(Icons.auto_awesome, size: 16, color: Colors.white),
                    label: Text(
                      'Digital ID ✨',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF002045), // Brand primary deep navy
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),

                // Right: Outlined Pill
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _showHelpDialog(context, instituteName, instituteCode),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.2),
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                    ),
                    child: Text(
                      'Help & Support',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF1E293B),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInitials(String initials) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Color(0xFF1E3A8A),
            Color(0xFF0F172A),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: GoogleFonts.hankenGrotesk(
          color: Colors.white,
          fontSize: 26,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.0,
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: GoogleFonts.hankenGrotesk(
        fontSize: 14,
        fontWeight: FontWeight.bold,
        color: const Color(0xFF0F172A),
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    bool isHighlighted = false,
    Color? iconColor,
    Color? textColor,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(28),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            border: isHighlighted
                ? Border.all(color: const Color(0xFFE2E8F0), width: 1.2)
                : null,
            color: isHighlighted ? const Color(0xFFFAFAFA) : Colors.transparent,
          ),
          child: Row(
            children: [
              Icon(icon, size: 20, color: iconColor ?? const Color(0xFF1E293B)),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  title,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: textColor ?? const Color(0xFF0F172A),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
