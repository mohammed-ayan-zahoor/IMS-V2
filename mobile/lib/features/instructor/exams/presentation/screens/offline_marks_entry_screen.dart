import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/instructor/batches/presentation/providers/instructor_batches_provider.dart';
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
  List<OfflineExamBatchRef> _availableBatches = [];
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

    _initBatches();

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final batchesProvider = context.read<InstructorBatchesProvider>();
      if (batchesProvider.batches.isEmpty) {
        await batchesProvider.loadBatches();
      }
      if (mounted) {
        setState(() {
          _initBatches();
        });
        if (_selectedBatchId != null) {
          _loadResults();
        } else {
          setState(() => _isLoading = false);
        }
      }
    });

    if (_selectedBatchId != null) {
      _loadResults();
    }
  }

  void _initBatches() {
    final batchesProvider = context.read<InstructorBatchesProvider>();
    final instructorBatches = batchesProvider.batches;

    List<OfflineExamBatchRef> list = [];

    if (widget.exam.batches.isNotEmpty) {
      for (var b in widget.exam.batches) {
        String bName = b.name;
        if (bName == 'Batch' || bName.isEmpty) {
          final matched = instructorBatches.where((ib) => ib.id == b.id).firstOrNull;
          if (matched != null) bName = matched.name;
        }
        list.add(b.copyWith(name: bName));
      }
    } else {
      // In OfflineExam schema: if batches is empty, exam applies to all batches of the course
      for (var ib in instructorBatches) {
        final matchesCourse = widget.exam.courseName == null ||
            ib.courseName.toLowerCase() == widget.exam.courseName!.toLowerCase();
        if (matchesCourse) {
          list.add(OfflineExamBatchRef(id: ib.id, name: ib.name));
        }
      }
      if (list.isEmpty && instructorBatches.isNotEmpty) {
        for (var ib in instructorBatches) {
          list.add(OfflineExamBatchRef(id: ib.id, name: ib.name));
        }
      }
    }

    _availableBatches = list;
    if (_selectedBatchId == null && _availableBatches.isNotEmpty) {
      _selectedBatchId = _availableBatches.first.id;
    }
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
    final subjects = exam.subjects;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Marks: ${exam.title}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 16),
            ),
            if (exam.courseName != null)
              Text(
                exam.courseName!,
                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
              ),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: Color(0xFFC4C6CF))),
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
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: const Color(0xFFC4C6CF)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _availableBatches.any((b) => b.id == _selectedBatchId) ? _selectedBatchId : null,
                        isExpanded: true,
                        hint: Text(
                          _availableBatches.isEmpty ? 'No batches available' : 'Select Batch',
                          style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                        ),
                        items: _availableBatches.map((b) {
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
          : _availableBatches.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24.0),
                    child: Text(
                      'No batches assigned or found for this exam.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                    ),
                  ),
                )
              : _results.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.people_outline_rounded, size: 40, color: Color(0xFF94A3B8)),
                          const SizedBox(height: 10),
                          const Text(
                            'No active students found in this batch',
                            style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600, fontSize: 13),
                          ),
                          const SizedBox(height: 12),
                          OutlinedButton.icon(
                            onPressed: _loadResults,
                            icon: const Icon(Icons.refresh_rounded, size: 16),
                            label: const Text('Retry Loading', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF002045),
                              side: const BorderSide(color: Color(0xFFC4C6CF)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
                      itemCount: _results.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final studentResult = _results[index];

                        return Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(color: const Color(0xFFC4C6CF)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    radius: 15,
                                    backgroundColor: const Color(0xFFEFF6FF),
                                    child: Text(
                                      studentResult.studentName.isNotEmpty ? studentResult.studentName[0].toUpperCase() : 'S',
                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: Color(0xFF2563EB)),
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
                                        if (studentResult.rollNumber != null || studentResult.enrollmentNumber != null)
                                          Text(
                                            [
                                              if (studentResult.rollNumber != null) 'Roll: ${studentResult.rollNumber}',
                                              if (studentResult.enrollmentNumber != null) 'Enroll: ${studentResult.enrollmentNumber}',
                                            ].join(' • '),
                                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                          ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              const Divider(height: 1, color: Color(0xFFF1F5F9)),
                              const SizedBox(height: 8),

                              // Subjects marks rows
                              ...subjects.map((subj) {
                                final markEntry = studentResult.subjectMarks[subj.id] ??
                                    OfflineStudentSubjectMark(subjectId: subj.id);
                                studentResult.subjectMarks[subj.id] = markEntry;

                                return Container(
                                  margin: const EdgeInsets.only(bottom: 6),
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: const Color(0xFFC4C6CF)),
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
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(2)),
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
                                            height: 36,
                                            child: TextFormField(
                                              enabled: !markEntry.isAbsent,
                                              initialValue: markEntry.obtainedMarks?.toString() ?? '',
                                              keyboardType: TextInputType.number,
                                              textAlign: TextAlign.center,
                                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                                              decoration: InputDecoration(
                                                hintText: 'Marks',
                                                hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                                                filled: true,
                                                fillColor: markEntry.isAbsent ? const Color(0xFFE2E8F0) : Colors.white,
                                                contentPadding: EdgeInsets.zero,
                                                border: OutlineInputBorder(
                                                  borderRadius: BorderRadius.circular(4),
                                                  borderSide: const BorderSide(color: Color(0xFFC4C6CF)),
                                                ),
                                                enabledBorder: OutlineInputBorder(
                                                  borderRadius: BorderRadius.circular(4),
                                                  borderSide: const BorderSide(color: Color(0xFFC4C6CF)),
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
                padding: const EdgeInsets.all(12),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: Color(0xFFC4C6CF))),
                ),
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _saveMarks,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF002045),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                    elevation: 0,
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text(
                          'Save Marks',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                ),
              ),
            )
          : null,
    );
  }
}
