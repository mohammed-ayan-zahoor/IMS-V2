import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/timetable/presentation/providers/timetable_provider.dart';
import 'package:student_app/features/timetable/data/models/timetable_model.dart';

import 'package:student_app/core/providers/academic_session_provider.dart';
import 'package:student_app/features/batches/presentation/providers/batches_provider.dart';

class TimetableScreen extends StatefulWidget {
  const TimetableScreen({super.key});

  @override
  State<TimetableScreen> createState() => _TimetableScreenState();
}

class _TimetableScreenState extends State<TimetableScreen> {
  String? _lastSessionId;
  String _selectedBatchId = 'All';
  // Days of week: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
  final List<Map<String, dynamic>> _daysConfig = [
    {'name': 'Monday', 'key': 1},
    {'name': 'Tuesday', 'key': 2},
    {'name': 'Wednesday', 'key': 3},
    {'name': 'Thursday', 'key': 4},
    {'name': 'Friday', 'key': 5},
    {'name': 'Saturday', 'key': 6},
    {'name': 'Sunday', 'key': 0},
  ];

  @override
  Widget build(BuildContext context) {
    final sessionProv = Provider.of<AcademicSessionProvider>(context);
    final ttProviderListen = Provider.of<TimetableProvider>(context, listen: false);

    if (sessionProv.selectedSessionId != null && sessionProv.selectedSessionId != _lastSessionId) {
      _lastSessionId = sessionProv.selectedSessionId;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ttProviderListen.loadTimetable(refresh: true, sessionId: _lastSessionId);
      });
    }

    final batchesProv = Provider.of<BatchesProvider>(context);

    return Consumer<TimetableProvider>(
      builder: (context, ttProvider, _) {
        final currentDayKey = _daysConfig.firstWhere(
          (d) => d['key'] == ttProvider.selectedDayIndex,
          orElse: () => _daysConfig[0],
        )['key'] as int;

        final rawSlots = ttProvider.weeklySchedule[currentDayKey] ?? [];

        // Build a mapping of batchId -> Name
        final Map<String, String> batchMap = {'All': 'All Batches'};
        for (final b in batchesProv.batches) {
          batchMap[b.id] = '${b.courseName} - ${b.name}';
        }
        for (final s in rawSlots) {
          if (s.batchId.isNotEmpty && !batchMap.containsKey(s.batchId)) {
            batchMap[s.batchId] = '${s.courseName} - ${s.batchName}';
          }
        }

        // If the selected batch is no longer in the list (e.g. session changed), fallback to All
        if (!batchMap.containsKey(_selectedBatchId)) {
          _selectedBatchId = 'All';
        }

        // Filter slots
        final slots = _selectedBatchId == 'All'
            ? rawSlots
            : rawSlots.where((s) => s.batchId == _selectedBatchId).toList();

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
                    Icons.schedule,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  'SCHEDULE',
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
            child: Column(
              children: [
                // Day Selector Tabs
                Container(
                  height: 52,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(
                      bottom: BorderSide(color: Color(0xFFC4C6CF), width: 1),
                    ),
                  ),
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    itemCount: _daysConfig.length,
                    itemBuilder: (context, index) {
                      final dayItem = _daysConfig[index];
                      final dayKey = dayItem['key'] as int;
                      final bool isActive = dayKey == currentDayKey;

                      return GestureDetector(
                        onTap: () {
                          ttProvider.setSelectedDayIndex(dayKey);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 20.0),
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            border: Border(
                              bottom: BorderSide(
                                color: isActive ? const Color(0xFF002045) : Colors.transparent,
                                width: 2.5,
                              ),
                            ),
                          ),
                          child: Text(
                            dayItem['name'] as String,
                            style: GoogleFonts.hankenGrotesk(
                              color: isActive ? const Color(0xFF002045) : const Color(0xFF545F72),
                              fontSize: 15,
                              fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                if (batchMap.length > 2)
                  Container(
                    height: 48,
                    color: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 8.0),
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      children: batchMap.entries.map((entry) {
                        final bool isSelected = _selectedBatchId == entry.key;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8.0),
                          child: ChoiceChip(
                            label: Text(
                              entry.value,
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: isSelected ? Colors.white : const Color(0xFF002045),
                              ),
                            ),
                            selected: isSelected,
                            selectedColor: const Color(0xFF002045),
                            backgroundColor: const Color(0xFFEFF4FF),
                            onSelected: (selected) {
                              if (selected) {
                                setState(() {
                                  _selectedBatchId = entry.key;
                                });
                              }
                            },
                          ),
                        );
                      }).toList(),
                    ),
                  ),

                // Main Schedule Body
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: () => ttProvider.loadTimetable(refresh: true),
                    child: ttProvider.isLoading
                        ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
                        : slots.isEmpty
                            ? _buildEmptyState()
                            : ListView.builder(
                                physics: const AlwaysScrollableScrollPhysics(),
                                itemCount: slots.length,
                                itemBuilder: (context, index) {
                                  final slot = slots[index];

                                  if (slot.isBreak || slot.type == 'Break') {
                                    return _buildLunchBanner(
                                      slot.courseName.isNotEmpty ? slot.courseName : 'RECESS / BREAK',
                                      '${slot.startTime} - ${slot.endTime}',
                                    );
                                  }

                                  // Pick a distinct accent color per index
                                  final sidebarColors = [
                                    const Color(0xFF2563EB), // Blue
                                    const Color(0xFF059669), // Green
                                    const Color(0xFFD97706), // Amber
                                    const Color(0xFF7C3AED), // Purple
                                    const Color(0xFFDC2626), // Red
                                  ];
                                  final color = sidebarColors[index % sidebarColors.length];

                                  return _buildScheduleRow(
                                    subject: slot.courseName,
                                    courseCode: slot.courseCode,
                                    instructor: slot.instructor,
                                    slotName: slot.slotName,
                                    startTime: slot.startTime,
                                    endTime: slot.endTime,
                                    sidebarColor: color,
                                  );
                                },
                              ),
                  ),
                ),
              ],
            ),
          ),
          // NOTE: Internal bottomNavigationBar removed to prevent double bottom nav bar!
          // AppShell manages the single, persistent bottom navigation bar.
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return ListView(
      children: [
        SizedBox(height: MediaQuery.of(context).size.height * 0.2),
        Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(
                  color: Color(0xFFEFF4FF),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.event_busy,
                  color: Color(0xFF002045),
                  size: 32,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'No Classes Scheduled',
                style: GoogleFonts.hankenGrotesk(
                  color: const Color(0xFF0D1C2E),
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Enjoy your break for this day!',
                style: GoogleFonts.inter(
                  color: const Color(0xFF545F72),
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // Edge-to-Edge Schedule Row Builder
  Widget _buildScheduleRow({
    required String subject,
    required String courseCode,
    required String instructor,
    required String slotName,
    required String startTime,
    required String endTime,
    required Color sidebarColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12.0),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Color(0xFFC4C6CF), width: 0.5),
        ),
      ),
      child: Row(
        children: [
          // Sidebar Sliver indicator
          Container(
            width: 4,
            height: 60,
            decoration: BoxDecoration(
              color: sidebarColor,
              borderRadius: const BorderRadius.horizontal(right: Radius.circular(2)),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  children: [
                    Text(
                      subject,
                      style: GoogleFonts.hankenGrotesk(
                        color: const Color(0xFF0D1C2E),
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (courseCode.isNotEmpty && courseCode != 'GAP') ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF4FF),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          courseCode,
                          style: GoogleFonts.inter(
                            color: const Color(0xFF002045),
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${slotName.isNotEmpty ? '$slotName · ' : ''}Instructor: $instructor',
                  style: GoogleFonts.inter(
                    color: const Color(0xFF545F72),
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  startTime,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF002045),
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  endTime,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF545F72),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Lunch / Break Banner Builder
  Widget _buildLunchBanner(String label, String duration) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16.0),
      alignment: Alignment.center,
      decoration: const BoxDecoration(
        color: Color(0xFFEFF4FF),
        border: Border(
          bottom: BorderSide(color: Color(0xFFC4C6CF), width: 0.5),
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.restaurant,
            color: Color(0xFF545F72),
            size: 22,
          ),
          const SizedBox(height: 4),
          Text(
            label.toUpperCase(),
            style: GoogleFonts.hankenGrotesk(
              color: const Color(0xFF002045),
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 2.0,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            duration,
            style: GoogleFonts.inter(
              color: const Color(0xFF545F72),
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
