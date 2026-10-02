import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/providers/academic_session_provider.dart';
import 'package:student_app/features/instructor/batches/data/models/instructor_batch_model.dart';
import 'package:student_app/features/instructor/batches/presentation/providers/instructor_batches_provider.dart';
import 'package:student_app/features/instructor/exams/presentation/providers/instructor_exams_provider.dart';

class CreateOfflineExamScreen extends StatefulWidget {
  const CreateOfflineExamScreen({super.key});

  @override
  State<CreateOfflineExamScreen> createState() => _CreateOfflineExamScreenState();
}

class _SubjectDraft {
  final TextEditingController nameController;
  final TextEditingController theoryController;
  final TextEditingController practicalController;
  final TextEditingController passingController;
  DateTime examDate;

  _SubjectDraft({
    String name = '',
    int theory = 80,
    int practical = 20,
    int passing = 35,
    DateTime? date,
  })  : nameController = TextEditingController(text: name),
        theoryController = TextEditingController(text: theory.toString()),
        practicalController = TextEditingController(text: practical.toString()),
        passingController = TextEditingController(text: passing.toString()),
        examDate = date ?? DateTime.now().add(const Duration(days: 7));

  void dispose() {
    nameController.dispose();
    theoryController.dispose();
    practicalController.dispose();
    passingController.dispose();
  }
}

class _CreateOfflineExamScreenState extends State<CreateOfflineExamScreen> {
  final _formKey = GlobalKey<FormState>();

  final _titleController = TextEditingController();
  String _examType = 'unit_test';
  String? _selectedSessionId;
  InstructorBatchDetail? _selectedBatch;
  bool _openMarksEntryImmediately = true;

  final List<_SubjectDraft> _subjects = [];
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _subjects.add(_SubjectDraft(name: 'Subject 1'));

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final sessionProv = context.read<AcademicSessionProvider>();
      if (sessionProv.sessions.isEmpty) {
        sessionProv.loadSessions();
      }
      setState(() {
        _selectedSessionId = sessionProv.selectedSessionId ??
            (sessionProv.sessions.isNotEmpty ? sessionProv.sessions.first.id : null);
      });

      final batchesProv = context.read<InstructorBatchesProvider>();
      if (batchesProv.batches.isEmpty) {
        batchesProv.loadBatches();
      }
    });
  }

  @override
  void dispose() {
    _titleController.dispose();
    for (final s in _subjects) {
      s.dispose();
    }
    super.dispose();
  }

  void _addSubject() {
    setState(() {
      _subjects.add(_SubjectDraft(name: 'Subject ${_subjects.length + 1}'));
    });
  }

  void _removeSubject(int index) {
    if (_subjects.length <= 1) return;
    setState(() {
      final removed = _subjects.removeAt(index);
      removed.dispose();
    });
  }

  Future<void> _pickSubjectDate(int index) async {
    final draft = _subjects[index];
    final picked = await showDatePicker(
      context: context,
      initialDate: draft.examDate,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
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

    if (picked != null) {
      setState(() {
        draft.examDate = picked;
      });
    }
  }

  Future<void> _submitOfflineExam() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedSessionId == null || _selectedSessionId!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an academic session')),
      );
      return;
    }

    if (_selectedBatch == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a target batch / class')),
      );
      return;
    }

    if (_subjects.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add at least one subject to this exam')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final subjectPayloads = _subjects.map((s) {
        final theory = int.tryParse(s.theoryController.text.trim()) ?? 0;
        final practical = int.tryParse(s.practicalController.text.trim()) ?? 0;
        final passing = int.tryParse(s.passingController.text.trim()) ?? 0;
        return {
          'subjectName': s.nameController.text.trim(),
          'examDate': s.examDate.toUtc().toIso8601String(),
          'maxMarks': theory + practical,
          'theoryMarks': theory,
          'practicalMarks': practical,
          'vivaMarks': 0,
          'passingMarks': passing,
        };
      }).toList();

      final payload = {
        'title': _titleController.text.trim(),
        'session': _selectedSessionId,
        'course': _selectedBatch!.courseId ?? _selectedBatch!.id,
        'batches': [_selectedBatch!.id],
        'examType': _examType,
        'status': _openMarksEntryImmediately ? 'marks_entry_open' : 'draft',
        'subjects': subjectPayloads,
        'weightagePercent': 100,
      };

      final examsProv = context.read<InstructorExamsProvider>();
      final res = await examsProv.createOfflineExam(payload);

      if (!mounted) return;

      if (res['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Color(0xFF10B981),
            content: Text('Offline exam scheduled successfully!'),
          ),
        );
        Navigator.pop(context, true);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFFEF4444),
            content: Text(res['message'] ?? 'Failed to schedule offline exam'),
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
    final sessionProv = context.watch<AcademicSessionProvider>();
    final batchesProv = context.watch<InstructorBatchesProvider>();
    final sessions = sessionProv.sessions;
    final batches = batchesProv.batches;

    final dateFormat = DateFormat('EEE, d MMM yyyy');

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
          'Schedule Offline Exam',
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
              onPressed: _isSubmitting ? null : _submitOfflineExam,
              icon: _isSubmitting
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF002045)))
                  : const Icon(Icons.check, size: 16),
              label: Text(
                _isSubmitting ? 'Saving...' : 'Save',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              style: TextButton.styleFrom(foregroundColor: const Color(0xFF002045)),
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
              title: 'Exam Information',
              icon: Icons.edit_calendar_rounded,
              children: [
                TextFormField(
                  controller: _titleController,
                  decoration: _buildInputDecoration(
                    label: 'Exam Title *',
                    hint: 'e.g. Unit Test 1 or Midterm Exam',
                  ),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Title is required' : null,
                ),
                const SizedBox(height: 14),

                // Academic Session Dropdown
                DropdownButtonFormField<String>(
                  value: _selectedSessionId,
                  decoration: _buildInputDecoration(
                    label: 'Academic Session *',
                    hint: 'Select Session',
                  ),
                  items: sessions.map((s) {
                    return DropdownMenuItem<String>(
                      value: s.id,
                      child: Text(
                        '${s.sessionName} ${s.isActive ? '(Active)' : ''}',
                        style: TextStyle(fontSize: 13, fontWeight: s.isActive ? FontWeight.bold : FontWeight.normal),
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedSessionId = val);
                  },
                  validator: (v) => v == null || v.isEmpty ? 'Session is required' : null,
                ),
                const SizedBox(height: 14),

                // Batch Dropdown
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

                // Exam Type Dropdown
                DropdownButtonFormField<String>(
                  value: _examType,
                  decoration: _buildInputDecoration(
                    label: 'Exam Category / Term',
                  ),
                  items: const [
                    DropdownMenuItem(value: 'unit_test', child: Text('Unit Test / Monthly Test', style: TextStyle(fontSize: 13))),
                    DropdownMenuItem(value: 'quarterly', child: Text('Quarterly Examination', style: TextStyle(fontSize: 13))),
                    DropdownMenuItem(value: 'half-yearly', child: Text('Half-Yearly Examination', style: TextStyle(fontSize: 13))),
                    DropdownMenuItem(value: 'annual', child: Text('Annual / Final Examination', style: TextStyle(fontSize: 13))),
                  ],
                  onChanged: (val) {
                    if (val != null) setState(() => _examType = val);
                  },
                ),
              ],
            ),

            const SizedBox(height: 16),

            // 2. Subject Breakdown Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Subjects & Marks (${_subjects.length})',
                  style: GoogleFonts.hankenGrotesk(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                TextButton.icon(
                  onPressed: _addSubject,
                  icon: const Icon(Icons.add_circle_outline, size: 16),
                  label: const Text('Add Subject', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  style: TextButton.styleFrom(foregroundColor: const Color(0xFF002045)),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Subject Cards
            ..._subjects.asMap().entries.map((entry) {
              final idx = entry.key;
              final draft = entry.value;

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 11,
                          backgroundColor: const Color(0xFF002045),
                          child: Text(
                            '${idx + 1}',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextFormField(
                            controller: draft.nameController,
                            decoration: const InputDecoration(
                              hintText: 'Subject Name (e.g. Science)',
                              isDense: true,
                              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              border: UnderlineInputBorder(),
                            ),
                            validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                          ),
                        ),
                        if (_subjects.length > 1)
                          IconButton(
                            icon: const Icon(Icons.delete_outline, size: 18, color: Color(0xFFEF4444)),
                            onPressed: () => _removeSubject(idx),
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Date Picker ListTile
                    InkWell(
                      onTap: () => _pickSubjectDate(idx),
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_today_outlined, size: 14, color: Color(0xFF002045)),
                            const SizedBox(width: 8),
                            Text(
                              'Exam Date: ${dateFormat.format(draft.examDate)}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                            ),
                            const Spacer(),
                            const Icon(Icons.edit_calendar_outlined, size: 14, color: Color(0xFF64748B)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Theory, Practical & Passing Marks
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: draft.theoryController,
                            keyboardType: TextInputType.number,
                            decoration: _buildInputDecoration(label: 'Theory Max', hint: '80'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextFormField(
                            controller: draft.practicalController,
                            keyboardType: TextInputType.number,
                            decoration: _buildInputDecoration(label: 'Practical Max', hint: '20'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextFormField(
                            controller: draft.passingController,
                            keyboardType: TextInputType.number,
                            decoration: _buildInputDecoration(label: 'Passing', hint: '35'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),

            const SizedBox(height: 10),

            // 3. Status
            _buildSectionCard(
              title: 'Status & Marks Entry',
              icon: Icons.tune_rounded,
              children: [
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  activeColor: const Color(0xFF002045),
                  title: const Text('Open for Marks Entry Immediately', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  subtitle: const Text('Allows instructors to input student marks as soon as scheduled', style: TextStyle(fontSize: 11)),
                  value: _openMarksEntryImmediately,
                  onChanged: (val) => setState(() => _openMarksEntryImmediately = val),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Submit Button
            ElevatedButton.icon(
              onPressed: _isSubmitting ? null : _submitOfflineExam,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF002045),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: _isSubmitting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.save_rounded, size: 18),
              label: Text(
                _isSubmitting ? 'Scheduling Exam...' : 'Schedule Offline Exam',
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
