import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:student_app/features/instructor/materials/data/models/instructor_material_model.dart';
import 'package:student_app/features/instructor/materials/presentation/providers/instructor_materials_provider.dart';
import 'package:student_app/features/instructor/materials/presentation/screens/material_submissions_screen.dart';
import 'package:student_app/features/instructor/materials/presentation/widgets/upload_material_sheet.dart';
import 'package:student_app/l10n/app_localizations.dart';

class InstructorMaterialsScreen extends StatefulWidget {
  const InstructorMaterialsScreen({super.key});

  @override
  State<InstructorMaterialsScreen> createState() => _InstructorMaterialsScreenState();
}

class _InstructorMaterialsScreenState extends State<InstructorMaterialsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _activeSegment = 'All'; // 'All', 'PDFs', 'Videos', 'Assignments'
  String _selectedCourse = 'All';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _openMaterialUrl(BuildContext context, InstructorMaterialItem material) async {
    if (material.fileUrl == null || material.fileUrl!.isEmpty) return;
    final uri = Uri.tryParse(material.fileUrl!);
    if (uri == null) return;

    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
    } catch (_) {
      try {
        await launchUrl(uri, mode: LaunchMode.platformDefault);
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Could not open resource: ${material.fileUrl}')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InstructorMaterialsProvider>();
    final l10n = AppLocalizations.of(context);
    final materials = provider.materials;

    // Distinct list of courses for filter chips
    final courseNames = <String>{'All'};
    for (var m in materials) {
      if (m.courseName != null && m.courseName!.isNotEmpty) {
        courseNames.add(m.courseName!);
      }
    }
    final courseList = courseNames.toList();

    // Filter materials by search, segment, and course
    final filtered = materials.where((m) {
      // 1. Search Query
      final query = _searchController.text.trim().toLowerCase();
      if (query.isNotEmpty) {
        final matchesTitle = m.title.toLowerCase().contains(query);
        final matchesCourse = m.courseName?.toLowerCase().contains(query) ?? false;
        final matchesDesc = m.description?.toLowerCase().contains(query) ?? false;
        if (!matchesTitle && !matchesCourse && !matchesDesc) return false;
      }

      // 2. Segment
      if (_activeSegment == 'PDFs' && !m.isPdf) return false;
      if (_activeSegment == 'Videos' && !m.isVideo) return false;
      if (_activeSegment == 'Assignments' && !m.isAssignment) return false;

      // 3. Course filter
      if (_selectedCourse != 'All' && m.courseName != _selectedCourse) return false;

      return true;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FF),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: Navigator.canPop(context)
            ? IconButton(
                icon: const Icon(Icons.arrow_back, color: Color(0xFF002045)),
                onPressed: () => Navigator.of(context).pop(),
              )
            : null,
        title: Text(
          l10n?.studyMaterials ?? 'Study Materials',
          style: GoogleFonts.hankenGrotesk(
            color: const Color(0xFF002045),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: ElevatedButton.icon(
              onPressed: () async {
                final result = await UploadMaterialSheet.show(context);
                if (result == true) {
                  provider.loadMaterials(refresh: true);
                }
              },
              icon: const Icon(Icons.add, size: 16, color: Colors.white),
              label: Text(
                'Upload Material',
                style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF002045),
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => provider.loadMaterials(refresh: true),
          color: const Color(0xFF002045),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
            children: [
              Text(
                'Upload and manage lecture notes, assignments, and reference materials for your assigned courses.',
                style: GoogleFonts.inter(
                  color: const Color(0xFF545F72),
                  fontSize: 13,
                  fontWeight: FontWeight.w400,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 16),

              // Segmented Control (All, PDFs, Videos, Assignments)
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF4FF),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  children: [
                    _buildSegmentButton('All'),
                    _buildSegmentButton('PDFs'),
                    _buildSegmentButton('Videos'),
                    _buildSegmentButton('Assignments'),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Search Bar
              Container(
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: const Color(0xFFC4C6CF)),
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: (val) => setState(() {}),
                  style: GoogleFonts.inter(fontSize: 13.5, color: const Color(0xFF0D1C2E)),
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.search, color: Color(0xFF545F72), size: 19),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 17, color: Color(0xFF545F72)),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {});
                            },
                          )
                        : null,
                    hintText: 'Search materials by title or course...',
                    hintStyle: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 13),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Course Filter Chips
              if (courseList.length > 1) ...[
                SizedBox(
                  height: 34,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: courseList.length,
                    separatorBuilder: (context, index) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final course = courseList[index];
                      final isSelected = _selectedCourse == course;
                      return GestureDetector(
                        onTap: () => setState(() => _selectedCourse = course),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFF002045) : Colors.white,
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(
                              color: isSelected ? const Color(0xFF002045) : const Color(0xFFC4C6CF),
                            ),
                          ),
                          child: Text(
                            course,
                            style: GoogleFonts.inter(
                              color: isSelected ? Colors.white : const Color(0xFF0D1C2E),
                              fontSize: 12,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Content List
              if (provider.isLoading && materials.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 50.0),
                  child: Center(child: CircularProgressIndicator(color: Color(0xFF002045))),
                )
              else if (filtered.isEmpty)
                _buildEmptyState()
              else
                ...filtered.map((item) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12.0),
                    child: _buildMaterialCard(context, item),
                  );
                }),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSegmentButton(String label) {
    final bool isSelected = _activeSegment == label;

    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _activeSegment = label),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 7),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(4),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 3,
                      offset: const Offset(0, 1),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              color: isSelected ? const Color(0xFF002045) : const Color(0xFF545F72),
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMaterialCard(BuildContext context, InstructorMaterialItem item) {
    final isAssignment = item.isAssignment;
    final isVideo = item.isVideo;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(
          color: isAssignment ? const Color(0xFF93C5FD) : const Color(0xFFC4C6CF),
        ),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icon Box (Red for PDF, Blue for Assignment, Indigo for Video)
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: isAssignment
                        ? const Color(0xFFEFF6FF)
                        : (isVideo ? const Color(0xFFEEF2FF) : const Color(0xFFFEF2F2)),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Center(
                    child: Icon(
                      isAssignment
                          ? Icons.assignment_outlined
                          : (isVideo ? Icons.smart_display_outlined : Icons.picture_as_pdf),
                      color: isAssignment
                          ? const Color(0xFF2563EB)
                          : (isVideo ? const Color(0xFF6366F1) : const Color(0xFFEF4444)),
                      size: 22,
                    ),
                  ),
                ),
                const SizedBox(width: 12),

                // Title and Metadata
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.hankenGrotesk(
                          color: const Color(0xFF0D1C2E),
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          if (item.courseName != null && item.courseName!.isNotEmpty)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF4FF),
                                borderRadius: BorderRadius.circular(3),
                              ),
                              child: Text(
                                item.courseName!,
                                style: GoogleFonts.inter(
                                  color: const Color(0xFF002045),
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          if (item.batchName != null && item.batchName!.isNotEmpty)
                            Text(
                              'Sec ${item.batchName}',
                              style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 11),
                            ),
                          Text(
                            item.formattedSize,
                            style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 11, fontWeight: FontWeight.w500),
                          ),
                          if (item.totalMarks != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(3),
                              ),
                              child: Text(
                                '${item.totalMarks} pts',
                                style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: const Color(0xFFB45309)),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Download/Open action icon
                if (item.fileUrl != null && item.fileUrl!.isNotEmpty)
                  IconButton(
                    icon: Icon(
                      isVideo ? Icons.play_circle_outline : Icons.open_in_new,
                      color: const Color(0xFF002045),
                      size: 20,
                    ),
                    onPressed: () => _openMaterialUrl(context, item),
                    tooltip: 'Open Resource',
                  ),
              ],
            ),

            if (item.description != null && item.description!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                item.description!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 12),
              ),
            ],

            // Dedicated Submissions Row for Assignments
            if (isAssignment) ...[
              const SizedBox(height: 10),
              const Divider(height: 1, color: Color(0xFFE2E8F0)),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.people_alt_outlined, size: 14, color: Color(0xFF2563EB)),
                      const SizedBox(width: 4),
                      Text(
                        'Student Submissions',
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF2563EB)),
                      ),
                    ],
                  ),
                  OutlinedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => MaterialSubmissionsScreen(
                            materialId: item.id,
                            materialTitle: item.title,
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.grading_rounded, size: 14, color: Color(0xFF002045)),
                    label: Text(
                      'View Submissions',
                      style: GoogleFonts.inter(fontSize: 11.5, fontWeight: FontWeight.bold, color: const Color(0xFF002045)),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      side: const BorderSide(color: Color(0xFFC4C6CF)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40.0),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: const BoxDecoration(
              color: Color(0xFFEFF4FF),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.menu_book, color: Color(0xFF002045), size: 28),
          ),
          const SizedBox(height: 14),
          Text(
            'No Materials Found',
            style: GoogleFonts.hankenGrotesk(color: const Color(0xFF0D1C2E), fontSize: 17, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            'There are no study materials matching your filter.',
            style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 13),
          ),
        ],
      ),
    );
  }
}
