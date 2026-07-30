import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:student_app/features/notices/presentation/providers/notices_provider.dart';
import 'package:student_app/features/notices/data/models/notice_model.dart';

class NoticesScreen extends StatefulWidget {
  const NoticesScreen({super.key});

  @override
  State<NoticesScreen> createState() => _NoticesScreenState();
}

class _NoticesScreenState extends State<NoticesScreen> {
  final TextEditingController _searchController = TextEditingController();
  final List<String> _categories = ['All', 'Urgent', 'Event', 'General', 'Warning'];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<NoticesProvider>(
      builder: (context, noticesProvider, _) {
        final filteredList = noticesProvider.filteredNotices;

        return Scaffold(
          backgroundColor: const Color(0xFFF8F9FF),
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Color(0xFF002045)),
              onPressed: () => Navigator.of(context).pop(),
            ),
            titleSpacing: 0,
            title: Text(
              'Notices & Announcements',
              style: GoogleFonts.hankenGrotesk(
                color: const Color(0xFF002045),
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          body: SafeArea(
            child: RefreshIndicator(
              onRefresh: () => noticesProvider.loadNotices(refresh: true),
              child: Column(
                children: [
                  // Search & Category Filter Section
                  Container(
                    color: Colors.white,
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    child: Column(
                      children: [
                        // Search Bar
                        Container(
                          height: 44,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFC4C6CF).withValues(alpha: 0.5)),
                          ),
                          child: TextField(
                            controller: _searchController,
                            onChanged: (val) => noticesProvider.setSearchQuery(val),
                            style: GoogleFonts.inter(fontSize: 14, color: const Color(0xFF0D1C2E)),
                            decoration: InputDecoration(
                              hintText: 'Search notices & circulars...',
                              hintStyle: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF545F72)),
                              prefixIcon: const Icon(Icons.search, size: 20, color: Color(0xFF545F72)),
                              suffixIcon: _searchController.text.isNotEmpty
                                  ? IconButton(
                                      icon: const Icon(Icons.clear, size: 18, color: Color(0xFF545F72)),
                                      onPressed: () {
                                        _searchController.clear();
                                        noticesProvider.setSearchQuery('');
                                      },
                                    )
                                  : null,
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Horizontal Category Filters
                        SizedBox(
                          height: 36,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: _categories.length,
                            separatorBuilder: (_, __) => const SizedBox(width: 8),
                            itemBuilder: (context, index) {
                              final cat = _categories[index];
                              final isSelected = noticesProvider.selectedCategory == cat;

                              return GestureDetector(
                                onTap: () => noticesProvider.setSelectedCategory(cat),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: isSelected ? const Color(0xFF002045) : const Color(0xFFEFF4FF),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(
                                      color: isSelected ? const Color(0xFF002045) : const Color(0xFFC4C6CF).withValues(alpha: 0.5),
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

                  // Notice List Content
                  Expanded(
                    child: noticesProvider.isLoading
                        ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
                        : filteredList.isEmpty
                            ? _buildEmptyState()
                            : ListView.separated(
                                physics: const AlwaysScrollableScrollPhysics(),
                                padding: const EdgeInsets.all(16.0),
                                itemCount: filteredList.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 12),
                                itemBuilder: (context, index) {
                                  final notice = filteredList[index];
                                  return _buildNoticeCard(context, noticesProvider, notice);
                                },
                              ),
                  ),
                ],
              ),
            ),
          ),
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
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(
                  color: Color(0xFFEFF4FF),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.campaign_outlined,
                  color: Color(0xFF002045),
                  size: 32,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'No Notices Found',
                style: GoogleFonts.hankenGrotesk(
                  color: const Color(0xFF0D1C2E),
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'There are no announcements matching your filter.',
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

  Widget _buildNoticeCard(BuildContext context, NoticesProvider provider, NoticeModel notice) {
    final bool isRead = provider.isRead(notice.id);
    final String formattedDate = DateFormat('MMM d, yyyy').format(notice.createdAt);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(
          color: notice.isPinned ? const Color(0xFF1E88E5) : const Color(0xFFC4C6CF),
          width: notice.isPinned ? 1.5 : 1.0,
        ),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          )
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: () => _showNoticeDetails(context, provider, notice),
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Category Pill + Pinned Indicator + Date
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: notice.categoryBgColor,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            notice.categoryDisplay,
                            style: GoogleFonts.inter(
                              color: notice.categoryTextColor,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        if (notice.isPinned) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE3F2FD),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.push_pin, size: 10, color: Color(0xFF1565C0)),
                                const SizedBox(width: 2),
                                Text(
                                  'PINNED',
                                  style: GoogleFonts.inter(
                                    color: const Color(0xFF1565C0),
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                    Row(
                      children: [
                        Text(
                          formattedDate,
                          style: GoogleFonts.inter(
                            color: const Color(0xFF545F72),
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (!isRead) ...[
                          const SizedBox(width: 6),
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: Color(0xFFBA1A1A),
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Main Title & Description Snippet
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: notice.categoryBgColor,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(notice.categoryIcon, color: notice.categoryTextColor, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            notice.title,
                            style: GoogleFonts.hankenGrotesk(
                              color: const Color(0xFF0D1C2E),
                              fontSize: 15,
                              fontWeight: isRead ? FontWeight.w600 : FontWeight.bold,
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

  void _showNoticeDetails(BuildContext context, NoticesProvider provider, NoticeModel notice) {
    provider.markAsRead(notice.id);

    final String formattedDate = DateFormat('EEEE, MMMM d, yyyy • h:mm a').format(notice.createdAt);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFC4C6CF),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Category & Pinned Tag
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: notice.categoryBgColor,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        notice.categoryDisplay,
                        style: GoogleFonts.inter(
                          color: notice.categoryTextColor,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    if (notice.isPinned) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE3F2FD),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.push_pin, size: 12, color: Color(0xFF1565C0)),
                            const SizedBox(width: 4),
                            Text(
                              'PINNED ANNOUNCEMENT',
                              style: GoogleFonts.inter(
                                color: const Color(0xFF1565C0),
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 12),

                // Title
                Text(
                  notice.title,
                  style: GoogleFonts.hankenGrotesk(
                    color: const Color(0xFF0D1C2E),
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 6),

                // Date
                Text(
                  formattedDate,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF545F72),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 16),
                const Divider(color: Color(0xFFC4C6CF), thickness: 0.5),
                const SizedBox(height: 16),

                // Full Content Text
                Text(
                  notice.content,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF0D1C2E),
                    fontSize: 14,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 24),

                // Close Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF002045),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(
                      'Dismiss Notice',
                      style: GoogleFonts.inter(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
