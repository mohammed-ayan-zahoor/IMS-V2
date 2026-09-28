import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/features/instructor/dashboard/presentation/providers/instructor_dashboard_provider.dart';
import 'package:student_app/l10n/app_localizations.dart';

class PostNoticeSheet extends StatefulWidget {
  const PostNoticeSheet({super.key});

  static Future<bool?> show(BuildContext context) {
    return showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => const PostNoticeSheet(),
    );
  }

  @override
  State<PostNoticeSheet> createState() => _PostNoticeSheetState();
}

class _PostNoticeSheetState extends State<PostNoticeSheet> {
  final _titleController = TextEditingController();
  final _messageController = TextEditingController();
  String _selectedCategory = 'GENERAL';
  bool _isSubmitting = false;

  @override
  void dispose() {
    _titleController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _submitNotice() async {
    final title = _titleController.text.trim();
    final message = _messageController.text.trim();

    if (title.isEmpty || message.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter both title and message.'),
          backgroundColor: Color(0xFFBA1A1A),
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final provider = context.read<InstructorDashboardProvider>();
    final error = await provider.publishNotice(
      title: title,
      content: message,
      category: _selectedCategory,
    );

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (error == null) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Notice published successfully!'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error),
            backgroundColor: const Color(0xFFBA1A1A),
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final auth = context.watch<AuthProvider>();
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final canPublish = auth.hasPermission('manage_notices');

    final categories = [
      {'key': 'GENERAL', 'label': l10n?.noticeCategoryGeneral ?? 'General'},
      {'key': 'EXAM', 'label': l10n?.noticeCategoryExam ?? 'Exam'},
      {'key': 'HOLIDAY', 'label': l10n?.noticeCategoryHoliday ?? 'Holiday'},
      {'key': 'URGENT', 'label': l10n?.noticeCategoryUrgent ?? 'Urgent'},
    ];

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      padding: EdgeInsets.fromLTRB(20, 14, 20, 24 + bottomInset),
      child: SingleChildScrollView(
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
            Row(
              children: [
                const Icon(
                  Icons.campaign,
                  color: Color(0xFF002045),
                  size: 24,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    l10n?.postNotice ?? 'Post Notice',
                    style: GoogleFonts.hankenGrotesk(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0D1C2E),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            if (!canPublish)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.lock_outline, color: Color(0xFFD97706), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Permission Required: Your instructor account currently does not have "manage_notices" assigned. Only administrators or authorized teachers can post notices.',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: const Color(0xFF92400E),
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            Text(
              l10n?.noticeTitle ?? 'Notice Title',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF545F72),
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _titleController,
              decoration: InputDecoration(
                hintText: 'e.g. Unit Test Schedule Announced',
                hintStyle: GoogleFonts.inter(color: const Color(0xFF545F72).withValues(alpha: 0.6), fontSize: 13),
                filled: true,
                fillColor: const Color(0xFFEFF4FF),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
            const SizedBox(height: 14),
            Text(
              'Category',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF545F72),
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: categories.map((cat) {
                final isSelected = _selectedCategory == cat['key'];
                return ChoiceChip(
                  label: Text(cat['label']!),
                  selected: isSelected,
                  onSelected: (val) {
                    if (val) setState(() => _selectedCategory = cat['key']!);
                  },
                  selectedColor: const Color(0xFF002045),
                  backgroundColor: const Color(0xFFEFF4FF),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                  labelStyle: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    color: isSelected ? Colors.white : const Color(0xFF002045),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 14),
            Text(
              'Notice Content',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF545F72),
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _messageController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Enter full announcement details for students...',
                hintStyle: GoogleFonts.inter(color: const Color(0xFF545F72).withValues(alpha: 0.6), fontSize: 13),
                filled: true,
                fillColor: const Color(0xFFEFF4FF),
                contentPadding: const EdgeInsets.all(14),
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
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submitNotice,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF002045),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : Text(
                        'Publish Notice',
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
