import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:student_app/features/batches/presentation/providers/batches_provider.dart';
import 'package:student_app/features/batches/data/models/batch_model.dart';

class BatchesScreen extends StatefulWidget {
  const BatchesScreen({super.key});

  @override
  State<BatchesScreen> createState() => _BatchesScreenState();
}

class _BatchesScreenState extends State<BatchesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<BatchesProvider>(context, listen: false).loadBatches(refresh: true);
    });
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final parsed = DateTime.parse(dateStr);
      return DateFormat('MMM dd, yyyy').format(parsed);
    } catch (_) {
      return dateStr;
    }
  }

  String _getDayName(int day) {
    switch (day) {
      case 0: return 'Sun';
      case 1: return 'Mon';
      case 2: return 'Tue';
      case 3: return 'Wed';
      case 4: return 'Thu';
      case 5: return 'Fri';
      case 6: return 'Sat';
      default: return '';
    }
  }

  String _formatSchedule(BatchModel batch) {
    if (batch.daysOfWeek.isEmpty) return 'Schedule TBD';
    final days = batch.daysOfWeek.map((d) => _getDayName(d)).where((name) => name.isNotEmpty).join(', ');
    final times = (batch.timeSlotStart != null && batch.timeSlotEnd != null)
        ? ' • ${batch.timeSlotStart} - ${batch.timeSlotEnd}'
        : '';
    return '$days$times';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FF),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF002045)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'My Batches',
          style: GoogleFonts.hankenGrotesk(
            color: const Color(0xFF002045),
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Consumer<BatchesProvider>(
          builder: (context, provider, _) {
            if (provider.isLoading) {
              return const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF002045))));
            }

            if (provider.errorMessage != null && provider.batches.isEmpty) {
              return Center(child: Text(provider.errorMessage!, style: GoogleFonts.inter(color: Colors.red)));
            }

            if (provider.batches.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.class_outlined, size: 64, color: Color(0xFF545F72)),
                    const SizedBox(height: 16),
                    Text(
                      'No batches enrolled',
                      style: GoogleFonts.hankenGrotesk(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF0D1C2E),
                      ),
                    ),
                  ],
                ),
              );
            }

            return RefreshIndicator(
              onRefresh: () => provider.loadBatches(refresh: true),
              child: ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 24.0),
                itemCount: provider.batches.length,
                separatorBuilder: (context, index) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final batch = provider.batches[index];

                  bool isCompleted = false;
                  if (batch.endDate != null) {
                    try {
                      isCompleted = DateTime.now().isAfter(DateTime.parse(batch.endDate!));
                    } catch (_) {}
                  }

                  final String status = isCompleted ? 'Completed' : 'Active';
                  final Color statusColor = isCompleted ? const Color(0xFF43474E) : const Color(0xFF002045);
                  final Color statusBgColor = isCompleted ? const Color(0xFFD4E4FC) : const Color(0xFFDCE9FF);
                  final String dateRange = '${_formatDate(batch.startDate)} - ${_formatDate(batch.endDate)}';
                  final String scheduleStr = _formatSchedule(batch);

                  return BatchAccordionCard(
                    title: batch.name,
                    status: status,
                    subtitle: batch.courseName,
                    location: 'Course Code: ${batch.courseCode}',
                    schedule: scheduleStr,
                    isScheduleTbd: batch.daysOfWeek.isEmpty,
                    duration: dateRange,
                    statusColor: statusColor,
                    statusBgColor: statusBgColor,
                    isCompleted: isCompleted,
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}

// Custom Accordion Card Widget
class BatchAccordionCard extends StatefulWidget {
  final String title;
  final String status;
  final String subtitle;
  final String location;
  final String schedule;
  final String duration;
  final Color statusColor;
  final Color statusBgColor;
  final bool isCompleted;
  final bool isScheduleTbd;

  const BatchAccordionCard({
    super.key,
    required this.title,
    required this.status,
    required this.subtitle,
    required this.location,
    required this.schedule,
    required this.duration,
    required this.statusColor,
    required this.statusBgColor,
    this.isCompleted = false,
    this.isScheduleTbd = false,
  });

  @override
  State<BatchAccordionCard> createState() => _BatchAccordionCardState();
}

class _BatchAccordionCardState extends State<BatchAccordionCard> with SingleTickerProviderStateMixin {
  bool _isExpanded = false;
  late AnimationController _rotationController;

  @override
  void initState() {
    super.initState();
    _rotationController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
  }

  @override
  void dispose() {
    _rotationController.dispose();
    super.dispose();
  }

  void _toggleExpansion() {
    setState(() {
      _isExpanded = !_isExpanded;
      if (_isExpanded) {
        _rotationController.forward();
      } else {
        _rotationController.reverse();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      duration: const Duration(milliseconds: 200),
      opacity: widget.isCompleted ? 0.7 : 1.0,
      child: Container(
        decoration: BoxDecoration(
          color: widget.isCompleted ? const Color(0xFFEFF4FF).withValues(alpha: 0.5) : Colors.white,
          border: Border.all(color: const Color(0xFFC4C6CF)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: InkWell(
          onTap: _toggleExpansion,
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: widget.statusBgColor,
                                  borderRadius: BorderRadius.circular(100),
                                ),
                                child: Text(
                                  widget.status.toUpperCase(),
                                  style: GoogleFonts.inter(
                                    color: widget.statusColor,
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            widget.title,
                            style: GoogleFonts.hankenGrotesk(
                              color: const Color(0xFF0D1C2E),
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.subtitle,
                            style: GoogleFonts.inter(
                              color: const Color(0xFF545F72),
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    RotationTransition(
                      turns: Tween(begin: 0.0, end: 0.5).animate(_rotationController),
                      child: const Icon(
                        Icons.keyboard_arrow_down,
                        color: Color(0xFF586377),
                      ),
                    ),
                  ],
                ),
                if (_isExpanded) ...[
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12.0),
                    child: Divider(color: Color(0xFFC4C6CF), height: 1),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.dns_outlined, size: 16, color: Color(0xFF545F72)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              widget.location,
                              style: GoogleFonts.inter(
                                color: const Color(0xFF545F72),
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.schedule_outlined, size: 16, color: Color(0xFF545F72)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              widget.schedule,
                              style: GoogleFonts.inter(
                                color: widget.isScheduleTbd ? const Color(0xFF991B1B) : const Color(0xFF545F72),
                                fontSize: 13,
                                fontWeight: widget.isScheduleTbd ? FontWeight.w600 : FontWeight.normal,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.date_range_outlined, size: 16, color: Color(0xFF545F72)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              widget.duration,
                              style: GoogleFonts.inter(
                                color: const Color(0xFF545F72),
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
