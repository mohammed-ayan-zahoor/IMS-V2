import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:student_app/features/instructor/calendar/presentation/providers/instructor_calendar_provider.dart';
import 'package:student_app/l10n/app_localizations.dart';

class InstructorCalendarScreen extends StatefulWidget {
  const InstructorCalendarScreen({super.key});

  @override
  State<InstructorCalendarScreen> createState() => _InstructorCalendarScreenState();
}

class _InstructorCalendarScreenState extends State<InstructorCalendarScreen> {
  DateTime _focusedMonth = DateTime.now();

  Color _getBadgeColor(String category) {
    if (category.contains('HOLIDAY')) return const Color(0xFF10B981);
    if (category.contains('EXAM')) return const Color(0xFF8B5CF6);
    return const Color(0xFF2563EB);
  }

  Color _getBadgeBg(String category) {
    if (category.contains('HOLIDAY')) return const Color(0xFFECFDF5);
    if (category.contains('EXAM')) return const Color(0xFFF5F3FF);
    return const Color(0xFFEFF6FF);
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InstructorCalendarProvider>();
    final l10n = AppLocalizations.of(context);
    final monthLabel = DateFormat('MMMM yyyy').format(_focusedMonth);

    // Filter events for the focused month
    final events = provider.events.where((e) {
      if (e.startDate == null) return true;
      return e.startDate!.year == _focusedMonth.year && e.startDate!.month == _focusedMonth.month;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          l10n?.calendarTitle ?? 'School Calendar',
          style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 17),
        ),
      ),
      body: Column(
        children: [
          // Month Selector Bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left_rounded),
                  onPressed: () {
                    setState(() {
                      _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month - 1);
                    });
                  },
                ),
                Text(
                  monthLabel,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right_rounded),
                  onPressed: () {
                    setState(() {
                      _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1);
                    });
                  },
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => provider.loadEvents(refresh: true),
              color: const Color(0xFF002045),
              child: provider.isLoading && provider.events.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : events.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.event_busy_outlined, size: 48, color: Color(0xFF94A3B8)),
                              const SizedBox(height: 10),
                              Text(
                                'No events scheduled for $monthLabel',
                                style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: events.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final event = events[index];
                            final category = event.category ?? 'EVENT';
                            final dayStr = event.startDate != null ? DateFormat('d').format(event.startDate!) : '--';
                            final dayName = event.startDate != null ? DateFormat('EEE').format(event.startDate!) : '';

                            return Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: const Color(0xFFF1F5F9)),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.02),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Date Block
                                  Container(
                                    width: 48,
                                    padding: const EdgeInsets.symmetric(vertical: 8),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF8FAFC),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: const Color(0xFFE2E8F0)),
                                    ),
                                    child: Column(
                                      children: [
                                        Text(
                                          dayStr,
                                          style: const TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFF0F172A),
                                          ),
                                        ),
                                        Text(
                                          dayName,
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: Color(0xFF64748B),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Expanded(
                                              child: Text(
                                                event.title,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                  fontSize: 15,
                                                  fontWeight: FontWeight.w700,
                                                  color: Color(0xFF0F172A),
                                                ),
                                              ),
                                            ),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                              decoration: BoxDecoration(
                                                color: _getBadgeBg(category),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                category,
                                                style: TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w700,
                                                  color: _getBadgeColor(category),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        if (event.description != null && event.description!.isNotEmpty) ...[
                                          const SizedBox(height: 6),
                                          Text(
                                            event.description!,
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                          ),
                                        ],
                                        if (event.location != null && event.location!.isNotEmpty) ...[
                                          const SizedBox(height: 8),
                                          Row(
                                            children: [
                                              const Icon(Icons.location_on_outlined, size: 13, color: Color(0xFF64748B)),
                                              const SizedBox(width: 4),
                                              Text(
                                                event.location!,
                                                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }
}
