import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/instructor/batches/data/models/instructor_batch_model.dart';
import 'package:student_app/features/instructor/batches/presentation/providers/instructor_batches_provider.dart';
import 'package:student_app/features/instructor/exams/presentation/providers/instructor_exams_provider.dart';

class CreateOnlineExamScreen extends StatefulWidget {
  const CreateOnlineExamScreen({super.key});

  @override
  State<CreateOnlineExamScreen> createState() => _CreateOnlineExamScreenState();
}

class _CreateOnlineExamScreenState extends State<CreateOnlineExamScreen> {
  final _formKey = GlobalKey<FormState>();

  final _titleController = TextEditingController();
  final _instructionsController = TextEditingController();
  final _passingMarksController = TextEditingController(text: '40');
  final _questionSearchController = TextEditingController();

  InstructorBatchDetail? _selectedBatch;
  DateTime _startTime = DateTime.now().add(const Duration(minutes: 30));
  DateTime _endTime = DateTime.now().add(const Duration(hours: 3));
  int _durationMinutes = 45;

  final Set<String> _selectedQuestionIds = {};
  bool _shuffleQuestions = true;
  bool _shuffleOptions = true;
  String _resultPublication = 'after_exam_end';

  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final batchesProv = context.read<InstructorBatchesProvider>();
      if (batchesProv.batches.isEmpty) {
        batchesProv.loadBatches();
      }
      context.read<InstructorExamsProvider>().loadQuestions();
    });
  }

  @override
  void dispose() {
    _titleController.dispose();
    _instructionsController.dispose();
    _passingMarksController.dispose();
    _questionSearchController.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime({required bool isStart}) async {
    final current = isStart ? _startTime : _endTime;

    final pickedDate = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 180)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: Color(0xFF002045),
            onPrimary: Colors.white,
            onSurface: Color(0xFF0F172A),
          ),
        ),
        child: child!,
      ),
    );

    if (pickedDate == null || !mounted) return;

    final pickedTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(current),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: Color(0xFF002045),
            onPrimary: Colors.white,
            onSurface: Color(0xFF0F172A),
          ),
        ),
        child: child!,
      ),
    );

    if (pickedTime == null || !mounted) return;

    final combined = DateTime(
      pickedDate.year,
      pickedDate.month,
      pickedDate.day,
      pickedTime.hour,
      pickedTime.minute,
    );

    setState(() {
      if (isStart) {
        _startTime = combined;
        if (_endTime.isBefore(_startTime.add(Duration(minutes: _durationMinutes)))) {
          _endTime = _startTime.add(Duration(minutes: _durationMinutes + 60));
        }
      } else {
        _endTime = combined;
      }
    });
  }

  Future<void> _submitExam() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedBatch == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a target batch for this exam')),
      );
      return;
    }

    final minEndTime = _startTime.add(Duration(minutes: _durationMinutes));
    if (_endTime.isBefore(minEndTime)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('End time must be at least $_durationMinutes minutes after start time')),
      );
      return;
    }

    final examsProv = context.read<InstructorExamsProvider>();
    final allQuestions = examsProv.questions;
    final selectedQuestions = allQuestions.where((q) => _selectedQuestionIds.contains(q.id)).toList();

    int totalMarks = 0;
    for (final q in selectedQuestions) {
      totalMarks += q.marks;
    }

    if (totalMarks == 0) {
      totalMarks = 100;
    }

    setState(() => _isSubmitting = true);

    try {
      int order = 0;
      final payload = {
        'title': _titleController.text.trim(),
        'instructions': _instructionsController.text.trim(),
        if (_selectedBatch!.courseId != null) 'course': _selectedBatch!.courseId,
        'batches': [_selectedBatch!.id],
        'duration': _durationMinutes,
        'passingMarks': int.tryParse(_passingMarksController.text.trim()) ?? 0,
        'totalMarks': totalMarks,
        'scheduledAt': _startTime.toUtc().toIso8601String(),
        'schedule': {
          'startTime': _startTime.toUtc().toIso8601String(),
          'endTime': _endTime.toUtc().toIso8601String(),
        },
        'questions': selectedQuestions.map((q) => {
          'question': q.id,
          'marks': q.marks,
          'order': order++,
        }).toList(),
        'securityConfig': {
          'shuffleQuestions': _shuffleQuestions,
          'shuffleOptions': _shuffleOptions,
        },
        'resultPublication': _resultPublication,
        'status': 'published',
      };

      final res = await examsProv.createOnlineExam(payload);

      if (!mounted) return;

      if (res['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Color(0xFF10B981),
            content: Text('Exam created successfully!'),
          ),
        );
        Navigator.pop(context, true);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFFEF4444),
            content: Text(res['message'] ?? 'Failed to create exam'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final batchesProv = context.watch<InstructorBatchesProvider>();
    final examsProv = context.watch<InstructorExamsProvider>();
    final batches = batchesProv.batches;

    final dateFormat = DateFormat('EEE, d MMM yyyy, h:mm a');

    // Filter questions
    final qSearch = _questionSearchController.text.trim().toLowerCase();
    final filteredQuestions = examsProv.questions.where((q) {
      if (qSearch.isEmpty) return true;
      return q.text.toLowerCase().contains(qSearch);
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF002045)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Create Online Exam',
          style: GoogleFonts.hankenGrotesk(
            fontWeight: FontWeight.bold,
            color: const Color(0xFF002045),
            fontSize: 18,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton.icon(
              onPressed: _isSubmitting ? null : _submitExam,
              icon: _isSubmitting 
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF002045)))
                  : const Icon(Icons.check, size: 16),
              label: Text(
                _isSubmitting ? 'Saving...' : 'Publish',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFF002045),
              ),
            ),
          )
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // 1. Basic Exam Info
            _buildSectionCard(
              title: 'Basic Information',
              icon: Icons.assignment_outlined,
              children: [
                TextFormField(
                  controller: _titleController,
                  decoration: _buildInputDecoration(
                    label: 'Exam Title *',
                    hint: 'e.g. Physics Chapter 3 Assessment',
                  ),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Title is required' : null,
                ),
                const SizedBox(height: 14),

                // Batch Selection Dropdown
                DropdownButtonFormField<String>(
                  value: _selectedBatch?.id,
                  decoration: _buildInputDecoration(
                    label: 'Target Batch / Class *',
                    hint: 'Select Batch',
                  ),
                  items: batches.map((b) {
                    return DropdownMenuItem<String>(
                      value: b.id,
                      child: Text(
                        '${b.name} (${b.courseName})',
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13),
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      final chosen = batches.firstWhere((b) => b.id == val);
                      setState(() => _selectedBatch = chosen);
                    }
                  },
                  validator: (v) => v == null ? 'Please select a batch' : null,
                ),
                const SizedBox(height: 14),

                TextFormField(
                  controller: _instructionsController,
                  maxLines: 2,
                  decoration: _buildInputDecoration(
                    label: 'Instructions (Optional)',
                    hint: 'Any guidelines or notes for students...',
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // 2. Schedule & Duration
            _buildSectionCard(
              title: 'Schedule & Timing',
              icon: Icons.access_time_rounded,
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.calendar_today_outlined, color: Color(0xFF002045)),
                  title: const Text('Start Window', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  subtitle: Text(dateFormat.format(_startTime), style: const TextStyle(fontSize: 12)),
                  trailing: const Icon(Icons.edit_calendar_outlined, size: 18),
                  onTap: () => _pickDateTime(isStart: true),
                ),
                const Divider(),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.event_busy_outlined, color: Color(0xFFEF4444)),
                  title: const Text('End Window', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  subtitle: Text(dateFormat.format(_endTime), style: const TextStyle(fontSize: 12)),
                  trailing: const Icon(Icons.edit_calendar_outlined, size: 18),
                  onTap: () => _pickDateTime(isStart: false),
                ),
                const Divider(),

                // Duration Selector
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Exam Duration', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF4FF),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '$_durationMinutes minutes',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF002045)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [15, 30, 45, 60, 90, 120].map((mins) {
                    final isSel = _durationMinutes == mins;
                    return ChoiceChip(
                      label: Text('$mins m', style: TextStyle(fontSize: 12, color: isSel ? Colors.white : Colors.black87)),
                      selected: isSel,
                      selectedColor: const Color(0xFF002045),
                      onSelected: (_) => setState(() => _durationMinutes = mins),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),

                TextFormField(
                  controller: _passingMarksController,
                  keyboardType: TextInputType.number,
                  decoration: _buildInputDecoration(
                    label: 'Passing Marks',
                    hint: 'e.g. 40',
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // 3. Question Selection
            _buildSectionCard(
              title: 'Select Questions (${_selectedQuestionIds.length} Selected)',
              icon: Icons.quiz_outlined,
              children: [
                TextField(
                  controller: _questionSearchController,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'Search questions in bank...',
                    prefixIcon: const Icon(Icons.search, size: 18),
                    filled: true,
                    fillColor: const Color(0xFFF1F5F9),
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 12),

                if (examsProv.isLoading && examsProv.questions.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(20),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (filteredQuestions.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Center(
                      child: Text(
                        examsProv.questions.isEmpty 
                            ? 'No questions found in Question Bank. You can add questions from Question Bank.'
                            : 'No matching questions.',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  )
                else
                  SizedBox(
                    height: 260,
                    child: ListView.separated(
                      itemCount: filteredQuestions.length,
                      separatorBuilder: (_, index) => const Divider(height: 1),
                      itemBuilder: (ctx, idx) {
                        final q = filteredQuestions[idx];
                        final isChecked = _selectedQuestionIds.contains(q.id);

                        return CheckboxListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          activeColor: const Color(0xFF002045),
                          value: isChecked,
                          onChanged: (val) {
                            setState(() {
                              if (val == true) {
                                _selectedQuestionIds.add(q.id);
                              } else {
                                _selectedQuestionIds.remove(q.id);
                              }
                            });
                          },
                          title: Text(
                            q.text,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                          subtitle: Text(
                            '${q.type.toUpperCase()} • ${q.marks} Marks • ${q.difficulty.toUpperCase()}',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          ),
                        );
                      },
                    ),
                  ),
              ],
            ),

            const SizedBox(height: 16),

            // 4. Anti-Cheating & Publishing Rules
            _buildSectionCard(
              title: 'Settings & Security',
              icon: Icons.shield_outlined,
              children: [
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  activeColor: const Color(0xFF002045),
                  title: const Text('Shuffle Questions', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  subtitle: const Text('Randomize question sequence for each student', style: TextStyle(fontSize: 11)),
                  value: _shuffleQuestions,
                  onChanged: (val) => setState(() => _shuffleQuestions = val),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  activeColor: const Color(0xFF002045),
                  title: const Text('Shuffle Options', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  subtitle: const Text('Randomize multiple-choice option choices', style: TextStyle(fontSize: 11)),
                  value: _shuffleOptions,
                  onChanged: (val) => setState(() => _shuffleOptions = val),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: _resultPublication,
                  decoration: _buildInputDecoration(
                    label: 'Score Release Policy',
                  ),
                  items: const [
                    DropdownMenuItem(value: 'after_exam_end', child: Text('Release after Exam Window Ends', style: TextStyle(fontSize: 13))),
                    DropdownMenuItem(value: 'immediate', child: Text('Immediate after Submission', style: TextStyle(fontSize: 13))),
                    DropdownMenuItem(value: 'manual', child: Text('Manual Release by Instructor', style: TextStyle(fontSize: 13))),
                  ],
                  onChanged: (val) {
                    if (val != null) setState(() => _resultPublication = val);
                  },
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Submit Button
            ElevatedButton.icon(
              onPressed: _isSubmitting ? null : _submitExam,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF002045),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: _isSubmitting 
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.rocket_launch_outlined, size: 18),
              label: Text(
                _isSubmitting ? 'Publishing Exam...' : 'Create & Publish Exam',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: const Color(0xFF002045)),
              const SizedBox(width: 8),
              Text(
                title,
                style: GoogleFonts.hankenGrotesk(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF0F172A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }

  InputDecoration _buildInputDecoration({required String label, String? hint}) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      labelStyle: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
      hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF002045), width: 1.5)),
    );
  }
}
