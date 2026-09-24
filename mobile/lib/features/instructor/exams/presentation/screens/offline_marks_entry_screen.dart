import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/instructor/exams/data/models/offline_exam_model.dart';
import 'package:student_app/features/instructor/exams/presentation/providers/instructor_exams_provider.dart';

class OfflineMarksEntryScreen extends StatefulWidget {
  final OfflineExamItem exam;
  final String? initialBatchId;

  const OfflineMarksEntryScreen({
    super.key,
    required this.exam,
    this.initialBatchId,
  });

  @override
  State<OfflineMarksEntryScreen> createState() => _OfflineMarksEntryScreenState();
}

class _OfflineMarksEntryScreenState extends State<OfflineMarksEntryScreen> {
  String? _selectedBatchId;
  bool _isLoading = true;
  bool _isSaving = false;
  List<OfflineStudentResultEntry> _results = [];

  @override
  void initState() {
    super.initState();
    if (widget.initialBatchId != null) {
      _selectedBatchId = widget.initialBatchId;
    } else if (widget.exam.batches.isNotEmpty) {
      _selectedBatchId = widget.exam.batches.first.id;
    }
    _loadResults();
  }

  Future<void> _loadResults() async {
    if (_selectedBatchId == null) {
      setState(() => _isLoading = false);
      return;
    }

    setState(() => _isLoading = true);
    final provider = context.read<InstructorExamsProvider>();
    final data = await provider.fetchOfflineResults(
      examId: widget.exam.id,
      batchId: _selectedBatchId!,
      subjects: widget.exam.subjects,
    );

    if (mounted) {
      setState(() {
        _results = data;
        _isLoading = false;
      });
    }
  }

  Future<void> _saveMarks() async {
    if (_selectedBatchId == null || _results.isEmpty) return;

    setState(() => _isSaving = true);
    final provider = context.read<InstructorExamsProvider>();
    final success = await provider.saveOfflineResults(
      examId: widget.exam.id,
      batchId: _selectedBatchId!,
      results: _results,
    );

    if (mounted) {
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success ? 'Exam marks saved successfully!' : 'Failed to save marks. Try again.'),
          backgroundColor: success ? const Color(0xFF10B981) : const Color(0xFFBA1A1A),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final exam = widget.exam;
    final batches = exam.batches;
    final subjects = exam.subjects;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          'Marks: ${exam.title}',
          style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 16),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Row(
              children: [
                const Text(
                  'Batch: ',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedBatchId,
                        isExpanded: true,
                        hint: const Text('Select Batch', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                        items: batches.map((b) {
                          return DropdownMenuItem<String>(
                            value: b.id,
                            child: Text(
                              b.name,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null && val != _selectedBatchId) {
                            setState(() => _selectedBatchId = val);
                            _loadResults();
                          }
                        },
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF002045)))
          : _results.isEmpty
              ? const Center(
                  child: Text('No students found in this batch', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                  itemCount: _results.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final studentResult = _results[index];

                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFF1F5F9)),
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
                              CircleAvatar(
                                radius: 16,
                                backgroundColor: const Color(0xFFEFF6FF),
                                child: Text(
                                  studentResult.studentName.isNotEmpty ? studentResult.studentName[0].toUpperCase() : 'S',
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFF2563EB)),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      studentResult.studentName,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                    ),
                                    if (studentResult.rollNumber != null)
                                      Text(
                                        'Roll: ${studentResult.rollNumber}',
                                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const Divider(height: 1, color: Color(0xFFF1F5F9)),
                          const SizedBox(height: 10),

                          // Subjects marks rows
                          ...subjects.map((subj) {
                            final markEntry = studentResult.subjectMarks[subj.id] ??
                                OfflineStudentSubjectMark(subjectId: subj.id);
                            studentResult.subjectMarks[subj.id] = markEntry;

                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          subj.name,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                                        ),
                                        Text(
                                          'Max: ${subj.maxMarks} • Pass: ${subj.passMarks}',
                                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Row(
                                    children: [
                                      // Absent checkbox
                                      Row(
                                        children: [
                                          Checkbox(
                                            value: markEntry.isAbsent,
                                            activeColor: const Color(0xFFEF4444),
                                            onChanged: (val) {
                                              setState(() {
                                                markEntry.isAbsent = val == true;
                                                if (markEntry.isAbsent) {
                                                  markEntry.obtainedMarks = 0;
                                                }
                                              });
                                            },
                                          ),
                                          const Text('Ab', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFEF4444))),
                                        ],
                                      ),
                                      const SizedBox(width: 8),
                                      // Marks input
                                      SizedBox(
                                        width: 60,
                                        height: 38,
                                        child: TextFormField(
                                          enabled: !markEntry.isAbsent,
                                          initialValue: markEntry.obtainedMarks?.toString() ?? '',
                                          keyboardType: TextInputType.number,
                                          textAlign: TextAlign.center,
                                          decoration: InputDecoration(
                                            hintText: 'Marks',
                                            hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                                            filled: true,
                                            fillColor: markEntry.isAbsent ? const Color(0xFFE2E8F0) : Colors.white,
                                            contentPadding: EdgeInsets.zero,
                                            border: OutlineInputBorder(
                                              borderRadius: BorderRadius.circular(8),
                                              borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                                            ),
                                          ),
                                          onChanged: (val) {
                                            markEntry.obtainedMarks = int.tryParse(val.trim());
                                          },
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          }),
                        ],
                      ),
                    );
                  },
                ),
      bottomNavigationBar: _results.isNotEmpty
          ? SafeArea(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 10,
                      offset: const Offset(0, -3),
                    ),
                  ],
                ),
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _saveMarks,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF002045),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text(
                          'Save Marks',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                ),
              ),
            )
          : null,
    );
  }
}
