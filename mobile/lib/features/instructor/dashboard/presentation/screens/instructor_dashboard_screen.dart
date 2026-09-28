import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/features/instructor/dashboard/presentation/providers/instructor_dashboard_provider.dart';
import 'package:student_app/features/instructor/dashboard/presentation/widgets/post_notice_sheet.dart';
import 'package:student_app/features/notifications/presentation/providers/notifications_provider.dart';
import 'package:student_app/features/notifications/presentation/screens/notifications_screen.dart';
import 'package:student_app/l10n/app_localizations.dart';

class InstructorDashboardScreen extends StatelessWidget {
  final Function(int tabIndex, {String? batchId})? onNavigateToTab;

  const InstructorDashboardScreen({
    super.key,
    this.onNavigateToTab,
  });

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
    final auth = context.watch<AuthProvider>();
    final dashboardProvider = context.watch<InstructorDashboardProvider>();
    final l10n = AppLocalizations.of(context);

    final data = dashboardProvider.dashboardData;
    final batches = data?.batches ?? [];
    final firstName = auth.userFirstName.isNotEmpty ? auth.userFirstName : 'Teacher';
    final avatarUrl = auth.userAvatar.isNotEmpty ? auth.userAvatar : null;

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
              'TEACHER PORTAL',
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
          Consumer<NotificationsProvider>(
            builder: (context, notifProv, _) {
              final unread = notifProv.unreadCount;
              return Stack(
                alignment: Alignment.center,
                children: [
                  IconButton(
                    icon: const Icon(
                      Icons.notifications_none_rounded,
                      color: Color(0xFF545F72),
                      size: 24,
                    ),
                    onPressed: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()));
                    },
                  ),
                  if (unread > 0)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: const BoxDecoration(
                          color: Color(0xFFBA1A1A),
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 16,
                          minHeight: 16,
                        ),
                        child: Text(
                          unread > 9 ? '9+' : unread.toString(),
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16.0, left: 4.0),
            child: CircleAvatar(
              radius: 18,
              backgroundColor: const Color(0xFF002045),
              backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
              child: avatarUrl == null
                  ? Text(
                      firstName.isNotEmpty ? firstName[0].toUpperCase() : 'T',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                    )
                  : null,
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => dashboardProvider.loadDashboard(refresh: true),
          color: const Color(0xFF002045),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Greeting Section (Exact match with Student Screen)
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
                              color: const Color(0xFF545F72).withValues(alpha: 0.8),
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
                  ],
                ),
                const SizedBox(height: 24),

                // Primary Stats (Exact Match with Student Screen: Full width cards, corner radius 4, no icon containers)
                _buildStatCard(
                  title: 'ASSIGNED BATCHES',
                  value: '${data?.totalBatches ?? 0}',
                  suffix: ' Active Sections',
                  icon: Icons.meeting_room_outlined,
                  progress: 1.0,
                  progressColor: const Color(0xFF002045),
                ),
                const SizedBox(height: 12),

                _buildStatCard(
                  title: 'TOTAL STUDENTS ENROLLED',
                  value: '${data?.totalStudents ?? 0}',
                  suffix: ' Students',
                  icon: Icons.school_outlined,
                  progress: 1.0,
                  progressColor: const Color(0xFF002045),
                ),
                const SizedBox(height: 12),

                _buildStatCard(
                  title: 'NOTICES & ANNOUNCEMENTS',
                  value: '${data?.noticesCount ?? 0}',
                  suffix: ' Published',
                  icon: Icons.campaign_outlined,
                  progress: 1.0,
                  progressColor: const Color(0xFF43A047),
                ),
                const SizedBox(height: 24),

                // Quick Actions Row (Exact Match with Student Screen: horizontal bar, border radius 4, outline buttons)
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
                        // Attendance Action (Active Style)
                        ElevatedButton.icon(
                          onPressed: () => onNavigateToTab?.call(1),
                          icon: const Icon(Icons.how_to_reg, size: 18),
                          label: const Text('Attendance'),
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

                        // Post Notice Action (Only if permitted)
                        if (auth.hasPermission('manage_notices')) ...[
                          OutlinedButton.icon(
                            onPressed: () => PostNoticeSheet.show(context),
                            icon: const Icon(Icons.campaign, size: 18, color: Color(0xFF002045)),
                            label: const Text('Post Notice'),
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
                        ],

                        // Materials Action (Inactive Style)
                        OutlinedButton.icon(
                          onPressed: () => onNavigateToTab?.call(4),
                          icon: const Icon(Icons.upload_file, size: 18, color: Color(0xFF002045)),
                          label: const Text('Materials'),
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

                        // Batches Action (Inactive Style)
                        OutlinedButton.icon(
                          onPressed: () => onNavigateToTab?.call(2),
                          icon: const Icon(Icons.groups, size: 18, color: Color(0xFF002045)),
                          label: const Text('Batches'),
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

                // Assigned Batches (Exact Bento Box Match with Student Course Progress)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Assigned Batches',
                          style: GoogleFonts.hankenGrotesk(
                            color: const Color(0xFF0D1C2E),
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        TextButton(
                          onPressed: () => onNavigateToTab?.call(2),
                          child: Text(
                            'View All',
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
                                  'BATCH / SECTION',
                                  style: GoogleFonts.inter(
                                    color: const Color(0xFF545F72),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    letterSpacing: 1.0,
                                  ),
                                ),
                                Text(
                                  'ACTION',
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
                          if (dashboardProvider.isLoading && batches.isEmpty)
                            const Padding(
                              padding: EdgeInsets.all(32.0),
                              child: Center(
                                child: CircularProgressIndicator(color: Color(0xFF002045)),
                              ),
                            )
                          else if (batches.isEmpty)
                            Padding(
                              padding: const EdgeInsets.all(24.0),
                              child: Center(
                                child: Text(
                                  l10n?.emptyState ?? 'No batches assigned yet',
                                  style: GoogleFonts.inter(
                                    color: const Color(0xFF545F72),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            )
                          else
                            ...batches.map((batch) {
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
                                            batch.name,
                                            style: GoogleFonts.hankenGrotesk(
                                              color: const Color(0xFF0D1C2E),
                                              fontSize: 16,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            '${batch.courseName} • ${batch.studentCount} students',
                                            style: GoogleFonts.inter(
                                              color: const Color(0xFF545F72),
                                              fontSize: 12,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    ElevatedButton.icon(
                                      onPressed: () => onNavigateToTab?.call(1, batchId: batch.id),
                                      icon: const Icon(Icons.check_circle_outline, size: 16, color: Colors.white),
                                      label: const Text('Attendance'),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF002045),
                                        foregroundColor: Colors.white,
                                        elevation: 0,
                                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Exact reproduction of Student Dashboard _buildStatCard:
  Widget _buildStatCard({
    required String title,
    required String value,
    String? suffix,
    required IconData icon,
    required double progress,
    Color? progressColor,
  }) {
    return Container(
      width: double.infinity,
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
              widthFactor: progress.clamp(0.0, 1.0),
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
}
