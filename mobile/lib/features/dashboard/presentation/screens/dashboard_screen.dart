import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/features/dashboard/presentation/providers/dashboard_provider.dart';
import 'package:student_app/features/timetable/presentation/screens/timetable_screen.dart';
import 'package:student_app/features/attendance/presentation/screens/attendance_screen.dart';
import 'package:student_app/features/batches/presentation/screens/batches_screen.dart';
import 'package:student_app/features/fees/presentation/screens/fees_screen.dart';
import 'package:student_app/features/materials/presentation/screens/learning_materials_screen.dart';
import 'package:student_app/features/profile/presentation/screens/profile_screen.dart';
import 'package:student_app/features/vault/presentation/screens/vault_screen.dart';
import 'package:student_app/features/notices/presentation/screens/notices_screen.dart';
import 'package:student_app/features/practice/presentation/screens/practice_screen.dart';
import 'package:student_app/features/timeline/presentation/screens/timeline_screen.dart';
import 'package:student_app/features/exams/presentation/screens/exams_screen.dart';
import 'package:student_app/features/chat/presentation/screens/chat_screen.dart';
import 'package:student_app/features/assignments/presentation/screens/assignments_screen.dart';

import 'package:student_app/core/providers/academic_session_provider.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String? _lastSessionId;
  String _getFormattedDate() {
    final now = DateTime.now();
    final weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    final months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${weekdays[now.weekday - 1]}, ${months[now.month - 1]} ${now.day}, ${now.year}';
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final sessionProv = Provider.of<AcademicSessionProvider>(context);
    final dashProvider = Provider.of<DashboardProvider>(context, listen: false);

    if (sessionProv.selectedSessionId != null && sessionProv.selectedSessionId != _lastSessionId) {
      _lastSessionId = sessionProv.selectedSessionId;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        dashProvider.loadDashboard(refresh: true, sessionId: _lastSessionId);
      });
    }

    return Consumer2<AuthProvider, DashboardProvider>(
      builder: (context, auth, dash, _) {
        final user = auth.user;
        final firstName = user?['profile']?['firstName'] ?? user?['displayName'] ?? 'Student';
        final avatarUrl = user?['profile']?['avatarUrl'];
        final data = dash.dashboardData;

        return Scaffold(
          backgroundColor: const Color(0xFFF8F9FF),
          appBar: AppBar(
            automaticallyImplyLeading: false,
            backgroundColor: const Color(0xFFF8F9FF),
            elevation: 0,
            title: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: const Color(0xFF002045),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Icon(
                    Icons.school,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'STUDENT PORTAL',
                  style: GoogleFonts.hankenGrotesk(
                    color: const Color(0xFF0D1C2E),
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.15,
                  ),
                ),
              ],
            ),
            actions: [
              Stack(
                children: [
                  IconButton(
                    icon: const Icon(
                      Icons.notifications_none,
                      color: Color(0xFF545F72),
                    ),
                    onPressed: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const NoticesScreen()));
                    },
                  ),
                  Positioned(
                    top: 12,
                    right: 12,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFFBA1A1A),
                        shape: BoxShape.circle,
                      ),
                    ),
                  )
                ],
              ),
              Padding(
                padding: const EdgeInsets.only(right: 16.0, left: 8.0),
                child: CircleAvatar(
                  radius: 18,
                  backgroundColor: const Color(0xFF002045),
                  backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                  child: avatarUrl == null
                      ? Text(
                          firstName.isNotEmpty ? firstName[0].toUpperCase() : 'S',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        )
                      : null,
                ),
              ),
            ],
          ),
          body: SafeArea(
            child: RefreshIndicator(
              onRefresh: () => dash.loadDashboard(refresh: true, sessionId: sessionProv.selectedSessionId),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Greeting Section
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _getFormattedDate(),
                                style: GoogleFonts.inter(
                                  color: const Color(0xFF545F72).withValues(alpha: 0.7),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Welcome back, $firstName',
                                style: GoogleFonts.hankenGrotesk(
                                  color: const Color(0xFF0D1C2E),
                                  fontSize: 26,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Dropdown Selector
                        Consumer<AcademicSessionProvider>(
                          builder: (context, sessionProv, _) {
                            if (sessionProv.sessions.isEmpty) return const SizedBox.shrink();
                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF4FF),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: const Color(0xFFC4C6CF)),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: sessionProv.selectedSessionId,
                                  isDense: true,
                                  icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF002045), size: 18),
                                  style: GoogleFonts.inter(
                                    color: const Color(0xFF002045),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                  dropdownColor: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  items: sessionProv.sessions.map((s) {
                                    return DropdownMenuItem<String>(
                                      value: s.id,
                                      child: Text(s.sessionName),
                                    );
                                  }).toList(),
                                  onChanged: (val) {
                                    if (val != null) {
                                      sessionProv.selectSession(val);
                                    }
                                  },
                                ),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Primary Stats Grid
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final cardWidth = (constraints.maxWidth - 12) / 2;
                        return Wrap(
                          spacing: 12,
                          runSpacing: 12,
                          children: [
                            _buildStatCard(
                              title: 'ATTENDANCE',
                              value: '${data?.attendance ?? 0}%',
                              icon: Icons.event_available,
                              progress: (data?.attendance ?? 0) / 100.0,
                              width: mediaQuery.size.width > 600 ? cardWidth : double.infinity,
                            ),
                            _buildStatCard(
                              title: 'EXAMS COMPLETED',
                              value: '${data?.examsTaken ?? 0}',
                              suffix: ' Tests',
                              icon: Icons.assignment_turned_in,
                              progress: 1.0,
                              width: mediaQuery.size.width > 600 ? cardWidth : double.infinity,
                            ),
                            _buildStatCard(
                              title: 'STUDY MATERIALS',
                              value: '${data?.materialsCount ?? 0}',
                              suffix: ' Files',
                              icon: Icons.menu_book,
                              progress: 1.0,
                              progressColor: const Color(0xFF43A047),
                              width: mediaQuery.size.width > 600 ? cardWidth : double.infinity,
                            ),
                          ],
                        );
                      },
                    ),
              const SizedBox(height: 24),

              // Quick Actions Row
              Container(
                padding: const EdgeInsets.all(8.0),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF4FF), // surface-container-low
                  border: Border.all(color: const Color(0xFFC4C6CF)), // outline-variant
                  borderRadius: BorderRadius.circular(4),
                ),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      // Timetable Action (Active Style)
                      ElevatedButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.schedule, size: 18),
                        label: const Text('Timetable'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF002045), // primary
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Assignments Action (Inactive Style)
                      OutlinedButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.assignment, size: 18, color: Color(0xFF002045)),
                        label: const Text('Assignments'),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF002045),
                          side: const BorderSide(color: Color(0xFFC4C6CF)),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Support Action (Inactive Style)
                      OutlinedButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.support_agent, size: 18, color: Color(0xFF002045)),
                        label: const Text('Support'),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF002045),
                          side: const BorderSide(color: Color(0xFFC4C6CF)),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Course Progress Bento Box
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Course Progress',
                        style: GoogleFonts.hankenGrotesk(
                          color: const Color(0xFF0D1C2E),
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      TextButton(
                        onPressed: () {},
                        child: Text(
                          'View Grades',
                          style: GoogleFonts.inter(
                            color: const Color(0xFF002045),
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: const Color(0xFFC4C6CF)),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Column(
                      children: [
                        // Table Header
                        Container(
                          color: const Color(0xFFEFF4FF),
                          padding: const EdgeInsets.all(16.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'SUBJECT',
                                style: GoogleFonts.inter(
                                  color: const Color(0xFF545F72),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  letterSpacing: 1.0,
                                ),
                              ),
                              Text(
                                'COMPLETION',
                                style: GoogleFonts.inter(
                                  color: const Color(0xFF545F72),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  letterSpacing: 1.0,
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Live course rows from API
                        if (dash.isLoading)
                          const Padding(
                            padding: EdgeInsets.all(24),
                            child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                          )
                        else if (data?.syllabusProgress.isEmpty ?? true)
                          Padding(
                            padding: const EdgeInsets.all(20),
                            child: Center(
                              child: Text('No course data available', style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 13)),
                            ),
                          )
                        else
                          ...?data?.syllabusProgress.map((s) => _buildCourseRow(s.subject, s.code, s.progress / 100)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Upcoming Exams Bento Box
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Upcoming Exams',
                        style: GoogleFonts.hankenGrotesk(
                          color: const Color(0xFF0D1C2E),
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      TextButton(
                        onPressed: () {},
                        child: Text(
                          'Full Schedule',
                          style: GoogleFonts.inter(
                            color: const Color(0xFF002045),
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Live upcoming exams from API
                  if (dash.isLoading)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                    )
                  else if (data?.upcomingExams.isEmpty ?? true)
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        border: Border.all(color: const Color(0xFFC4C6CF)),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Center(
                        child: Text('No upcoming exams', style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 13)),
                      ),
                    )
                  else
                    Column(
                      children: [
                        for (int i = 0; i < (data?.upcomingExams.length ?? 0); i++) ...[
                          if (i > 0) const SizedBox(height: 12),
                          Builder(builder: (_) {
                            final exam = data!.upcomingExams[i];
                            final dt = exam.scheduledAt;
                            final months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
                            final month = dt != null ? months[dt.month - 1] : '---';
                            final day = dt != null ? dt.day.toString() : '--';
                            final timeStr = dt != null
                                ? '${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')} · ${dt.difference(DateTime.now()).inDays} days away'
                                : 'Date TBD';
                            return _buildExamCard(
                              month: month,
                              day: day,
                              subject: exam.title,
                              timeString: timeStr,
                              badgeText: i == 0 ? 'Next Up' : 'Upcoming',
                              badgeColor: i == 0 ? const Color(0xFFD3E4FF) : const Color(0xFFD4E4FC),
                              badgeTextColor: i == 0 ? const Color(0xFF004881) : const Color(0xFF43474E),
                            );
                          }),
                        ],
                      ],
                    ),
                ],
              ),
                    const SizedBox(height: 80), // bottom margin spacing
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  // Stat Card Builder
  Widget _buildStatCard({
    required String title,
    required String value,
    String? suffix,
    required IconData icon,
    required double progress,
    Color? progressColor,
    required double width,
  }) {
    return Container(
      width: width,
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFC4C6CF)),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: GoogleFonts.inter(
                  color: const Color(0xFF545F72), // secondary
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 1.5,
                ),
              ),
              Icon(
                icon,
                color: const Color(0xFF545F72).withValues(alpha: 0.5),
                size: 20,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                value,
                style: GoogleFonts.hankenGrotesk(
                  color: const Color(0xFF0D1C2E),
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.5,
                ),
              ),
              if (suffix != null)
                Text(
                  suffix,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF545F72),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          // Progress Bar
          Container(
            height: 4,
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFFD4E4FC), // surface-variant
              borderRadius: BorderRadius.circular(9999),
            ),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: progress,
              child: Container(
                decoration: BoxDecoration(
                  color: progressColor ?? const Color(0xFF002045), // primary
                  borderRadius: BorderRadius.circular(9999),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Course row item builder
  Widget _buildCourseRow(String subject, String courseCode, double progressPercent) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Color(0xFFC4C6CF), width: 1),
        ),
      ),
      padding: const EdgeInsets.all(16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  subject,
                  style: GoogleFonts.hankenGrotesk(
                    color: const Color(0xFF0D1C2E),
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Course Code: $courseCode',
                  style: GoogleFonts.inter(
                    color: const Color(0xFF545F72),
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${(progressPercent * 100).round()}%',
                style: GoogleFonts.inter(
                  color: const Color(0xFF002045),
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                height: 6,
                width: 96,
                decoration: BoxDecoration(
                  color: const Color(0xFFD4E4FC),
                  borderRadius: BorderRadius.circular(9999),
                ),
                child: FractionallySizedBox(
                  alignment: Alignment.centerLeft,
                  widthFactor: progressPercent,
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF002045),
                      borderRadius: BorderRadius.circular(9999),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // Exam card row builder
  Widget _buildExamCard({
    required String month,
    required String day,
    required String subject,
    required String timeString,
    required String badgeText,
    required Color badgeColor,
    required Color badgeTextColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFC4C6CF)),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: const Color(0xFFEFF4FF),
              border: Border.all(color: const Color(0xFFC4C6CF)),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  month,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF545F72),
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  day,
                  style: GoogleFonts.hankenGrotesk(
                    color: const Color(0xFF002045),
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    height: 1.0,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  subject,
                  style: GoogleFonts.hankenGrotesk(
                    color: const Color(0xFF0D1C2E),
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(
                      Icons.schedule,
                      color: Color(0xFF545F72),
                      size: 14,
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        timeString,
                        style: GoogleFonts.inter(
                          color: const Color(0xFF545F72),
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: badgeColor,
              borderRadius: BorderRadius.circular(9999),
            ),
            child: Text(
              badgeText,
              style: GoogleFonts.inter(
                color: badgeTextColor,
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Bottom Navigation Item Builder
  Widget _buildBottomNavItem({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 4),
          decoration: BoxDecoration(
            color: isActive ? const Color(0xFFD5E0F7) : Colors.transparent, // capsule highlight
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                color: isActive ? const Color(0xFF002045) : const Color(0xFF545F72).withValues(alpha: 0.7),
                size: 22,
              ),
              const SizedBox(height: 2),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  color: isActive ? const Color(0xFF002045) : const Color(0xFF545F72).withValues(alpha: 0.7),
                  fontSize: 10,
                  fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
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
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 36,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 20),
                      decoration: BoxDecoration(
                        color: const Color(0xFFC4C6CF), // outline-variant
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  Text(
                    'More Options',
                    style: GoogleFonts.hankenGrotesk(
                      color: const Color(0xFF002045), // primary
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 3,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 0.95,
                    children: [
                      _buildMenuCard(context, Icons.school_outlined, 'My Batches', const Color(0xFF2563EB)),
                      _buildMenuCard(context, Icons.receipt_long_outlined, 'Fees', const Color(0xFF16A34A)),
                      _buildMenuCard(context, Icons.menu_book_outlined, 'Syllabus', const Color(0xFFD97706)),
                      _buildMenuCard(context, Icons.auto_stories_outlined, 'Materials', const Color(0xFF9333EA)),
                      _buildMenuCard(context, Icons.folder_shared_outlined, 'Document Vault', const Color(0xFF6366F1)),
                      _buildMenuCard(context, Icons.campaign_outlined, 'Notices', const Color(0xFFBA1A1A)),
                      _buildMenuCard(context, Icons.quiz_outlined, 'Practice', const Color(0xFF0D9488)),
                      _buildMenuCard(context, Icons.timeline_outlined, 'Timeline', const Color(0xFFD97706)),
                      _buildMenuCard(context, Icons.task_outlined, 'Assignments', const Color(0xFFEA580C)),
                      _buildMenuCard(context, Icons.assignment_outlined, 'Exams', const Color(0xFF002045)),
                      _buildMenuCard(context, Icons.chat_bubble_outline, 'Messages', const Color(0xFF0F766E)),
                      _buildMenuCard(context, Icons.account_circle_outlined, 'Profile', const Color(0xFF4B5563)),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildMenuCard(BuildContext context, IconData icon, String label, Color accentColor, {bool isPlaceholder = false}) {
    return InkWell(
      onTap: () {
        Navigator.pop(context); // Dismiss bottom sheet
        if (label == 'My Batches') {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => const BatchesScreen(),
            ),
          );
        } else if (label == 'Fees') {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => const FeesScreen(),
            ),
          );
        } else if (label == 'Materials') {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => const LearningMaterialsScreen(),
            ),
          );
        } else if (label == 'Document Vault') {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => const VaultScreen(),
            ),
          );
        } else if (label == 'Notices') {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => const NoticesScreen(),
            ),
          );
        } else if (label == 'Practice') {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => const PracticeScreen(),
            ),
          );
        } else if (label == 'Timeline') {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => const TimelineScreen(),
            ),
          );
        } else if (label == 'Assignments') {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => const AssignmentsScreen(),
            ),
          );
        } else if (label == 'Exams') {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => const ExamsScreen(),
            ),
          );
        } else if (label == 'Messages') {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => const ChatScreen(),
            ),
          );
        } else if (label == 'Profile') {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => const ProfileScreen(),
            ),
          );
        }
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: isPlaceholder ? const Color(0xFFF8F9FF) : const Color(0xFFEFF4FF), // surface-container-low
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isPlaceholder ? const Color(0xFFC4C6CF).withValues(alpha: 0.5) : Colors.transparent,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isPlaceholder ? Colors.transparent : accentColor.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                color: isPlaceholder ? const Color(0xFF545F72) : accentColor,
                size: 26,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                color: const Color(0xFF0D1C2E), // on-surface
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
