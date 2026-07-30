import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:student_app/features/materials/presentation/providers/materials_provider.dart';
import 'package:student_app/features/materials/data/models/materials_model.dart';
import 'package:student_app/core/providers/academic_session_provider.dart';

class LearningMaterialsScreen extends StatefulWidget {
  const LearningMaterialsScreen({super.key});

  @override
  State<LearningMaterialsScreen> createState() => _LearningMaterialsScreenState();
}

class _LearningMaterialsScreenState extends State<LearningMaterialsScreen> {
  String? _lastSessionId;
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _openMaterialUrl(BuildContext context, MaterialModel material) async {
    if (material.fileUrl.isEmpty) return;
    final uri = Uri.parse(material.fileUrl);

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
            SnackBar(content: Text('Could not open link: ${material.fileUrl}')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final sessionProv = Provider.of<AcademicSessionProvider>(context);
    final materialsProviderListen = Provider.of<MaterialsProvider>(context, listen: false);

    if (sessionProv.selectedSessionId != null && sessionProv.selectedSessionId != _lastSessionId) {
      _lastSessionId = sessionProv.selectedSessionId;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        materialsProviderListen.loadMaterials(refresh: true, sessionId: _lastSessionId);
      });
    }

    return Consumer<MaterialsProvider>(
      builder: (context, materialsProvider, _) {
        final filteredList = materialsProvider.filteredMaterials;
        final availableSubjects = materialsProvider.availableSubjects;

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
              'Learning Materials',
              style: GoogleFonts.hankenGrotesk(
                color: const Color(0xFF002045),
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            centerTitle: true,
          ),
          body: SafeArea(
            child: RefreshIndicator(
              onRefresh: () => materialsProvider.loadMaterials(refresh: true),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 20.0),
                children: [
                  Text(
                    'Access notes, assignments, and reference videos for your courses.',
                    style: GoogleFonts.inter(
                      color: const Color(0xFF545F72),
                      fontSize: 14,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Segmented Control (All, PDFs, Videos)
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF4FF),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        _buildSegmentButton('All', materialsProvider),
                        _buildSegmentButton('PDFs', materialsProvider),
                        _buildSegmentButton('Videos', materialsProvider),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Search Bar
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFC4C6CF).withValues(alpha: 0.5)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.02),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: TextField(
                      controller: _searchController,
                      onChanged: (val) => materialsProvider.setSearchQuery(val),
                      style: GoogleFonts.inter(fontSize: 14, color: const Color(0xFF0D1C2E)),
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.search, color: Color(0xFF545F72), size: 20),
                        suffixIcon: _searchController.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 18, color: Color(0xFF545F72)),
                                onPressed: () {
                                  _searchController.clear();
                                  materialsProvider.setSearchQuery('');
                                },
                              )
                            : null,
                        hintText: 'Search materials by title or subject...',
                        hintStyle: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 13),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Horizontal Subject Filter Chips
                  SizedBox(
                    height: 36,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: availableSubjects.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        final subject = availableSubjects[index];
                        final isSelected = materialsProvider.selectedSubject == subject;
                        return GestureDetector(
                          onTap: () => materialsProvider.setSelectedSubject(subject),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFF002045) : Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isSelected ? const Color(0xFF002045) : const Color(0xFFC4C6CF),
                              ),
                            ),
                            child: Text(
                              subject,
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
                  const SizedBox(height: 20),

                  // Materials List Content
                  if (materialsProvider.isLoading)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40.0),
                      child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                    )
                  else if (filteredList.isEmpty)
                    _buildEmptyState()
                  else
                    ...filteredList.map((item) {
                      if (item.isVideo) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 16.0),
                          child: _buildVideoCard(context, item),
                        );
                      } else {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 16.0),
                          child: _buildPdfCard(context, item),
                        );
                      }
                    }),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40.0),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: const BoxDecoration(
              color: Color(0xFFEFF4FF),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.menu_book,
              color: Color(0xFF002045),
              size: 32,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'No Materials Found',
            style: GoogleFonts.hankenGrotesk(
              color: const Color(0xFF0D1C2E),
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'There are no study materials matching your search.',
            style: GoogleFonts.inter(
              color: const Color(0xFF545F72),
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSegmentButton(String label, MaterialsProvider provider) {
    final bool isSelected = provider.activeSegment == label;

    return Expanded(
      child: GestureDetector(
        onTap: () => provider.setActiveSegment(label),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(6),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              color: isSelected ? const Color(0xFF002045) : const Color(0xFF545F72),
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }

  // PDF Document Card Builder
  Widget _buildPdfCard(BuildContext context, MaterialModel item) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFC4C6CF)),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: () => _openMaterialUrl(context, item),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                // Red PDF Icon Box
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Center(
                    child: Icon(Icons.picture_as_pdf, color: Color(0xFFEF4444), size: 26),
                  ),
                ),
                const SizedBox(width: 16),

                // Material Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        style: GoogleFonts.hankenGrotesk(
                          color: const Color(0xFF0D1C2E),
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF4FF),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              item.courseName.toUpperCase(),
                              style: GoogleFonts.inter(
                                color: const Color(0xFF002045),
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            item.formattedSize,
                            style: GoogleFonts.inter(
                              color: const Color(0xFF545F72),
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Download/View Icon Action
                IconButton(
                  icon: const Icon(Icons.download_rounded, color: Color(0xFF545F72)),
                  onPressed: () => _openMaterialUrl(context, item),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Video Lecture Card with YouTube Thumbnail & Play Action
  Widget _buildVideoCard(BuildContext context, MaterialModel item) {
    final String thumbnailUrl = item.youtubeThumbnailUrl;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFC4C6CF)),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: () => _openMaterialUrl(context, item),
          borderRadius: BorderRadius.circular(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // YouTube Video Thumbnail Stack
              Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    height: 180,
                    width: double.infinity,
                    decoration: const BoxDecoration(
                      color: Color(0xFF002045),
                      borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
                    ),
                    child: ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                      child: thumbnailUrl.isNotEmpty
                          ? Image.network(
                              thumbnailUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => _buildVideoFallbackBanner(),
                            )
                          : _buildVideoFallbackBanner(),
                    ),
                  ),

                  // YouTube Play Circle Button
                  Container(
                    width: 54,
                    height: 54,
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.9),
                      shape: BoxShape.circle,
                      boxShadow: const [
                        BoxShadow(
                          color: Colors.black38,
                          blurRadius: 8,
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 36),
                  ),

                  // Course Tag Badge Overlay (Top Left)
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.7),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        item.courseName.toUpperCase(),
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              // Title & Details Section
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: GoogleFonts.hankenGrotesk(
                        color: const Color(0xFF0D1C2E),
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (item.description.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        item.description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          color: const Color(0xFF545F72),
                          fontSize: 12,
                          height: 1.35,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVideoFallbackBanner() {
    return Container(
      color: const Color(0xFF002045),
      child: const Center(
        child: Icon(Icons.video_library, color: Colors.white70, size: 48),
      ),
    );
  }
}
