import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_app/features/dashboard/presentation/screens/dashboard_screen.dart';
import 'package:student_app/features/attendance/presentation/screens/attendance_screen.dart';
import 'package:student_app/features/timetable/presentation/screens/timetable_screen.dart';
import 'package:student_app/features/profile/presentation/screens/profile_screen.dart';
import 'package:student_app/features/dashboard/presentation/widgets/more_menu_sheet.dart';
import 'package:student_app/l10n/app_localizations.dart';

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
    MoreMenuSheet.show(context);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

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
        items: [
          BottomNavigationBarItem(icon: const Icon(Icons.grid_view_rounded), label: l10n?.homeTab ?? 'Home'),
          BottomNavigationBarItem(icon: const Icon(Icons.calendar_today_rounded), label: l10n?.attendanceTab ?? 'Attendance'),
          BottomNavigationBarItem(icon: const Icon(Icons.schedule_rounded), label: l10n?.timetable ?? 'Schedule'),
          BottomNavigationBarItem(icon: const Icon(Icons.person_outline_rounded), label: l10n?.profileTab ?? 'Profile'),
          BottomNavigationBarItem(icon: const Icon(Icons.more_horiz_rounded), label: l10n?.moreTab ?? 'More'),
        ],
      ),
    );
  }
}
