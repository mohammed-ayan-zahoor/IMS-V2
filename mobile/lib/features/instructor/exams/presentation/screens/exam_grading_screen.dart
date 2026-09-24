import 'package:flutter/material.dart';
import 'package:student_app/features/instructor/exams/data/repositories/instructor_exams_repository.dart';

class ExamGradingScreen extends StatefulWidget {
  final String examId;
  final String examTitle;

  const ExamGradingScreen({
    super.key,
    required this.examId,
    required this.examTitle,
  });

  @override
  State<ExamGradingScreen> createState() => _ExamGradingScreenState();
}

class _ExamGradingScreenState extends State<ExamGradingScreen> {
  final InstructorExamsRepository _repo = InstructorExamsRepository();
  bool _isLoading = true;
  Map<String, dynamic>? _gradingData;

  @override
  void initState() {
    super.initState();
    _loadGradingData();
  }

  Future<void> _loadGradingData() async {
    setState(() => _isLoading = true);
    final data = await _repo.fetchGradingData(widget.examId);
    if (mounted) {
      setState(() {
        _gradingData = data;
        _isLoading = false;
      });
    }
  }

  void _showGradingDialog({
    required String questionId,
    required String questionText,
    required String submissionId,
    required String studentName,
    required String studentAnswer,
  }) {
    final marksController = TextEditingController();
    final feedbackController = TextEditingController();
    bool isSaving = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
            title: Text('Grade: $studentName', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Q: $questionText', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Text(
                      'Answer: $studentAnswer',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: marksController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'Marks Awarded',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: feedbackController,
                    decoration: InputDecoration(
                      labelText: 'Feedback (Optional)',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
              ElevatedButton(
                onPressed: isSaving
                    ? null
                    : () async {
                        final marks = int.tryParse(marksController.text.trim());
                        if (marks == null) return;
                        final messenger = ScaffoldMessenger.of(context);
                        setDialogState(() => isSaving = true);
                        final success = await _repo.gradeAnswer(
                          examId: widget.examId,
                          submissionId: submissionId,
                          questionId: questionId,
                          marksAwarded: marks,
                          feedback: feedbackController.text.trim(),
                        );
                        if (ctx.mounted) {
                          Navigator.pop(ctx);
                        }
                        if (mounted && success) {
                          _loadGradingData();
                          messenger.showSnackBar(
                            const SnackBar(content: Text('Answer graded successfully!'), backgroundColor: Color(0xFF10B981)),
                          );
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF002045),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: isSaving
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Submit Grade', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final questions = (_gradingData?['questions'] as List?) ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          'Grading: ${widget.examTitle}',
          style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 16),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF002045)))
          : questions.isEmpty
              ? const Center(
                  child: Text('No subjective answers requiring manual grading.', style: TextStyle(color: Color(0xFF64748B))),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: questions.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 14),
                  itemBuilder: (context, index) {
                    final item = questions[index];
                    final q = item['question'] ?? {};
                    final answers = (item['answers'] as List?) ?? [];
                    final qText = q['text']?.toString() ?? 'Question';
                    final qMarks = q['marks']?.toString() ?? '1';

                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFF1F5F9)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text('Q${index + 1} ($qMarks marks)', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF2563EB))),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  qText,
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const Divider(height: 1, color: Color(0xFFF1F5F9)),
                          const SizedBox(height: 8),
                          Text(
                            'Student Submissions (${answers.length})',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                          ),
                          const SizedBox(height: 6),
                          ...answers.map((ans) {
                            final student = ans['student'] ?? {};
                            final studentName = student['profile']?['firstName'] ?? student['name'] ?? 'Student';
                            final answerText = ans['answer']?.toString() ?? '(No answer)';
                            final marksAwarded = ans['marksAwarded'];
                            final isGraded = marksAwarded != null;

                            return Container(
                              margin: const EdgeInsets.only(top: 8),
                              padding: const EdgeInsets.all(10),
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
                                        Text(studentName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFF0F172A))),
                                        const SizedBox(height: 2),
                                        Text(answerText, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                                      ],
                                    ),
                                  ),
                                  ElevatedButton(
                                    onPressed: () {
                                      _showGradingDialog(
                                        questionId: q['_id']?.toString() ?? '',
                                        questionText: qText,
                                        submissionId: ans['submissionId']?.toString() ?? '',
                                        studentName: studentName,
                                        studentAnswer: answerText,
                                      );
                                    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: isGraded ? const Color(0xFF10B981) : const Color(0xFF002045),
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      elevation: 0,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    child: Text(
                                      isGraded ? 'Score: $marksAwarded' : 'Grade',
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
                                    ),
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
    );
  }
}
