import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/providers/academic_session_provider.dart';
import 'package:student_app/features/attendance/presentation/screens/attendance_screen.dart';
import 'package:student_app/features/fees/presentation/screens/fees_screen.dart';
import 'package:student_app/l10n/app_localizations.dart';

class AcademicHistoryScreen extends StatefulWidget {
  const AcademicHistoryScreen({super.key});

  @override
  State<AcademicHistoryScreen> createState() => _AcademicHistoryScreenState();
}

class _AcademicHistoryScreenState extends State<AcademicHistoryScreen> {
  bool _isArchiveExpanded = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AcademicSessionProvider>().loadSessions();
    });
  }

  String _formatDateRange(DateTime? start, DateTime? end) {
    if (start == null && end == null) return 'Dates not specified';
    final formatter = DateFormat('MMM yyyy');
    if (start != null && end != null) {
      return '${formatter.format(start)} – ${formatter.format(end)}';
    }
    if (start != null) return 'Started ${formatter.format(start)}';
    return 'Ending ${formatter.format(end!)}';
  }



  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FF),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF002045)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n?.academicSessions ?? 'Academic Sessions',
              style: GoogleFonts.hankenGrotesk(
                color: const Color(0xFF002045),
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            Text(
              'Enrolled terms and academic record',
              style: GoogleFonts.inter(
                color: const Color(0xFF545F72),
                fontSize: 12,
                fontWeight: FontWeight.w400,
              ),
            ),
          ],
        ),
        centerTitle: false,
      ),
      body: Consumer<AcademicSessionProvider>(
        builder: (context, sessionProv, _) {
          if (sessionProv.isLoading) {
            return const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF002045)),
              ),
            );
          }

          final sessions = sessionProv.sessions;

          if (sessions.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 72,
                      height: 72,
                      decoration: const BoxDecoration(
                        color: Color(0xFFEFF4FF),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.history_edu_outlined,
                        size: 36,
                        color: Color(0xFF002045),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No Academic Sessions Found',
                      style: GoogleFonts.hankenGrotesk(
                        color: const Color(0xFF0D1C2E),
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'You are not enrolled in any registered academic session yet.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        color: const Color(0xFF545F72),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          final currentSessions = sessions.where((s) => s.isActive).toList();
          final archivedSessions = sessions.where((s) => !s.isActive).toList();

          return RefreshIndicator(
            onRefresh: () => context.read<AcademicSessionProvider>().loadSessions(),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16.0),
              children: [
                // 1. Current Session Section
                if (currentSessions.isNotEmpty) ...[
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Color(0xFF15803D),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        (l10n?.currentEnrolledSession ?? 'CURRENT ENROLLED SESSION').toUpperCase(),
                        style: GoogleFonts.inter(
                          color: const Color(0xFF15803D),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ...currentSessions.map((session) => _buildSessionCard(context, session, isCurrent: true)),
                  const SizedBox(height: 20),
                ],

                // 2. Previous / Archived Sessions Section
                if (archivedSessions.isNotEmpty) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${(l10n?.previousSessions ?? "PREVIOUS SESSIONS").toUpperCase()} (${archivedSessions.length})',
                        style: GoogleFonts.inter(
                          color: const Color(0xFF545F72),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.8,
                        ),
                      ),
                      if (archivedSessions.length > 2)
                        InkWell(
                          onTap: () {
                            setState(() {
                              _isArchiveExpanded = !_isArchiveExpanded;
                            });
                          },
                          borderRadius: BorderRadius.circular(4),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            child: Row(
                              children: [
                                Text(
                                  _isArchiveExpanded ? 'Collapse' : 'Show All',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: const Color(0xFF002045),
                                  ),
                                ),
                                Icon(
                                  _isArchiveExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                  size: 16,
                                  color: const Color(0xFF002045),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (_isArchiveExpanded)
                    ...archivedSessions.map((session) => _buildSessionCard(context, session, isCurrent: false))
                  else
                    ...archivedSessions.take(1).map((session) => _buildSessionCard(context, session, isCurrent: false)),
                ],

                const SizedBox(height: 40),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSessionCard(BuildContext context, AcademicSessionModel session, {required bool isCurrent}) {
    final l10n = AppLocalizations.of(context);
    final title = session.getLocalizedTitle(context);
    final dateRangeStr = _formatDateRange(session.startDate, session.endDate);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(
          color: isCurrent ? const Color(0xFF137333) : const Color(0xFFE2E8F0),
          width: isCurrent ? 1.5 : 1.0,
        ),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: isCurrent
                ? const Color(0xFF002045).withValues(alpha: 0.06)
                : Colors.black.withValues(alpha: 0.02),
            blurRadius: isCurrent ? 8 : 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Card Header: Title (Flexible) + Non-shrinking Status Badge
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: GoogleFonts.hankenGrotesk(
                      color: const Color(0xFF002045),
                      fontSize: isCurrent ? 17 : 15,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: isCurrent ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isCurrent ? const Color(0xFF86EFAC) : const Color(0xFFCBD5E1),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isCurrent ? const Color(0xFF15803D) : const Color(0xFF64748B),
                        ),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        isCurrent ? (l10n?.currentSession ?? 'CURRENT').toUpperCase() : (l10n?.archived ?? 'ARCHIVED').toUpperCase(),
                        style: GoogleFonts.inter(
                          color: isCurrent ? const Color(0xFF15803D) : const Color(0xFF334155),
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 6),

            // Date Range
            Row(
              children: [
                const Icon(
                  Icons.calendar_today_outlined,
                  size: 13,
                  color: Color(0xFF475569),
                ),
                const SizedBox(width: 6),
                Text(
                  dateRangeStr,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF475569),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (session.batchName != null && session.batchName!.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  Text(
                    '•',
                    style: GoogleFonts.inter(color: const Color(0xFF94A3B8)),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      session.batchName!,
                      style: GoogleFonts.inter(
                        color: const Color(0xFF64748B),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ],
            ),

const SizedBox(height: 16),

                        // Action Buttons
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 44,
                    child: isCurrent
                        ? ElevatedButton.icon(
                            icon: const Icon(Icons.event_available_outlined, size: 16),
                            label: Text(
                              l10n?.attendanceTab ?? 'Attendance',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF002045),
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => AttendanceScreen(
                                    initialSessionId: session.id,
                                    initialSessionName: session.getLocalizedTitle(context),
                                  ),
                                ),
                              );
                            },
                          )
                        : OutlinedButton.icon(
                            icon: const Icon(Icons.event_available_outlined, size: 16),
                            label: Text(
                              l10n?.attendanceTab ?? 'Attendance',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF002045),
                              side: const BorderSide(color: Color(0xFFCBD5E1)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => AttendanceScreen(
                                    initialSessionId: session.id,
                                    initialSessionName: session.getLocalizedTitle(context),
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: SizedBox(
                    height: 44,
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.receipt_long_outlined, size: 16),
                      label: Text(
                        l10n?.feesRecords ?? 'Fee Records',
                        style: GoogleFonts.inter(
                          fontSize: isCurrent ? 13 : 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF002045),
                        side: BorderSide(
                          color: isCurrent ? const Color(0xFF002045) : const Color(0xFFCBD5E1),
                          width: isCurrent ? 1.4 : 1.0,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => FeesScreen(
                              initialSessionId: session.id,
                              initialSessionName: session.getLocalizedTitle(context),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
