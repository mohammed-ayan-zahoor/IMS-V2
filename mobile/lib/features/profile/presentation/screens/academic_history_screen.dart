import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/providers/academic_session_provider.dart';
import 'package:student_app/features/attendance/presentation/screens/attendance_screen.dart';
import 'package:student_app/features/fees/presentation/screens/fees_screen.dart';

class AcademicHistoryScreen extends StatefulWidget {
  const AcademicHistoryScreen({super.key});

  @override
  State<AcademicHistoryScreen> createState() => _AcademicHistoryScreenState();
}

class _AcademicHistoryScreenState extends State<AcademicHistoryScreen> {
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
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FF),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF002045)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Academic Journey',
          style: GoogleFonts.hankenGrotesk(
            color: const Color(0xFF0D1C2E),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
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
                    const Icon(
                      Icons.history_edu_outlined,
                      size: 64,
                      color: Color(0xFF545F72),
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

          return ListView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.all(16.0),
            children: [
              // Header Info Banner
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF4FF),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFD5E0F7)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.info_outline,
                      color: Color(0xFF002045),
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Academic Timeline',
                            style: GoogleFonts.hankenGrotesk(
                              color: const Color(0xFF002045),
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Current sessions reflect live coursework. Past sessions are preserved as read-only historical archives.',
                            style: GoogleFonts.inter(
                              color: const Color(0xFF43474E),
                              fontSize: 12,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              Text(
                'ENROLLED SESSIONS',
                style: GoogleFonts.inter(
                  color: const Color(0xFF545F72),
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 10),

              // Session Cards
              ...sessions.map((session) {
                final isCurrent = session.isActive;
                final dateRangeStr = _formatDateRange(session.startDate, session.endDate);

                return Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(
                      color: isCurrent ? const Color(0xFF137333) : const Color(0xFFC4C6CF),
                      width: isCurrent ? 1.5 : 1.0,
                    ),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Card Header: Session Name + Status Badge
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Academic Session ${session.sessionName}',
                              style: GoogleFonts.hankenGrotesk(
                                color: const Color(0xFF0D1C2E),
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isCurrent ? const Color(0xFFE6F4EA) : const Color(0xFFF1F3F9),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                isCurrent ? 'CURRENT' : 'ARCHIVED',
                                style: GoogleFonts.inter(
                                  color: isCurrent ? const Color(0xFF137333) : const Color(0xFF545F72),
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.5,
                                ),
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
                              size: 14,
                              color: Color(0xFF545F72),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              dateRangeStr,
                              style: GoogleFonts.inter(
                                color: const Color(0xFF545F72),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Divider(height: 1, color: Color(0xFFEDEEF2)),
                        const SizedBox(height: 12),

                        // Quick Access Actions (Read-Only)
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                icon: const Icon(Icons.event_available_outlined, size: 16),
                                label: Text(
                                  'Attendance',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFF002045),
                                  side: const BorderSide(color: Color(0xFFC4C6CF)),
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => const AttendanceScreen(),
                                    ),
                                  );
                                },
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: OutlinedButton.icon(
                                icon: const Icon(Icons.receipt_long_outlined, size: 16),
                                label: Text(
                                  'Fee Records',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFF002045),
                                  side: const BorderSide(color: Color(0xFFC4C6CF)),
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => const FeesScreen(),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: 40),
            ],
          );
        },
      ),
    );
  }
}
