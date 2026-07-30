import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:student_app/features/timeline/presentation/providers/timeline_provider.dart';
import 'package:student_app/features/timeline/data/models/timeline_model.dart';

class TimelineScreen extends StatefulWidget {
  const TimelineScreen({super.key});

  @override
  State<TimelineScreen> createState() => _TimelineScreenState();
}

class _TimelineScreenState extends State<TimelineScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<TimelineProvider>(context, listen: false).loadTimeline(refresh: true);
    });
  }

  Color _getCategoryColor(String category) {
    switch (category.toLowerCase()) {
      case 'achievement': return const Color(0xFF854D0E);
      case 'disciplinary': return const Color(0xFF991B1B);
      case 'milestone': return const Color(0xFF166534);
      case 'general':
      default: return const Color(0xFF1E3A8A);
    }
  }

  Color _getCategoryBgColor(String category) {
    switch (category.toLowerCase()) {
      case 'achievement': return const Color(0xFFFEF08A);
      case 'disciplinary': return const Color(0xFFFEE2E2);
      case 'milestone': return const Color(0xFFDCFCE7);
      case 'general':
      default: return const Color(0xFFBFDBFE);
    }
  }

  Color _getDotColor(String category) {
    switch (category.toLowerCase()) {
      case 'achievement': return const Color(0xFF002045);
      case 'disciplinary': return const Color(0xFFEF4444);
      case 'milestone': return const Color(0xFF16A34A);
      case 'general':
      default: return const Color(0xFF545F72);
    }
  }

  IconData? _getIcon(String category) {
    switch (category.toLowerCase()) {
      case 'achievement': return Icons.workspace_premium;
      case 'disciplinary': return Icons.warning;
      case 'milestone': return Icons.flag;
      case 'general':
      default: return Icons.event;
    }
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
          'Student Timeline',
          style: GoogleFonts.hankenGrotesk(
            color: const Color(0xFF0D1C2E),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: false,
      ),
      body: Consumer<TimelineProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF002045))));
          }

          if (provider.errorMessage != null && provider.events.isEmpty) {
            return Center(child: Text(provider.errorMessage!, style: GoogleFonts.inter(color: Colors.red)));
          }

          if (provider.events.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.event_note, size: 64, color: Color(0xFF545F72)),
                  const SizedBox(height: 16),
                  Text(
                    'No timeline events found',
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
            onRefresh: () => provider.loadTimeline(refresh: true),
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 24.0),
              physics: const AlwaysScrollableScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Student Timeline',
                    style: GoogleFonts.hankenGrotesk(
                      color: const Color(0xFF002045),
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'A record of your achievements, milestones, and notable moments.',
                    style: GoogleFonts.inter(
                      color: const Color(0xFF545F72),
                      fontSize: 14,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Timeline Feed
                  Stack(
                    children: [
                      // Background vertical line
                      Positioned(
                        left: 20,
                        top: 8,
                        bottom: 8,
                        child: Container(
                          width: 2,
                          color: const Color(0xFFC4C6CF), // outline-variant
                        ),
                      ),

                      // Feed Items
                      Column(
                        children: provider.events.map((event) => _buildTimelineRow(event)).toList(),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildTimelineRow(TimelineEventModel event) {
    final formattedDate = DateFormat('MMM dd, yyyy').format(event.date);
    final categoryColor = _getCategoryColor(event.category);
    final categoryBgColor = _getCategoryBgColor(event.category);
    final dotColor = _getDotColor(event.category);
    final icon = _getIcon(event.category);

    return Padding(
      padding: const EdgeInsets.only(bottom: 24.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left Dot
          Container(
            width: 42,
            alignment: Alignment.topCenter,
            padding: const EdgeInsets.only(top: 6),
            child: Container(
              width: 14,
              height: 14,
              decoration: BoxDecoration(
                color: dotColor,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 3),
                boxShadow: [
                  BoxShadow(
                    color: dotColor.withValues(alpha: 0.3),
                    blurRadius: 4,
                    spreadRadius: 1,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 12),

          // Right Card Detail area
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Date label
                Text(
                  formattedDate,
                  style: GoogleFonts.hankenGrotesk(
                    color: const Color(0xFF002045),
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),

                // Core Card
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFC4C6CF).withValues(alpha: 0.8)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Image header if exists
                      if (event.photoUrl != null && event.photoUrl!.isNotEmpty)
                        Image.network(
                          event.photoUrl!,
                          height: 160,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            height: 160,
                            color: const Color(0xFFEFF4FF),
                            child: const Icon(
                              Icons.broken_image_outlined,
                              color: Color(0xFF545F72),
                            ),
                          ),
                        ),

                      // Card Content
                      Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Icon prefix if exists
                            if (icon != null) ...[
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: categoryBgColor,
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  icon,
                                  color: categoryColor,
                                  size: 22,
                                ),
                              ),
                              const SizedBox(width: 12),
                            ],

                            // Text details
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Category Badge
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: categoryBgColor,
                                      borderRadius: BorderRadius.circular(100),
                                    ),
                                    child: Text(
                                      event.category.toUpperCase(),
                                      style: GoogleFonts.inter(
                                        color: categoryColor,
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 0.8,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 8),

                                  // Title
                                  Text(
                                    event.title,
                                    style: GoogleFonts.hankenGrotesk(
                                      color: const Color(0xFF0D1C2E),
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 6),

                                  // Description
                                  Text(
                                    event.description,
                                    style: GoogleFonts.inter(
                                      color: const Color(0xFF545F72),
                                      fontSize: 13,
                                      height: 1.4,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
