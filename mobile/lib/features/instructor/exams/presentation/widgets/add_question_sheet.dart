import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/instructor/batches/presentation/providers/instructor_batches_provider.dart';
import 'package:student_app/features/instructor/exams/presentation/providers/instructor_exams_provider.dart';

class AddQuestionSheet extends StatefulWidget {
  const AddQuestionSheet({super.key});

  static Future<bool?> show(BuildContext context) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddQuestionSheet(),
    );
  }

  @override
  State<AddQuestionSheet> createState() => _AddQuestionSheetState();
}

class _AddQuestionSheetState extends State<AddQuestionSheet> {
  final _formKey = GlobalKey<FormState>();
  final _textController = TextEditingController();
  final _marksController = TextEditingController(text: '1');
  final _explanationController = TextEditingController();

  String _type = 'mcq';
  String _difficulty = 'medium';
  String? _selectedCourseId;
  String? _selectedBatchId;

  // Options for MCQ
  final List<TextEditingController> _optionControllers = [
    TextEditingController(),
    TextEditingController(),
    TextEditingController(),
    TextEditingController(),
  ];
  int _correctOptionIndex = 0;

  // For True/False
  String _trueFalseAnswer = 'true';

  // For Short Answer / Essay / Numerical / Fill in Blank
  final _correctAnswerController = TextEditingController();

  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final batchesProvider = context.read<InstructorBatchesProvider>();
      if (batchesProvider.batches.isNotEmpty) {
        setState(() {
          _selectedCourseId = batchesProvider.batches.first.courseName; // placeholder or id
        });
      }
    });
  }

  @override
  void dispose() {
    _textController.dispose();
    _marksController.dispose();
    _explanationController.dispose();
    _correctAnswerController.dispose();
    for (final c in _optionControllers) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    dynamic correctAnswer;
    List<String> options = [];

    if (_type == 'mcq') {
      options = _optionControllers.map((c) => c.text.trim()).where((t) => t.isNotEmpty).toList();
      if (options.length < 2) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please provide at least 2 options for MCQ')),
        );
        return;
      }
      if (_correctOptionIndex >= options.length) {
        _correctOptionIndex = 0;
      }
      correctAnswer = _correctOptionIndex.toString();
    } else if (_type == 'true_false') {
      correctAnswer = _trueFalseAnswer;
    } else {
      correctAnswer = _correctAnswerController.text.trim();
      if (correctAnswer.isEmpty && !['short_answer', 'essay'].contains(_type)) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please specify the correct answer')),
        );
        return;
      }
    }

    final payload = <String, dynamic>{
      'text': _textController.text.trim(),
      'type': _type,
      'difficulty': _difficulty,
      'marks': int.tryParse(_marksController.text.trim()) ?? 1,
      'correctAnswer': correctAnswer,
      if (options.isNotEmpty) 'options': options,
      if (_explanationController.text.trim().isNotEmpty)
        'explanation': _explanationController.text.trim(),
      if (_selectedCourseId != null && _selectedCourseId!.isNotEmpty)
        'course': _selectedCourseId,
      if (_selectedBatchId != null && _selectedBatchId!.isNotEmpty)
        'batch': _selectedBatchId,
    };

    final provider = context.read<InstructorExamsProvider>();
    final success = await provider.createQuestion(payload);

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Question added successfully!'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to add question. Please check details.'),
            backgroundColor: Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final batchesProvider = context.watch<InstructorBatchesProvider>();
    final batches = batchesProvider.batches;

    // Distinct courses
    final Map<String, String> coursesMap = {};
    for (final b in batches) {
      if (b.courseName.isNotEmpty) {
        coursesMap[b.id] = b.courseName;
      }
    }

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
                    const Icon(Icons.help_outline_rounded, color: Color(0xFF002045), size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Add Question',
                      style: GoogleFonts.hankenGrotesk(
                        fontSize: 17,
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

          // Scrollable Form
          Expanded(
            child: Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Course & Class selector
                  if (batches.isNotEmpty) ...[
                    Text(
                      'Assigned Class / Batch',
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
                            'Select Batch (Optional)',
                            style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF64748B)),
                          ),
                          items: [
                            const DropdownMenuItem<String>(
                              value: null,
                              child: Text('All Batches / General', style: TextStyle(fontSize: 13)),
                            ),
                            ...batches.map((b) => DropdownMenuItem<String>(
                                  value: b.id,
                                  child: Text('${b.courseName} - ${b.name}', style: const TextStyle(fontSize: 13)),
                                )),
                          ],
                          onChanged: (val) {
                            setState(() {
                              _selectedBatchId = val;
                            });
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Type & Difficulty Row
                  Row(
                    children: [
                      // Question Type
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Question Type',
                              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                            ),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: const Color(0xFFC4C6CF)),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  isExpanded: true,
                                  value: _type,
                                  items: const [
                                    DropdownMenuItem(value: 'mcq', child: Text('MCQ (Single)', style: TextStyle(fontSize: 12))),
                                    DropdownMenuItem(value: 'true_false', child: Text('True / False', style: TextStyle(fontSize: 12))),
                                    DropdownMenuItem(value: 'short_answer', child: Text('Short Answer', style: TextStyle(fontSize: 12))),
                                    DropdownMenuItem(value: 'essay', child: Text('Essay', style: TextStyle(fontSize: 12))),
                                    DropdownMenuItem(value: 'numerical', child: Text('Numerical', style: TextStyle(fontSize: 12))),
                                    DropdownMenuItem(value: 'fill_in_blank', child: Text('Fill in Blank', style: TextStyle(fontSize: 12))),
                                  ],
                                  onChanged: (val) => setState(() => _type = val ?? 'mcq'),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Difficulty
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Difficulty',
                              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                            ),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: const Color(0xFFC4C6CF)),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  isExpanded: true,
                                  value: _difficulty,
                                  items: const [
                                    DropdownMenuItem(value: 'easy', child: Text('Easy', style: TextStyle(fontSize: 12, color: Color(0xFF10B981), fontWeight: FontWeight.bold))),
                                    DropdownMenuItem(value: 'medium', child: Text('Medium', style: TextStyle(fontSize: 12, color: Color(0xFFF59E0B), fontWeight: FontWeight.bold))),
                                    DropdownMenuItem(value: 'hard', child: Text('Hard', style: TextStyle(fontSize: 12, color: Color(0xFFEF4444), fontWeight: FontWeight.bold))),
                                  ],
                                  onChanged: (val) => setState(() => _difficulty = val ?? 'medium'),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Question Text
                  Text(
                    'Question Text *',
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                  ),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _textController,
                    maxLines: 3,
                    style: GoogleFonts.inter(fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Enter question statement...',
                      hintStyle: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF94A3B8)),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                    validator: (v) => v == null || v.trim().isEmpty ? 'Question text is required' : null,
                  ),
                  const SizedBox(height: 14),

                  // Marks
                  Text(
                    'Marks *',
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                  ),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _marksController,
                    keyboardType: TextInputType.number,
                    style: GoogleFonts.inter(fontSize: 13),
                    decoration: InputDecoration(
                      hintText: '1',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    validator: (v) {
                      final m = int.tryParse(v ?? '');
                      if (m == null || m <= 0) return 'Must be a positive integer';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // MCQ Options Block
                  if (_type == 'mcq') ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Options (Select correct option radio) *',
                          style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                        ),
                        if (_optionControllers.length < 6)
                          GestureDetector(
                            onTap: () => setState(() => _optionControllers.add(TextEditingController())),
                            child: Text(
                              '+ Add Option',
                              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF002045)),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ...List.generate(_optionControllers.length, (idx) {
                      final isSelected = _correctOptionIndex == idx;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            GestureDetector(
                              onTap: () => setState(() => _correctOptionIndex = idx),
                              child: Container(
                                margin: const EdgeInsets.only(right: 8),
                                width: 22,
                                height: 22,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: isSelected ? const Color(0xFF002045) : const Color(0xFF94A3B8),
                                    width: 2,
                                  ),
                                ),
                                child: isSelected
                                    ? Center(
                                        child: Container(
                                          width: 10,
                                          height: 10,
                                          decoration: const BoxDecoration(
                                            shape: BoxShape.circle,
                                            color: Color(0xFF002045),
                                          ),
                                        ),
                                      )
                                    : null,
                              ),
                            ),
                            Expanded(
                              child: TextFormField(
                                controller: _optionControllers[idx],
                                style: GoogleFonts.inter(fontSize: 13),
                                decoration: InputDecoration(
                                  hintText: 'Option ${idx + 1}',
                                  hintStyle: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF94A3B8)),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(4),
                                    borderSide: BorderSide(color: isSelected ? const Color(0xFF002045) : const Color(0xFFC4C6CF)),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(4),
                                    borderSide: BorderSide(color: isSelected ? const Color(0xFF002045) : const Color(0xFFC4C6CF)),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                ),
                              ),
                            ),
                            if (_optionControllers.length > 2)
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline, size: 18, color: Color(0xFFEF4444)),
                                onPressed: () {
                                  setState(() {
                                    _optionControllers[idx].dispose();
                                    _optionControllers.removeAt(idx);
                                    if (_correctOptionIndex >= _optionControllers.length) {
                                      _correctOptionIndex = 0;
                                    }
                                  });
                                },
                              ),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 12),
                  ],

                  // True / False Selector
                  if (_type == 'true_false') ...[
                    Text(
                      'Correct Answer *',
                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _trueFalseAnswer = 'true'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: _trueFalseAnswer == 'true' ? const Color(0xFF002045) : const Color(0xFFEFF4FF),
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: const Color(0xFFC4C6CF)),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                'True',
                                style: GoogleFonts.inter(
                                  color: _trueFalseAnswer == 'true' ? Colors.white : const Color(0xFF0F172A),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _trueFalseAnswer = 'false'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: _trueFalseAnswer == 'false' ? const Color(0xFF002045) : const Color(0xFFEFF4FF),
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: const Color(0xFFC4C6CF)),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                'False',
                                style: GoogleFonts.inter(
                                  color: _trueFalseAnswer == 'false' ? Colors.white : const Color(0xFF0F172A),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Short Answer / Numerical / Essay
                  if (!['mcq', 'true_false'].contains(_type)) ...[
                    Text(
                      _type == 'essay' ? 'Model Answer / Rubric (Optional)' : 'Correct Answer *',
                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                    ),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _correctAnswerController,
                      maxLines: _type == 'essay' ? 3 : 1,
                      style: GoogleFonts.inter(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: _type == 'numerical' ? 'e.g. 9.8' : 'Enter expected answer...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                        contentPadding: const EdgeInsets.all(12),
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Explanation
                  Text(
                    'Explanation / Solution Notes (Optional)',
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                  ),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _explanationController,
                    maxLines: 2,
                    style: GoogleFonts.inter(fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Brief explanation for students or reviewers...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                  const SizedBox(height: 24),

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
                            'Save Question',
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
          ),
        ],
      ),
    );
  }
}
