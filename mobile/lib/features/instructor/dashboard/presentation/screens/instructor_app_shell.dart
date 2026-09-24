import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/providers/academic_session_provider.dart';
import 'package:student_app/features/instructor/attendance/presentation/providers/instructor_attendance_provider.dart';
import 'package:student_app/features/instructor/attendance/presentation/screens/instructor_attendance_screen.dart';
import 'package:student_app/features/instructor/batches/presentation/screens/instructor_batches_screen.dart';
import 'package:student_app/features/instructor/dashboard/presentation/screens/instructor_dashboard_screen.dart';
import 'package:student_app/features/instructor/dashboard/presentation/widgets/instructor_more_menu_sheet.dart';
import 'package:student_app/features/instructor/profile/presentation/screens/instructor_profile_screen.dart';
import 'package:student_app/l10n/app_localizations.dart';

class InstructorAppShell extends StatefulWidget {
  const InstructorAppShell({super.key});

  @override
  State<InstructorAppShell> createState() => _InstructorAppShellState();
}

class _InstructorAppShellState extends State<InstructorAppShell> {
  int _currentIndex = 0;
  final PageController _pageController = PageController();
  String? _pendingAttendanceBatchId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AcademicSessionProvider>().loadSessions();
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onTabTapped(int index, {String? batchId}) {
    if (index == 4) {
      // More Menu sheet
      InstructorMoreMenuSheet.show(context);
      return;
    }

    if (index == 1 && batchId != null) {
      _pendingAttendanceBatchId = batchId;
      context.read<InstructorAttendanceProvider>().selectBatch(batchId);
    }

    setState(() {
      _currentIndex = index;
    });
    _pageController.jumpToPage(index);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    final screens = [
      InstructorDashboardScreen(
        onNavigateToTab: (idx, {batchId}) => _onTabTapped(idx, batchId: batchId),
      ),
      InstructorAttendanceScreen(
        initialBatchId: _pendingAttendanceBatchId,
      ),
      InstructorBatchesScreen(
        onTakeAttendance: (batchId) => _onTabTapped(1, batchId: batchId),
      ),
      const InstructorProfileScreen(),
    ];

    return Scaffold(
      body: PageView(
        controller: _pageController,
        physics: const NeverScrollableScrollPhysics(),
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => _onTabTapped(index),
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
          selectedItemColor: const Color(0xFF002045),
          unselectedItemColor: const Color(0xFF64748B),
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 11),
          elevation: 0,
          items: [
            BottomNavigationBarItem(
              icon: const Icon(Icons.grid_view_rounded),
              label: l10n?.homeTab ?? 'Home',
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.how_to_reg_rounded),
              label: l10n?.attendanceTab ?? 'Attendance',
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.groups_rounded),
              label: l10n?.batchesTab ?? 'Batches',
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.person_outline_rounded),
              label: l10n?.profileTab ?? 'Profile',
            ),
            BottomNavigationBarItem(
              icon: const Icon(Icons.more_horiz_rounded),
              label: l10n?.moreTab ?? 'More',
            ),
          ],
        ),
      ),
    );
  }
}
