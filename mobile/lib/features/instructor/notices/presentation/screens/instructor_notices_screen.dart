import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/features/instructor/dashboard/presentation/widgets/post_notice_sheet.dart';
import 'package:student_app/features/instructor/notices/data/models/instructor_notice_model.dart';
import 'package:student_app/features/instructor/notices/presentation/providers/instructor_notices_provider.dart';
import 'package:student_app/l10n/app_localizations.dart';

class InstructorNoticesScreen extends StatefulWidget {
  const InstructorNoticesScreen({super.key});

  @override
  State<InstructorNoticesScreen> createState() => _InstructorNoticesScreenState();
}

class _InstructorNoticesScreenState extends State<InstructorNoticesScreen> {
  final TextEditingController _searchController = TextEditingController();
  final List<String> _categories = ['All', 'Urgent', 'Exam', 'Holiday', 'General'];
  String _selectedCategory = 'All';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Color _getCategoryColor(String category) {
    switch (category.toUpperCase()) {
      case 'URGENT':
        return const Color(0xFFEF4444);
      case 'EXAM':
        return const Color(0xFF8B5CF6);
      case 'HOLIDAY':
        return const Color(0xFF10B981);
      case 'GENERAL':
      default:
        return const Color(0xFF2563EB);
    }
  }

  Color _getCategoryBg(String category) {
    switch (category.toUpperCase()) {
      case 'URGENT':
        return const Color(0xFFFEF2F2);
      case 'EXAM':
        return const Color(0xFFF5F3FF);
      case 'HOLIDAY':
        return const Color(0xFFECFDF5);
      case 'GENERAL':
      default:
        return const Color(0xFFEFF6FF);
    }
  }

  IconData _getCategoryIcon(String category) {
    switch (category.toUpperCase()) {
      case 'URGENT':
        return Icons.warning_amber_rounded;
      case 'EXAM':
        return Icons.quiz_outlined;
      case 'HOLIDAY':
        return Icons.beach_access_outlined;
      case 'GENERAL':
      default:
        return Icons.campaign_outlined;
    }
  }

  String _formatNoticeDate(String? rawDate) {
    if (rawDate == null || rawDate.isEmpty) return '';
    try {
      final dt = DateTime.parse(rawDate);
      return DateFormat('MMM d, yyyy').format(dt);
    } catch (_) {
      return rawDate.length > 10 ? rawDate.substring(0, 10) : rawDate;
    }
  }

  void _showNoticeDetails(BuildContext context, InstructorNoticeItem notice) {
    final catColor = _getCategoryColor(notice.category);
    final catBg = _getCategoryBg(notice.category);
    final dateStr = _formatNoticeDate(notice.createdAt);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (modalContext) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(modalContext).viewInsets.bottom + 20,
            top: 16,
            left: 20,
            right: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFC4C6CF),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Category Pill & Date
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: catBg,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      notice.category.toUpperCase(),
                      style: GoogleFonts.inter(
                        color: catColor,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  if (dateStr.isNotEmpty)
                    Text(
                      dateStr,
                      style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 12),
                    ),
                ],
              ),
              const SizedBox(height: 12),

              // Notice Title
              Text(
                notice.title,
                style: GoogleFonts.hankenGrotesk(
                  color: const Color(0xFF0D1C2E),
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  height: 1.3,
                ),
              ),

              if (notice.authorName != null && notice.authorName!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  'Published by ${notice.authorName}',
                  style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 12, fontWeight: FontWeight.w500),
                ),
              ],

              const SizedBox(height: 14),
              const Divider(height: 1, color: Color(0xFFE2E8F0)),
              const SizedBox(height: 14),

              // Full Content (Scrollable if very long)
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.4,
                ),
                child: SingleChildScrollView(
                  child: Text(
                    notice.content,
                    style: GoogleFonts.inter(
                      color: const Color(0xFF334155),
                      fontSize: 14,
                      height: 1.5,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Close button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(modalContext),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF002045),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                    elevation: 0,
                  ),
                  child: Text(
                    'Close',
                    style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InstructorNoticesProvider>();
    final auth = context.watch<AuthProvider>();
    final l10n = AppLocalizations.of(context);
    final notices = provider.notices;

    // Filter by search query and category
    final query = _searchController.text.trim().toLowerCase();
    final filtered = notices.where((n) {
      if (_selectedCategory != 'All' && n.category.toUpperCase() != _selectedCategory.toUpperCase()) {
        return false;
      }
      if (query.isNotEmpty) {
        final matchesTitle = n.title.toLowerCase().contains(query);
        final matchesContent = n.content.toLowerCase().contains(query);
        final matchesAuthor = n.authorName?.toLowerCase().contains(query) ?? false;
        if (!matchesTitle && !matchesContent && !matchesAuthor) return false;
      }
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
          l10n?.noticesTitle ?? 'Notices & Announcements',
          style: GoogleFonts.hankenGrotesk(
            color: const Color(0xFF002045),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          // Only show Post Notice button if user has manage_notices permission
          if (auth.hasPermission('manage_notices'))
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: ElevatedButton.icon(
                onPressed: () async {
                  final posted = await PostNoticeSheet.show(context);
                  if (posted == true) {
                    provider.loadNotices(refresh: true);
                  }
                },
                icon: const Icon(Icons.add_rounded, size: 16, color: Colors.white),
                label: Text(
                  l10n?.postNotice ?? 'Post Notice',
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
          onRefresh: () => provider.loadNotices(refresh: true),
          color: const Color(0xFF002045),
          child: Column(
            children: [
              // Search & Category Filter Section (matching student portal)
              Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
                child: Column(
                  children: [
                    // Search Bar
                    Container(
                      height: 42,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF4FF),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: const Color(0xFFC4C6CF)),
                      ),
                      child: TextField(
                        controller: _searchController,
                        onChanged: (val) => setState(() {}),
                        style: GoogleFonts.inter(fontSize: 13.5, color: const Color(0xFF0D1C2E)),
                        decoration: InputDecoration(
                          hintText: 'Search notices & circulars...',
                          hintStyle: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF545F72)),
                          prefixIcon: const Icon(Icons.search, size: 19, color: Color(0xFF545F72)),
                          suffixIcon: _searchController.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear, size: 17, color: Color(0xFF545F72)),
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() {});
                                  },
                                )
                              : null,
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Horizontal Category Filters
                    SizedBox(
                      height: 32,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _categories.length,
                        separatorBuilder: (context, index) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final cat = _categories[index];
                          final isSelected = _selectedCategory == cat;

                          return GestureDetector(
                            onTap: () => setState(() => _selectedCategory = cat),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFF002045) : const Color(0xFFEFF4FF),
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(
                                  color: isSelected ? const Color(0xFF002045) : const Color(0xFFC4C6CF),
                                ),
                              ),
                              child: Text(
                                cat,
                                style: GoogleFonts.inter(
                                  color: isSelected ? Colors.white : const Color(0xFF545F72),
                                  fontSize: 12,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: Color(0xFFC4C6CF)),

              // Notice List Content
              Expanded(
                child: provider.isLoading && notices.isEmpty
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFF002045)))
                    : filtered.isEmpty
                        ? _buildEmptyState()
                        : ListView.separated(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.all(16.0),
                            itemCount: filtered.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final notice = filtered[index];
                              return _buildNoticeCard(context, notice);
                            },
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNoticeCard(BuildContext context, InstructorNoticeItem notice) {
    final catColor = _getCategoryColor(notice.category);
    final catBg = _getCategoryBg(notice.category);
    final catIcon = _getCategoryIcon(notice.category);
    final dateStr = _formatNoticeDate(notice.createdAt);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFC4C6CF)),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(4),
        child: InkWell(
          onTap: () => _showNoticeDetails(context, notice),
          borderRadius: BorderRadius.circular(4),
          child: Padding(
            padding: const EdgeInsets.all(14.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Category Pill + Date
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: catBg,
                        borderRadius: BorderRadius.circular(3),
                      ),
                      child: Text(
                        notice.category.toUpperCase(),
                        style: GoogleFonts.inter(
                          color: catColor,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    if (dateStr.isNotEmpty)
                      Text(
                        dateStr,
                        style: GoogleFonts.inter(
                          color: const Color(0xFF545F72),
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),

                // Main Title & Description Snippet
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: catBg,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(catIcon, color: catColor, size: 18),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            notice.title,
                            style: GoogleFonts.hankenGrotesk(
                              color: const Color(0xFF0D1C2E),
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              height: 1.25,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            notice.content,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              color: const Color(0xFF545F72),
                              fontSize: 12,
                              height: 1.35,
                            ),
                          ),
                          if (notice.authorName != null && notice.authorName!.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              'By ${notice.authorName}',
                              style: GoogleFonts.inter(
                                color: const Color(0xFF545F72),
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return ListView(
      children: [
        SizedBox(height: MediaQuery.of(context).size.height * 0.15),
        Center(
          child: Column(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: const BoxDecoration(
                  color: Color(0xFFEFF4FF),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.campaign_outlined,
                  color: Color(0xFF002045),
                  size: 28,
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'No Notices Found',
                style: GoogleFonts.hankenGrotesk(
                  color: const Color(0xFF0D1C2E),
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'There are no announcements matching your filter.',
                style: GoogleFonts.inter(
                  color: const Color(0xFF545F72),
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
