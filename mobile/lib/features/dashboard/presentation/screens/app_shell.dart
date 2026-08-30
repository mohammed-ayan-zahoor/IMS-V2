import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_app/features/dashboard/presentation/screens/dashboard_screen.dart';
import 'package:student_app/features/attendance/presentation/screens/attendance_screen.dart';
import 'package:student_app/features/timetable/presentation/screens/timetable_screen.dart';
import 'package:student_app/features/profile/presentation/screens/profile_screen.dart';
import 'package:student_app/features/fees/presentation/screens/fees_screen.dart';
import 'package:student_app/features/notices/presentation/screens/notices_screen.dart';
import 'package:student_app/features/materials/presentation/screens/learning_materials_screen.dart';
import 'package:student_app/features/practice/presentation/screens/practice_screen.dart';
import 'package:student_app/features/exams/presentation/screens/exams_screen.dart';
import 'package:student_app/features/vault/presentation/screens/vault_screen.dart';
import 'package:student_app/features/chat/presentation/screens/chat_screen.dart';
import 'package:student_app/features/timeline/presentation/screens/timeline_screen.dart';
import 'package:student_app/features/notifications/presentation/screens/notifications_screen.dart';

import 'package:provider/provider.dart';
import 'package:student_app/core/providers/academic_session_provider.dart';
import 'package:student_app/core/services/app_update_service.dart';

class AppShell extends StatefulWidget {
  final int initialIndex;
  const AppShell({super.key, this.initialIndex = 0});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  late int _currentIndex;
  late PageController _pageController;

  final List<Widget> _screens = const [
    DashboardScreen(),
    AttendanceScreen(),
    TimetableScreen(),
    ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pageController = PageController(initialPage: _currentIndex);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AcademicSessionProvider>().loadSessions();
      AppUpdateService.instance.checkForUpdates(context);
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onTabTapped(int index) {
    if (index == 4) {
      _showMoreBottomSheet(context);
    } else {
      setState(() {
        _currentIndex = index;
      });
      _pageController.animateToPage(
        index,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _showMoreBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFC4C6CF),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Student Portals & Services',
                  style: GoogleFonts.hankenGrotesk(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF002045),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Access your academic tools and resources',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: const Color(0xFF545F72),
                  ),
                ),
                const SizedBox(height: 20),
                GridView.count(
                  shrinkWrap: true,
                  crossAxisCount: 3,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 0.82,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    _buildMoreItem(context, 'Fees &\nPayments', Icons.receipt_long_outlined, const Color(0xFF059669), const FeesScreen()),
                    _buildMoreItem(context, 'Notices', Icons.campaign_outlined, const Color(0xFF2563EB), const NoticesScreen()),
                    _buildMoreItem(context, 'Timeline', Icons.auto_awesome_outlined, const Color(0xFF7C3AED), const TimelineScreen()),
                    _buildMoreItem(context, 'Materials', Icons.menu_book_outlined, const Color(0xFFD97706), const LearningMaterialsScreen()),
                    _buildMoreItem(context, 'Practice', Icons.quiz_outlined, const Color(0xFF6366F1), const PracticeScreen()),
                    _buildMoreItem(context, 'Exams', Icons.assignment_outlined, const Color(0xFFDC2626), const ExamsScreen()),
                    _buildMoreItem(context, 'Document\nVault', Icons.folder_shared_outlined, const Color(0xFF0284C7), const VaultScreen()),
                    _buildMoreItem(context, 'Messages', Icons.chat_bubble_outline, const Color(0xFF0F766E), const ChatScreen()),
                    _buildMoreItem(context, 'Notifications', Icons.notifications_outlined, const Color(0xFF002045), const NotificationsScreen()),
                  ],
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMoreItem(BuildContext context, String title, IconData icon, Color color, Widget targetScreen) {
    return InkWell(
      onTap: () {
        Navigator.pop(context);
        Navigator.push(context, MaterialPageRoute(builder: (_) => targetScreen));
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFEFF4FF),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFC4C6CF).withValues(alpha: 0.5)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 6),
            Text(
              title,
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF0D1C2E),
                height: 1.1,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: PageView(
        controller: _pageController,
        physics: const NeverScrollableScrollPhysics(), // Disables swipe gesture so bottom navigation controls it exclusively
        children: _screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: _onTabTapped,
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        selectedItemColor: const Color(0xFF002045),
        unselectedItemColor: const Color(0xFF545F72),
        selectedLabelStyle: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold),
        unselectedLabelStyle: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w500),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.grid_view_rounded), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_today_rounded), label: 'Attendance'),
          BottomNavigationBarItem(icon: Icon(Icons.schedule_rounded), label: 'Schedule'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline_rounded), label: 'Profile'),
          BottomNavigationBarItem(icon: Icon(Icons.more_horiz_rounded), label: 'More'),
        ],
      ),
    );
  }
}
