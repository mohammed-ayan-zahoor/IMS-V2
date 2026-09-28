import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/instructor/batches/presentation/providers/instructor_batches_provider.dart';
import 'package:student_app/features/instructor/exams/presentation/providers/instructor_exams_provider.dart';
import 'package:student_app/features/instructor/exams/presentation/widgets/add_question_sheet.dart';
import 'package:student_app/features/instructor/exams/presentation/widgets/bulk_import_questions_sheet.dart';
import 'package:student_app/l10n/app_localizations.dart';

class QuestionBankScreen extends StatefulWidget {
  const QuestionBankScreen({super.key});

  @override
  State<QuestionBankScreen> createState() => _QuestionBankScreenState();
}

class _QuestionBankScreenState extends State<QuestionBankScreen> {
  final TextEditingController _searchController = TextEditingController();

  static const List<String> _difficulties = ['ALL', 'Easy', 'Medium', 'Hard'];
  static const List<Map<String, String>> _types = [
    {'label': 'All Types', 'value': 'ALL'},
    {'label': 'MCQ', 'value': 'mcq'},
    {'label': 'True/False', 'value': 'true_false'},
    {'label': 'Short Answer', 'value': 'short_answer'},
    {'label': 'Essay', 'value': 'essay'},
    {'label': 'Numerical', 'value': 'numerical'},
    {'label': 'Fill Blank', 'value': 'fill_in_blank'},
  ];

  String _selectedDiff = 'ALL';
  String _selectedType = 'ALL';
  String? _selectedBatchId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InstructorExamsProvider>().loadQuestions();
      final batchesProvider = context.read<InstructorBatchesProvider>();
      if (batchesProvider.batches.isEmpty) {
        batchesProvider.loadBatches();
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _applyFilter() {
    context.read<InstructorExamsProvider>().loadQuestions(
      search: _searchController.text.trim(),
      difficulty: _selectedDiff,
      type: _selectedType,
      batchId: _selectedBatchId,
    );
  }

  Color _getDifficultyColor(String diff) {
    switch (diff.toLowerCase()) {
      case 'easy':
        return const Color(0xFF10B981);
      case 'hard':
        return const Color(0xFFEF4444);
      case 'medium':
      default:
        return const Color(0xFFF59E0B);
    }
  }

  Color _getDifficultyBg(String diff) {
    switch (diff.toLowerCase()) {
      case 'easy':
        return const Color(0xFFECFDF5);
      case 'hard':
        return const Color(0xFFFEF2F2);
      case 'medium':
      default:
        return const Color(0xFFFFFBEB);
    }
  }

  String _formatType(String type) {
    switch (type.toLowerCase()) {
      case 'mcq':
        return 'MCQ';
      case 'true_false':
        return 'True/False';
      case 'short_answer':
        return 'Short Answer';
      case 'essay':
        return 'Essay';
      case 'numerical':
        return 'Numerical';
      case 'fill_in_blank':
        return 'Fill Blank';
      default:
        return type.toUpperCase();
    }
  }

  void _showQuestionDetails(BuildContext context, dynamic q) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.75,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getDifficultyBg(q.difficulty),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      q.difficulty.toUpperCase(),
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: _getDifficultyColor(q.difficulty),
                      ),
                    ),
                  ),
                  Text(
                    '${q.marks} Mark${q.marks > 1 ? 's' : ''}',
                    style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF475569)),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                q.text,
                style: GoogleFonts.hankenGrotesk(fontSize: 16, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
              ),
              const SizedBox(height: 16),
              if (q.options.isNotEmpty) ...[
                Text(
                  'Options:',
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF64748B)),
                ),
                const SizedBox(height: 8),
                ...q.options.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final opt = entry.value;
                  final isAnswer = q.correctAnswer?.toString() == idx.toString() || q.correctAnswer?.toString() == opt;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: isAnswer ? const Color(0xFFECFDF5) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: isAnswer ? const Color(0xFF10B981) : const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      children: [
                        Text(
                          '${String.fromCharCode(65 + (idx as int))}. ',
                          style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: isAnswer ? const Color(0xFF059669) : const Color(0xFF64748B)),
                        ),
                        Expanded(
                          child: Text(
                            opt,
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: isAnswer ? FontWeight.w600 : FontWeight.normal,
                              color: isAnswer ? const Color(0xFF065F46) : const Color(0xFF1E293B),
                            ),
                          ),
                        ),
                        if (isAnswer)
                          const Icon(Icons.check_circle_rounded, size: 16, color: Color(0xFF10B981)),
                      ],
                    ),
                  );
                }),
              ],
              if (q.explanation != null && q.explanation!.isNotEmpty) ...[
                const SizedBox(height: 14),
                Text(
                  'Explanation:',
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF64748B)),
                ),
                const SizedBox(height: 6),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF4FF),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: const Color(0xFFC4C6CF)),
                  ),
                  child: Text(
                    q.explanation!,
                    style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF1E293B)),
                  ),
                ),
              ],
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF002045),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                  ),
                  child: Text('Close', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold)),
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
    final provider = context.watch<InstructorExamsProvider>();
    final batchesProvider = context.watch<InstructorBatchesProvider>();
    final batches = batchesProvider.batches;
    final l10n = AppLocalizations.of(context);
    final questions = provider.questions;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          l10n?.questionBankTitle ?? 'Question Bank',
          style: GoogleFonts.hankenGrotesk(
            fontWeight: FontWeight.w800,
            color: const Color(0xFF0F172A),
            fontSize: 17,
          ),
        ),
        actions: [
          // Add Options Popup Menu
          PopupMenuButton<String>(
            icon: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF002045),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.add_rounded, size: 16, color: Colors.white),
                  const SizedBox(width: 4),
                  Text(
                    'Add',
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ],
              ),
            ),
            onSelected: (val) {
              if (val == 'single') {
                AddQuestionSheet.show(context);
              } else if (val == 'bulk') {
                BulkImportQuestionsSheet.show(context);
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'single',
                child: Row(
                  children: [
                    const Icon(Icons.edit_note_rounded, size: 18, color: Color(0xFF002045)),
                    const SizedBox(width: 8),
                    Text('Add Single Question', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'bulk',
                child: Row(
                  children: [
                    const Icon(Icons.code_rounded, size: 18, color: Color(0xFF002045)),
                    const SizedBox(width: 8),
                    Text('Bulk Import JSON', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: Column(
        children: [
          // Filter Controls Area
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Live Search Bar
                TextField(
                  controller: _searchController,
                  onChanged: (val) => _applyFilter(),
                  decoration: InputDecoration(
                    hintText: 'Search questions by topic, keyword...',
                    hintStyle: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF94A3B8)),
                    prefixIcon: const Icon(Icons.search, size: 18, color: Color(0xFF64748B)),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 16, color: Color(0xFF64748B)),
                            onPressed: () {
                              _searchController.clear();
                              _applyFilter();
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                  ),
                ),
                const SizedBox(height: 10),

                // Class / Batch Filter Row
                if (batches.isNotEmpty) ...[
                  SizedBox(
                    height: 32,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: batches.length + 1,
                      separatorBuilder: (context, index) => const SizedBox(width: 6),
                      itemBuilder: (context, index) {
                        if (index == 0) {
                          final isSelected = _selectedBatchId == null;
                          return GestureDetector(
                            onTap: () {
                              setState(() => _selectedBatchId = null);
                              _applyFilter();
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFF002045) : const Color(0xFFEFF4FF),
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: isSelected ? const Color(0xFF002045) : const Color(0xFFC4C6CF)),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                'All Classes',
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                  color: isSelected ? Colors.white : const Color(0xFF545F72),
                                ),
                              ),
                            ),
                          );
                        }
                        final b = batches[index - 1];
                        final isSelected = _selectedBatchId == b.id;
                        return GestureDetector(
                          onTap: () {
                            setState(() => _selectedBatchId = b.id);
                            _applyFilter();
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFF002045) : const Color(0xFFEFF4FF),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: isSelected ? const Color(0xFF002045) : const Color(0xFFC4C6CF)),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '${b.courseName} (${b.name})',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                color: isSelected ? Colors.white : const Color(0xFF545F72),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 8),
                ],

                // Horizontal Filters: Difficulty & Type Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      // Difficulty chips
                      ..._difficulties.map((diff) {
                        final isSelected = _selectedDiff == diff;
                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: GestureDetector(
                            onTap: () {
                              setState(() => _selectedDiff = diff);
                              _applyFilter();
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFF002045) : Colors.white,
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: isSelected ? const Color(0xFF002045) : const Color(0xFFC4C6CF)),
                              ),
                              child: Text(
                                diff == 'ALL' ? 'All Difficulties' : diff,
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                  color: isSelected ? Colors.white : const Color(0xFF475569),
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                      const SizedBox(width: 8),
                      // Type chips
                      ..._types.map((type) {
                        final isSelected = _selectedType == type['value'];
                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: GestureDetector(
                            onTap: () {
                              setState(() => _selectedType = type['value']!);
                              _applyFilter();
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFF002045) : Colors.white,
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: isSelected ? const Color(0xFF002045) : const Color(0xFFC4C6CF)),
                              ),
                              child: Text(
                                type['label']!,
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                  color: isSelected ? Colors.white : const Color(0xFF475569),
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFC4C6CF)),

          // Questions List
          Expanded(
            child: provider.isLoading && questions.isEmpty
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF002045)))
                : questions.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.help_outline_rounded, size: 44, color: Color(0xFF94A3B8)),
                            const SizedBox(height: 10),
                            Text(
                              'No questions matching your filters',
                              style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: const Color(0xFF64748B)),
                            ),
                            const SizedBox(height: 14),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                OutlinedButton.icon(
                                  onPressed: () => AddQuestionSheet.show(context),
                                  icon: const Icon(Icons.add, size: 16, color: Color(0xFF002045)),
                                  label: Text('Add Question', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF002045))),
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: Color(0xFFC4C6CF)),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                OutlinedButton.icon(
                                  onPressed: () => BulkImportQuestionsSheet.show(context),
                                  icon: const Icon(Icons.code_rounded, size: 16, color: Color(0xFF002045)),
                                  label: Text('Bulk JSON', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF002045))),
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: Color(0xFFC4C6CF)),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: questions.length,
                        separatorBuilder: (context, index) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final q = questions[index];
                          final diffColor = _getDifficultyColor(q.difficulty);
                          final diffBg = _getDifficultyBg(q.difficulty);

                          return InkWell(
                            onTap: () => _showQuestionDetails(context, q),
                            borderRadius: BorderRadius.circular(4),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: const Color(0xFFC4C6CF)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Badges Row
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: diffBg,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          q.difficulty.toUpperCase(),
                                          style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: diffColor),
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFEFF4FF),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          _formatType(q.type),
                                          style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF002045)),
                                        ),
                                      ),
                                      const Spacer(),
                                      Text(
                                        '${q.marks} Mark${q.marks > 1 ? 's' : ''}',
                                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),

                                  // Question statement
                                  Text(
                                    q.text,
                                    maxLines: 3,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
                                  ),

                                  // Course / Batch metadata tag
                                  if (q.courseName != null || q.batchName != null) ...[
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        const Icon(Icons.school_outlined, size: 13, color: Color(0xFF64748B)),
                                        const SizedBox(width: 4),
                                        Text(
                                          [q.courseName, q.batchName].where((s) => s != null && s.isNotEmpty).join(' • '),
                                          style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF64748B)),
                                        ),
                                      ],
                                    ),
                                  ],

                                  // Options preview for MCQ
                                  if (q.options.isNotEmpty) ...[
                                    const SizedBox(height: 8),
                                    Text(
                                      '${q.options.length} Options: ${q.options.take(2).join(', ')}${q.options.length > 2 ? '...' : ''}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF64748B)),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
