import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/instructor/dashboard/presentation/widgets/post_notice_sheet.dart';
import 'package:student_app/features/instructor/notices/presentation/providers/instructor_notices_provider.dart';
import 'package:student_app/l10n/app_localizations.dart';

class InstructorNoticesScreen extends StatelessWidget {
  const InstructorNoticesScreen({super.key});

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

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InstructorNoticesProvider>();
    final l10n = AppLocalizations.of(context);
    final notices = provider.notices;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          l10n?.noticesTitle ?? 'Notices & Announcements',
          style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 17),
        ),
        actions: [
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
                l10n?.postNotice ?? 'Post',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF002045),
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => provider.loadNotices(refresh: true),
        color: const Color(0xFF002045),
        child: provider.isLoading && notices.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : notices.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.campaign_outlined, size: 48, color: Color(0xFF94A3B8)),
                        const SizedBox(height: 10),
                        Text(
                          l10n?.emptyState ?? 'No announcements published yet',
                          style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: notices.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final notice = notices[index];
                      final catColor = _getCategoryColor(notice.category);
                      final catBg = _getCategoryBg(notice.category);

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
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: catBg,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    notice.category,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: catColor,
                                    ),
                                  ),
                                ),
                                if (notice.createdAt != null)
                                  Text(
                                    notice.createdAt!.length > 10 ? notice.createdAt!.substring(0, 10) : notice.createdAt!,
                                    style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              notice.title,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              notice.content,
                              style: const TextStyle(
                                fontSize: 13,
                                height: 1.5,
                                color: Color(0xFF475569),
                              ),
                            ),
                            if (notice.authorName != null) ...[
                              const SizedBox(height: 12),
                              const Divider(height: 1, color: Color(0xFFF1F5F9)),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  const Icon(Icons.person_outline, size: 14, color: Color(0xFF64748B)),
                                  const SizedBox(width: 4),
                                  Text(
                                    'By ${notice.authorName}',
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
