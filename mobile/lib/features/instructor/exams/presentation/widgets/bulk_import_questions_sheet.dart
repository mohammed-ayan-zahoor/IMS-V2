import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/instructor/batches/presentation/providers/instructor_batches_provider.dart';
import 'package:student_app/features/instructor/exams/presentation/providers/instructor_exams_provider.dart';

class BulkImportQuestionsSheet extends StatefulWidget {
  const BulkImportQuestionsSheet({super.key});

  static Future<bool?> show(BuildContext context) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const BulkImportQuestionsSheet(),
    );
  }

  @override
  State<BulkImportQuestionsSheet> createState() => _BulkImportQuestionsSheetState();
}

class _BulkImportQuestionsSheetState extends State<BulkImportQuestionsSheet> {
  final _jsonController = TextEditingController();
  String? _selectedBatchId;
  bool _isSubmitting = false;
  String? _validationError;
  int _parsedCount = 0;

  static const String _sampleJson = '''[
  {
    "text": "What is Newton's Second Law of Motion?",
    "type": "mcq",
    "difficulty": "medium",
    "options": ["F = ma", "F = mv", "F = m/a", "F = a/m"],
    "correctAnswer": 0,
    "marks": 1,
    "explanation": "Force equals mass times acceleration."
  },
  {
    "text": "The acceleration due to gravity on Earth is approximately 9.8 m/s².",
    "type": "true_false",
    "difficulty": "easy",
    "correctAnswer": "true",
    "marks": 1
  },
  {
    "text": "What is the boiling point of pure water in Celsius at 1 atm?",
    "type": "numerical",
    "difficulty": "easy",
    "correctAnswer": "100",
    "marks": 1
  }
]''';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final batchesProvider = context.read<InstructorBatchesProvider>();
      if (batchesProvider.batches.isNotEmpty) {
        setState(() {
          _selectedBatchId = batchesProvider.batches.first.id;
        });
      }
    });

    _jsonController.addListener(_validateJson);
  }

  @override
  void dispose() {
    _jsonController.dispose();
    super.dispose();
  }

  void _validateJson() {
    final text = _jsonController.text.trim();
    if (text.isEmpty) {
      if (_validationError != null || _parsedCount != 0) {
        setState(() {
          _validationError = null;
          _parsedCount = 0;
        });
      }
      return;
    }

    try {
      final parsed = jsonDecode(text);
      if (parsed is! List) {
        setState(() {
          _validationError = 'JSON must be an array of question objects [...]';
          _parsedCount = 0;
        });
        return;
      }
      if (parsed.isEmpty) {
        setState(() {
          _validationError = 'Array contains no questions';
          _parsedCount = 0;
        });
        return;
      }

      setState(() {
        _validationError = null;
        _parsedCount = parsed.length;
      });
    } catch (e) {
      setState(() {
        _validationError = 'Invalid JSON format: ${e.toString().split(':').last.trim()}';
        _parsedCount = 0;
      });
    }
  }

  void _loadSample() {
    _jsonController.text = _sampleJson;
  }

  Future<void> _pasteClipboard() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    if (data?.text != null && data!.text!.isNotEmpty) {
      _jsonController.text = data.text!;
    }
  }

  Future<void> _submit() async {
    final text = _jsonController.text.trim();
    if (text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please paste question JSON to import')),
      );
      return;
    }

    List<dynamic> parsed;
    try {
      final raw = jsonDecode(text);
      if (raw is! List || raw.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('JSON must be a non-empty array of question objects')),
        );
        return;
      }
      parsed = raw;
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid JSON format. Check syntax.')),
      );
      return;
    }

    final batchesProvider = context.read<InstructorBatchesProvider>();
    final batches = batchesProvider.batches;

    // Determine target courseId
    String targetCourseId = '';
    if (_selectedBatchId != null) {
      final matched = batches.where((b) => b.id == _selectedBatchId).firstOrNull;
      if (matched != null) {
        targetCourseId = matched.courseName; // Or id
      }
    }
    if (targetCourseId.isEmpty && batches.isNotEmpty) {
      targetCourseId = batches.first.courseName;
    }

    setState(() => _isSubmitting = true);

    final questionsList = parsed.whereType<Map<String, dynamic>>().toList();
    if (questionsList.isEmpty) {
      // In case element types are Map<dynamic, dynamic>
      for (final item in parsed) {
        if (item is Map) {
          questionsList.add(Map<String, dynamic>.from(item));
        }
      }
    }

    final provider = context.read<InstructorExamsProvider>();
    final res = await provider.bulkImportQuestions(
      questions: questionsList,
      courseId: targetCourseId,
      batchId: _selectedBatchId,
    );

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (res['success'] == true) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message']?.toString() ?? 'Questions imported successfully!'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message']?.toString() ?? 'Failed to import questions'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final batchesProvider = context.watch<InstructorBatchesProvider>();
    final batches = batchesProvider.batches;

    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: Color(0xFFC4C6CF))),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.code_rounded, color: Color(0xFF002045), size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Bulk Import Questions (JSON)',
                      style: GoogleFonts.hankenGrotesk(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 20, color: Color(0xFF64748B)),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Scrollable Content
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Batch / Class Target
                if (batches.isNotEmpty) ...[
                  Text(
                    'Assign to Class / Batch',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF475569),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF4FF),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: const Color(0xFFC4C6CF)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isExpanded: true,
                        value: _selectedBatchId,
                        hint: Text(
                          'Select Batch',
                          style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF64748B)),
                        ),
                        items: batches
                            .map((b) => DropdownMenuItem<String>(
                                  value: b.id,
                                  child: Text('${b.courseName} - ${b.name}', style: const TextStyle(fontSize: 13)),
                                ))
                            .toList(),
                        onChanged: (val) => setState(() => _selectedBatchId = val),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                // Action buttons toolbar
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _pasteClipboard,
                        icon: const Icon(Icons.paste_rounded, size: 14, color: Color(0xFF002045)),
                        label: Text(
                          'Paste Clipboard',
                          style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF002045)),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFFC4C6CF)),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _loadSample,
                        icon: const Icon(Icons.description_outlined, size: 14, color: Color(0xFF002045)),
                        label: Text(
                          'Sample Template',
                          style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF002045)),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFFC4C6CF)),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // JSON Textarea
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Paste JSON Array *',
                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                    ),
                    if (_parsedCount > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '✓ $_parsedCount Valid Questions',
                          style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF10B981)),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _jsonController,
                  maxLines: 12,
                  style: GoogleFonts.firaCode(fontSize: 12, color: const Color(0xFF0F172A)),
                  decoration: InputDecoration(
                    hintText: '[\n  {\n    "text": "Question statement...",\n    "type": "mcq",\n    "difficulty": "medium",\n    "marks": 1,\n    "options": ["A", "B", "C", "D"],\n    "correctAnswer": 0\n  }\n]',
                    hintStyle: GoogleFonts.firaCode(fontSize: 11, color: const Color(0xFF94A3B8)),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(4),
                      borderSide: BorderSide(
                        color: _validationError != null
                            ? const Color(0xFFEF4444)
                            : _parsedCount > 0
                                ? const Color(0xFF10B981)
                                : const Color(0xFFC4C6CF),
                      ),
                    ),
                    contentPadding: const EdgeInsets.all(12),
                  ),
                ),
                if (_validationError != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    _validationError!,
                    style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFFEF4444)),
                  ),
                ],
                const SizedBox(height: 20),

                // Submit CTA
                ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF002045),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(
                          _parsedCount > 0 ? 'Import $_parsedCount Questions' : 'Import Questions',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
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
