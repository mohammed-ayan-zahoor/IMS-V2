import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_app/features/exams/data/models/exam_model.dart';

class TakeExamScreen extends StatefulWidget {
  final String submissionId;
  final String examTitle;
  final int durationMinutes;
  final int totalMarks;
  final List<ExamQuestionModel> questions;
  final Future<void> Function(List<Map<String, dynamic>> answers) onSubmit;

  const TakeExamScreen({
    super.key,
    required this.submissionId,
    required this.examTitle,
    required this.durationMinutes,
    required this.totalMarks,
    required this.questions,
    required this.onSubmit,
  });

  @override
  State<TakeExamScreen> createState() => _TakeExamScreenState();
}

class _TakeExamScreenState extends State<TakeExamScreen> {
  int _currentIndex = 0;
  final Map<int, String> _userAnswers = {}; // index -> option text or index string
  Timer? _timer;
  late int _remainingSeconds;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _remainingSeconds = widget.durationMinutes * 60;
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        setState(() {
          _remainingSeconds--;
        });
      } else {
        _timer?.cancel();
        _submitExam();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _submitExam() async {
    if (_isSubmitting) return;
    setState(() {
      _isSubmitting = true;
    });
    _timer?.cancel();

    final List<Map<String, dynamic>> formattedAnswers = [];

    for (int i = 0; i < widget.questions.length; i++) {
      final q = widget.questions[i];
      final ans = _userAnswers[i] ?? '';

      formattedAnswers.add({
        'questionId': q.id,
        'answer': ans,
      });
    }

    try {
      await widget.onSubmit(formattedAnswers);
      if (mounted) {
        Navigator.pop(context, true);
      }
    } catch (e) {
      print('Submit exam error: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  void _confirmSubmit() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Submit Exam?',
          style: GoogleFonts.hankenGrotesk(fontWeight: FontWeight.bold, color: const Color(0xFF002045)),
        ),
        content: Text(
          'You have answered ${_userAnswers.length} of ${widget.questions.length} questions. Are you sure you want to finalize your submission?',
          style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Continue Exam', style: GoogleFonts.inter(color: const Color(0xFF545F72))),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _submitExam();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF002045),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text('Submit Final', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.questions.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.examTitle)),
        body: const Center(child: Text('No questions available.')),
      );
    }

    final currentQ = widget.questions[_currentIndex];
    final selectedAns = _userAnswers[_currentIndex];
    final String timerText =
        '${(_remainingSeconds ~/ 60).toString().padLeft(2, '0')}:${(_remainingSeconds % 60).toString().padLeft(2, '0')}';

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FF),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        automaticallyImplyLeading: false,
        title: Text(
          widget.examTitle,
          style: GoogleFonts.hankenGrotesk(color: const Color(0xFF0D1C2E), fontWeight: FontWeight.bold, fontSize: 16),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF4FF),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                const Icon(Icons.timer_outlined, size: 16, color: Color(0xFF002045)),
                const SizedBox(width: 6),
                Text(
                  timerText,
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF002045)),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Progress Bar
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Question ${_currentIndex + 1} of ${widget.questions.length}',
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF545F72)),
                  ),
                  Text(
                    '${currentQ.marks} Marks',
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF2563EB)),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              LinearProgressIndicator(
                value: (_currentIndex + 1) / widget.questions.length,
                backgroundColor: const Color(0xFFD4E4FC),
                valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF002045)),
              ),
              const SizedBox(height: 16),

              // Question Text Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFC4C6CF)),
                ),
                child: Text(
                  currentQ.text,
                  style: GoogleFonts.hankenGrotesk(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0D1C2E),
                    height: 1.3,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Options
              Expanded(
                child: ListView.separated(
                  itemCount: currentQ.options.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final optText = currentQ.options[index];
                    final optKey = index.toString(); // Index string matching backend
                    final isSelected = selectedAns == optKey || selectedAns == optText;

                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          _userAnswers[_currentIndex] = optKey;
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFFEFF4FF) : Colors.white,
                          border: Border.all(
                            color: isSelected ? const Color(0xFF002045) : const Color(0xFFC4C6CF),
                            width: isSelected ? 2 : 1,
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isSelected ? const Color(0xFF002045) : const Color(0xFFEFF4FF),
                              ),
                              child: Center(
                                child: Text(
                                  String.fromCharCode(65 + index),
                                  style: GoogleFonts.inter(
                                    color: isSelected ? Colors.white : const Color(0xFF002045),
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Text(
                                optText,
                                style: GoogleFonts.inter(
                                  fontSize: 14,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                  color: const Color(0xFF0D1C2E),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),

              // Bottom Navigation Bar
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (_currentIndex > 0)
                    OutlinedButton(
                      onPressed: () => setState(() => _currentIndex--),
                      child: Text('Previous', style: GoogleFonts.inter(color: const Color(0xFF002045))),
                    )
                  else
                    const SizedBox.shrink(),
                  if (_currentIndex < widget.questions.length - 1)
                    ElevatedButton(
                      onPressed: () => setState(() => _currentIndex++),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF002045),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      ),
                      child: Text('Next Question', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold)),
                    )
                  else
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _confirmSubmit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF16A34A),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Text('Submit Exam', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
