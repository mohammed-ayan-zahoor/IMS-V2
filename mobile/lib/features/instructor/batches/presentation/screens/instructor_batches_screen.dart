import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/instructor/batches/presentation/providers/instructor_batches_provider.dart';
import 'package:student_app/features/instructor/syllabus/presentation/screens/instructor_syllabus_screen.dart';
import 'package:student_app/l10n/app_localizations.dart';

class InstructorBatchesScreen extends StatefulWidget {
  final Function(String batchId)? onTakeAttendance;

  const InstructorBatchesScreen({
    super.key,
    this.onTakeAttendance,
  });

  @override
  State<InstructorBatchesScreen> createState() => _InstructorBatchesScreenState();
}

class _InstructorBatchesScreenState extends State<InstructorBatchesScreen> {
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InstructorBatchesProvider>();
    final l10n = AppLocalizations.of(context);

    final filtered = provider.batches.where((b) {
      final query = _searchQuery.toLowerCase();
      return b.name.toLowerCase().contains(query) ||
          b.courseName.toLowerCase().contains(query);
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FF),
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          l10n?.myBatches ?? 'My Batches',
          style: GoogleFonts.hankenGrotesk(
            color: const Color(0xFF002045),
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: TextField(
                onChanged: (val) => setState(() => _searchQuery = val),
                decoration: InputDecoration(
                  hintText: l10n?.searchBatchesHint ?? 'Search batches or courses...',
                  hintStyle: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF545F72)),
                  prefixIcon: const Icon(Icons.search, size: 20, color: Color(0xFF545F72)),
                  filled: true,
                  fillColor: const Color(0xFFEFF4FF),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(4),
                    borderSide: const BorderSide(color: Color(0xFFC4C6CF)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(4),
                    borderSide: const BorderSide(color: Color(0xFFC4C6CF)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(4),
                    borderSide: const BorderSide(color: Color(0xFF002045), width: 1.5),
                  ),
                ),
              ),
            ),
            const Divider(height: 1, color: Color(0xFFC4C6CF)),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => provider.loadBatches(refresh: true),
                color: const Color(0xFF002045),
                child: provider.isLoading && provider.batches.isEmpty
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFF002045)))
                    : filtered.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.groups_outlined, size: 54, color: Color(0xFF545F72)),
                                const SizedBox(height: 12),
                                Text(
                                  l10n?.emptyState ?? 'No batches found',
                                  style: GoogleFonts.hankenGrotesk(
                                    color: const Color(0xFF0D1C2E),
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
                            itemCount: filtered.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final batch = filtered[index];
                              return Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: const Color(0xFFC4C6CF)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Top Row: Class / Course Name (Highlighted) + Section Badge
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      crossAxisAlignment: CrossAxisAlignment.center,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            batch.courseName.isNotEmpty ? batch.courseName : 'Class ${batch.name}',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: GoogleFonts.hankenGrotesk(
                                              fontSize: 17,
                                              fontWeight: FontWeight.bold,
                                              color: const Color(0xFF0D1C2E),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFEFF4FF),
                                            borderRadius: BorderRadius.circular(4),
                                            border: Border.all(color: const Color(0xFFC7D2FE)),
                                          ),
                                          child: Text(
                                            'Section ${batch.name}',
                                            style: GoogleFonts.inter(
                                              fontSize: 11.5,
                                              fontWeight: FontWeight.bold,
                                              color: const Color(0xFF002045),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    // Meta info: Enrolled Students + Timing
                                    Row(
                                      children: [
                                        const Icon(Icons.people_outline, size: 15, color: Color(0xFF545F72)),
                                        const SizedBox(width: 6),
                                        Text(
                                          '${batch.studentCount} Students Enrolled',
                                          style: GoogleFonts.inter(
                                            fontSize: 12.5,
                                            fontWeight: FontWeight.w500,
                                            color: const Color(0xFF545F72),
                                          ),
                                        ),
                                        if (batch.timing != null && batch.timing!.isNotEmpty) ...[
                                          const SizedBox(width: 14),
                                          const Icon(Icons.schedule, size: 14, color: Color(0xFF545F72)),
                                          const SizedBox(width: 4),
                                          Text(
                                            batch.timing!,
                                            style: GoogleFonts.inter(
                                              fontSize: 12,
                                              color: const Color(0xFF545F72),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                    const SizedBox(height: 14),
                                    const Divider(height: 1, color: Color(0xFFE2E8F0)),
                                    const SizedBox(height: 12),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: ElevatedButton.icon(
                                            onPressed: () {
                                              widget.onTakeAttendance?.call(batch.id);
                                            },
                                            icon: const Icon(Icons.fact_check_outlined, size: 15, color: Colors.white),
                                            label: Text(
                                              l10n?.markAttendance ?? 'Attendance',
                                              style: GoogleFonts.inter(
                                                fontSize: 12,
                                                fontWeight: FontWeight.bold,
                                                color: Colors.white,
                                              ),
                                            ),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: const Color(0xFF002045),
                                              elevation: 0,
                                              padding: const EdgeInsets.symmetric(vertical: 10),
                                              shape: RoundedRectangleBorder(
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: OutlinedButton.icon(
                                            onPressed: () {
                                              Navigator.push(
                                                context,
                                                MaterialPageRoute(
                                                  builder: (_) => InstructorSyllabusScreen(
                                                    initialBatchId: batch.id,
                                                  ),
                                                ),
                                              );
                                            },
                                            icon: const Icon(Icons.auto_stories_outlined, size: 15, color: Color(0xFF002045)),
                                            label: Text(
                                              'Syllabus',
                                              style: GoogleFonts.inter(
                                                fontSize: 12,
                                                fontWeight: FontWeight.bold,
                                                color: const Color(0xFF002045),
                                              ),
                                            ),
                                            style: OutlinedButton.styleFrom(
                                              side: const BorderSide(color: Color(0xFFCBD5E1)),
                                              padding: const EdgeInsets.symmetric(vertical: 10),
                                              shape: RoundedRectangleBorder(
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
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
      ),
    );
  }
}
