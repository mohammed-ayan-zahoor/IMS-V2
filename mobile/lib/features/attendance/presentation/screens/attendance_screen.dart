import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:student_app/features/attendance/presentation/providers/attendance_provider.dart';
import 'package:student_app/features/attendance/data/models/attendance_model.dart';

import 'package:student_app/core/providers/academic_session_provider.dart';
import 'package:student_app/features/batches/presentation/providers/batches_provider.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  String? _lastSessionId;
  String _selectedBatchId = 'All';
  @override
  Widget build(BuildContext context) {
    final sessionProv = Provider.of<AcademicSessionProvider>(context);
    final attProvider = Provider.of<AttendanceProvider>(context, listen: false);

    if (sessionProv.selectedSessionId != null && sessionProv.selectedSessionId != _lastSessionId) {
      _lastSessionId = sessionProv.selectedSessionId;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        attProvider.loadAttendance(refresh: true, sessionId: _lastSessionId);
      });
    }

    final batchesProv = Provider.of<BatchesProvider>(context);

    return Consumer<AttendanceProvider>(
      builder: (context, att, _) {
        final selectedDate = att.selectedDate;
        final monthStr = DateFormat('MMMM yyyy').format(selectedDate);

        // Filter history by batchId
        final rawHistory = att.history;
        final history = _selectedBatchId == 'All'
            ? rawHistory
            : rawHistory.where((h) => h.batchId == _selectedBatchId).toList();

        // Calculate statistics dynamically based on filtered history
        int present = 0;
        int absent = 0;
        int lateCount = 0;
        int excused = 0;
        int holiday = 0;

        for (final item in history) {
          final status = item.status.toLowerCase();
          if (status == 'present') present++;
          else if (status == 'absent') absent++;
          else if (status == 'late') lateCount++;
          else if (status == 'excused') excused++;
          else if (status == 'holiday') holiday++;
        }

        final totalMarked = present + absent + lateCount + excused;
        final rate = totalMarked > 0 ? ((present / totalMarked) * 100).round() : 0;

        // Build a mapping of batchId -> batchName
        final Map<String, String> batchMap = {'All': 'All Batches'};
        for (final b in batchesProv.batches) {
          batchMap[b.id] = '${b.courseName} - ${b.name}';
        }
        for (final h in rawHistory) {
          if (h.batchId.isNotEmpty && !batchMap.containsKey(h.batchId)) {
            batchMap[h.batchId] = h.batchName;
          }
        }

        // If the selected batch is no longer in the list (e.g. session changed), fallback to All
        if (!batchMap.containsKey(_selectedBatchId)) {
          _selectedBatchId = 'All';
        }

        return Scaffold(
          backgroundColor: const Color(0xFFF8F9FF),
          appBar: AppBar(
            automaticallyImplyLeading: false,
            backgroundColor: Colors.white,
            elevation: 0,
            titleSpacing: 16,
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
                    Icons.calendar_month,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  'ATTENDANCE',
                  style: GoogleFonts.hankenGrotesk(
                    color: const Color(0xFF002045),
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          body: SafeArea(
            child: RefreshIndicator(
              onRefresh: () => att.loadAttendance(refresh: true),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(vertical: 16.0),
                children: [
                  // Header Title Section
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Attendance',
                          style: GoogleFonts.hankenGrotesk(
                            color: const Color(0xFF0D1C2E),
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Track your class participation.',
                          style: GoogleFonts.inter(
                            color: const Color(0xFF43474E),
                            fontSize: 14,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Month Navigator Bar
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        border: Border.all(color: const Color(0xFFC4C6CF)),
                        borderRadius: BorderRadius.circular(9999),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          )
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.chevron_left, size: 20, color: Color(0xFF0D1C2E)),
                            onPressed: () => att.changeMonth(-1),
                            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                            padding: EdgeInsets.zero,
                          ),
                          Container(
                            constraints: const BoxConstraints(minWidth: 130),
                            child: Text(
                              monthStr,
                              textAlign: TextAlign.center,
                              style: GoogleFonts.hankenGrotesk(
                                color: const Color(0xFF0D1C2E),
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.chevron_right, size: 20, color: Color(0xFF0D1C2E)),
                            onPressed: () => att.changeMonth(1),
                            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                            padding: EdgeInsets.zero,
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (batchMap.length > 2) ...[
                    const SizedBox(height: 12),
                    Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFC4C6CF)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedBatchId,
                            isDense: true,
                            icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF002045), size: 18),
                            style: GoogleFonts.inter(
                              color: const Color(0xFF002045),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                            dropdownColor: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            items: batchMap.entries.map((e) {
                              return DropdownMenuItem<String>(
                                value: e.key,
                                child: Text(e.value),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setState(() {
                                  _selectedBatchId = val;
                                });
                              }
                            },
                          ),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),

                  // Stats Tiles Grid (3 Columns)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            // Present Tile
                            _buildStatTile(
                              value: '$present',
                              label: 'PRESENT',
                              bgColor: const Color(0xFFE6F4EA),
                              borderColor: const Color(0xFFCEEAD6),
                              textColor: const Color(0xFF137333),
                              labelColor: const Color(0xFF1E8E3E),
                            ),
                            const SizedBox(width: 10),
                            // Absent Tile
                            _buildStatTile(
                              value: '$absent',
                              label: 'ABSENT',
                              bgColor: const Color(0xFFFCE8E6),
                              borderColor: const Color(0xFFFAD2CF),
                              textColor: const Color(0xFFA50E0E),
                              labelColor: const Color(0xFFD93025),
                            ),
                            const SizedBox(width: 10),
                            // Late Tile
                            _buildStatTile(
                              value: '$lateCount',
                              label: 'LATE',
                              bgColor: const Color(0xFFFEF7E0),
                              borderColor: const Color(0xFFFEEFC3),
                              textColor: const Color(0xFFE37400),
                              labelColor: const Color(0xFFF29900),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            // Excused Tile
                            _buildStatTile(
                              value: '$excused',
                              label: 'EXCUSED',
                              bgColor: const Color(0xFFE8F0FE),
                              borderColor: const Color(0xFFD2E3FC),
                              textColor: const Color(0xFF174EA6),
                              labelColor: const Color(0xFF1A73E8),
                            ),
                            const SizedBox(width: 10),
                            // Holidays Tile
                            _buildStatTile(
                              value: '$holiday',
                              label: 'HOLIDAYS',
                              bgColor: const Color(0xFFF3E8FD),
                              borderColor: const Color(0xFFE9D2FD),
                              textColor: const Color(0xFF681DA8),
                              labelColor: const Color(0xFF9334E6),
                            ),
                            const SizedBox(width: 10),
                            // Rate Tile
                            _buildStatTile(
                              value: '$rate%',
                              label: 'RATE',
                              bgColor: Colors.white,
                              borderColor: const Color(0xFFC4C6CF),
                              textColor: const Color(0xFF0D1C2E),
                              labelColor: const Color(0xFF43474E),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Dynamic Calendar Card
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        border: Border.all(color: const Color(0xFFC4C6CF)),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.02),
                            blurRadius: 6,
                            offset: const Offset(0, 3),
                          )
                        ],
                      ),
                      child: Column(
                        children: [
                          // Grid Day Headers
                          Container(
                            color: const Color(0xFFEFF4FF),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                _buildDayHeader('S'),
                                _buildDayHeader('M'),
                                _buildDayHeader('T'),
                                _buildDayHeader('W'),
                                _buildDayHeader('T'),
                                _buildDayHeader('F'),
                                _buildDayHeader('S'),
                              ],
                            ),
                          ),
                          // Dynamic Grid Day Numbers
                          if (att.isLoading)
                            const Padding(
                              padding: EdgeInsets.all(32.0),
                              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                            )
                          else
                            Container(
                              color: const Color(0xFFC4C6CF),
                              child: GridView.count(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                crossAxisCount: 7,
                                childAspectRatio: 1.25,
                                mainAxisSpacing: 1.0,
                                crossAxisSpacing: 1.0,
                                children: _buildCalendarGridCells(context, att, history),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Session History List Section
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Monthly Log',
                          style: GoogleFonts.hankenGrotesk(
                            color: const Color(0xFF0D1C2E),
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        if (history.isEmpty && !att.isLoading)
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              border: Border.all(color: const Color(0xFFC4C6CF)),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Center(
                              child: Text(
                                'No attendance sessions recorded for this month.',
                                style: GoogleFonts.inter(
                                  color: const Color(0xFF545F72),
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          )
                        else
                          ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: history.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final record = history[index];
                              return _buildAttendanceListItem(record);
                            },
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 80),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // Stat Tile Builder
  Widget _buildStatTile({
    required String value,
    required String label,
    required Color bgColor,
    required Color borderColor,
    required Color textColor,
    required Color labelColor,
  }) {
    return Expanded(
      child: Container(
        height: 68,
        decoration: BoxDecoration(
          color: bgColor,
          border: Border.all(color: borderColor),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              value,
              style: GoogleFonts.hankenGrotesk(
                color: textColor,
                fontSize: 22,
                fontWeight: FontWeight.bold,
                height: 1.1,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: GoogleFonts.inter(
                color: labelColor,
                fontSize: 9,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Calendar Day Header Builder (S, M, T...)
  Widget _buildDayHeader(String day) {
    return Expanded(
      child: Text(
        day,
        textAlign: TextAlign.center,
        style: GoogleFonts.inter(
          color: const Color(0xFF43474E),
          fontSize: 11,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  // Build Calendar Grid Cells dynamically for selected month
  List<Widget> _buildCalendarGridCells(BuildContext context, AttendanceProvider att, List<AttendanceModel> history) {
    final date = att.selectedDate;
    final year = date.year;
    final month = date.month;

    final firstDayOfMonth = DateTime(year, month, 1);
    final daysInMonth = DateTime(year, month + 1, 0).day;
    final daysInPrevMonth = DateTime(year, month, 0).day;

    // Sunday = 7 in DateTime.weekday (Dart: Mon=1..Sun=7). Sunday as 0 offset:
    final firstWeekdayOffset = firstDayOfMonth.weekday % 7; // Sunday=0, Mon=1, ... Sat=6

    final List<Widget> cells = [];

    // Map date -> AttendanceModel for easy lookup
    final Map<int, AttendanceModel> recordMap = {};
    for (final rec in history) {
      if (rec.date.year == year && rec.date.month == month) {
        recordMap[rec.date.day] = rec;
      }
    }

    final now = DateTime.now();

    // Leading days from previous month
    for (int i = firstWeekdayOffset - 1; i >= 0; i--) {
      final dayNum = daysInPrevMonth - i;
      cells.add(_buildCalendarDay(dayNum.toString(), isCurrentMonth: false));
    }

    // Days of current month
    for (int day = 1; day <= daysInMonth; day++) {
      final isToday = (now.year == year && now.month == month && now.day == day);
      final rec = recordMap[day];

      cells.add(
        GestureDetector(
          onTap: rec == null ? null : () => _showSessionDetailsModal(context, rec),
          child: _buildCalendarDay(
            day.toString(),
            isCurrentMonth: true,
            isToday: isToday,
            status: rec?.status,
          ),
        ),
      );
    }

    // Trailing days for next month
    final totalCells = cells.length;
    final remaining = (7 - (totalCells % 7)) % 7;
    for (int day = 1; day <= remaining; day++) {
      cells.add(_buildCalendarDay(day.toString(), isCurrentMonth: false));
    }

    return cells;
  }

  // Calendar Grid Day Cell Builder
  Widget _buildCalendarDay(
    String dayNumber, {
    bool isCurrentMonth = true,
    bool isToday = false,
    String? status,
  }) {
    Color cellColor = Colors.white;
    Color textColor = const Color(0xFF0D1C2E);
    Color borderLeftColor = Colors.transparent;
    FontWeight fontW = FontWeight.normal;

    if (!isCurrentMonth) {
      textColor = const Color(0xFF74777F);
    } else if (status == 'present') {
      cellColor = const Color(0xFFE6F4EA);
      textColor = const Color(0xFF137333);
      borderLeftColor = const Color(0xFF1E8E3E);
      fontW = FontWeight.w600;
    } else if (status == 'absent') {
      cellColor = const Color(0xFFFCE8E6);
      textColor = const Color(0xFFA50E0E);
      borderLeftColor = const Color(0xFFD93025);
      fontW = FontWeight.w600;
    } else if (status == 'late') {
      cellColor = const Color(0xFFFEF7E0);
      textColor = const Color(0xFFE37400);
      borderLeftColor = const Color(0xFFF29900);
      fontW = FontWeight.w600;
    } else if (status == 'excused') {
      cellColor = const Color(0xFFE8F0FE);
      textColor = const Color(0xFF174EA6);
      borderLeftColor = const Color(0xFF1A73E8);
      fontW = FontWeight.w600;
    } else if (status == 'holiday') {
      cellColor = const Color(0xFFF3E8FD);
      textColor = const Color(0xFF681DA8);
      borderLeftColor = const Color(0xFF9334E6);
      fontW = FontWeight.w600;
    } else if (isToday) {
      cellColor = const Color(0xFFEFF4FF);
      textColor = const Color(0xFF002045);
      fontW = FontWeight.bold;
    }

    return Container(
      color: Colors.white,
      child: Container(
        color: cellColor,
        child: Stack(
          children: [
            // Left Status Sliver Strip
            if (borderLeftColor != Colors.transparent)
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                width: 3.5,
                child: Container(
                  color: borderLeftColor,
                ),
              ),
            // Day Number
            Align(
              alignment: Alignment.center,
              child: Text(
                dayNumber,
                style: GoogleFonts.inter(
                  color: textColor,
                  fontSize: 14,
                  fontWeight: fontW,
                ),
              ),
            ),
            // Today Bottom Dot indicator
            if (isToday)
              Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 5.0),
                  child: Container(
                    width: 4,
                    height: 4,
                    decoration: const BoxDecoration(
                      color: Color(0xFF002045),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  // Attendance List Item Builder
  Widget _buildAttendanceListItem(AttendanceModel record) {
    Color badgeBg = const Color(0xFFE6F4EA);
    Color badgeText = const Color(0xFF137333);
    String statusLabel = record.status.toUpperCase();

    if (record.status == 'absent') {
      badgeBg = const Color(0xFFFCE8E6);
      badgeText = const Color(0xFFA50E0E);
    } else if (record.status == 'late') {
      badgeBg = const Color(0xFFFEF7E0);
      badgeText = const Color(0xFFE37400);
    } else if (record.status == 'excused') {
      badgeBg = const Color(0xFFE8F0FE);
      badgeText = const Color(0xFF174EA6);
    } else if (record.status == 'holiday') {
      badgeBg = const Color(0xFFF3E8FD);
      badgeText = const Color(0xFF681DA8);
    }

    final dateStr = DateFormat('EEE, MMM d, yyyy').format(record.date);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFC4C6CF)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                dateStr,
                style: GoogleFonts.hankenGrotesk(
                  color: const Color(0xFF0D1C2E),
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Batch: ${record.batchName} · Topic: ${record.topic}',
                style: GoogleFonts.inter(
                  color: const Color(0xFF545F72),
                  fontSize: 12,
                ),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: badgeBg,
              borderRadius: BorderRadius.circular(9999),
            ),
            child: Text(
              statusLabel,
              style: GoogleFonts.inter(
                color: badgeText,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showSessionDetailsModal(BuildContext context, AttendanceModel record) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    DateFormat('EEEE, MMMM d, yyyy').format(record.date),
                    style: GoogleFonts.hankenGrotesk(
                      color: const Color(0xFF0D1C2E),
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF4FF),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      record.status.toUpperCase(),
                      style: GoogleFonts.inter(
                        color: const Color(0xFF002045),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Batch: ${record.batchName}',
                style: GoogleFonts.inter(
                  color: const Color(0xFF43474E),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Topic: ${record.topic}',
                style: GoogleFonts.inter(
                  color: const Color(0xFF43474E),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }
}
