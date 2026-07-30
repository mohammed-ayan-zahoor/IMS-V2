import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/practice/presentation/providers/practice_provider.dart';
import 'package:student_app/features/practice/data/models/practice_model.dart';

class PracticeScreen extends StatefulWidget {
  const PracticeScreen({super.key});

  @override
  State<PracticeScreen> createState() => _PracticeScreenState();
}

class _PracticeScreenState extends State<PracticeScreen> {
  // Config state
  String? _selectedSubjectName;
  String? _selectedSubjectId;
  String _selectedDifficulty = 'Intermediate';
  double _questionCount = 10;
  bool _timeLimitEnabled = true;
  bool _instantExplanationsEnabled = true;
  bool _showAllHistory = false;

  final List<String> _difficulties = ['Foundation', 'Intermediate', 'Advanced'];

  Future<void> _startPracticeSession(BuildContext context, PracticeProvider provider) async {
    final subId = _selectedSubjectId ?? (provider.subjects.isNotEmpty ? provider.subjects.values.first : null);
    if (subId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No subjects available for practice.')),
      );
      return;
    }

    String mappedDifficulty = 'medium';
    if (_selectedDifficulty == 'Foundation') mappedDifficulty = 'easy';
    if (_selectedDifficulty == 'Advanced') mappedDifficulty = 'hard';

    final sessionData = await provider.generateSession(
      subjectId: subId,
      count: _questionCount.toInt(),
      difficulty: mappedDifficulty,
    );

    if (!mounted) return;

    if (sessionData == null || (sessionData['questions'] as List).isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No practice questions available for the selected parameters.')),
      );
      return;
    }

    final String sessionId = sessionData['sessionId'];
    final List<QuestionModel> questions = sessionData['questions'];

    // Open Interactive Quiz Modal
    _showQuizModal(context, provider, sessionId, questions);
  }

  void _showQuizModal(
    BuildContext context,
    PracticeProvider provider,
    String sessionId,
    List<QuestionModel> questions,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: false,
      enableDrag: false,
      backgroundColor: Colors.white,
      builder: (context) {
        return QuizModalView(
          sessionId: sessionId,
          questions: questions,
          timeLimitEnabled: _timeLimitEnabled,
          instantExplanationsEnabled: _instantExplanationsEnabled,
          onComplete: (answers, score, correctCount) async {
            await provider.submitSession(
              sessionId: sessionId,
              answers: answers,
              score: score,
              correctCount: correctCount,
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<PracticeProvider>(
      builder: (context, provider, _) {
        return Scaffold(
          backgroundColor: const Color(0xFFF8F9FF),
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0.5,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Color(0xFF002045)),
              onPressed: () => Navigator.pop(context),
            ),
            title: Text(
              'Practice Arena',
              style: GoogleFonts.hankenGrotesk(
                color: const Color(0xFF0D1C2E),
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            centerTitle: false,
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            physics: const BouncingScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Title & Description
                Text(
                  'Practice Arena',
                  style: GoogleFonts.hankenGrotesk(
                    color: const Color(0xFF0D1C2E),
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Configure your mock test parameters and track your practice metrics.',
                  style: GoogleFonts.inter(
                    color: const Color(0xFF545F72),
                    fontSize: 13,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 20),

                // Performance Metrics Summary Bar
                Row(
                  children: [
                    _buildMetricTile(
                      'Tests Completed',
                      '${provider.testsTakenCount}',
                      'Session history',
                      Icons.assignment_turned_in_outlined,
                      const Color(0xFF2563EB),
                    ),
                    const SizedBox(width: 10),
                    _buildMetricTile(
                      'Avg Accuracy',
                      '${provider.averageScore}%',
                      'Overall score',
                      Icons.score_outlined,
                      const Color(0xFF16A34A),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Main Practice Configuration Card
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFC4C6CF)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.02),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      )
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Card Header
                      Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Row(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: const BoxDecoration(
                                color: Color(0xFFEFF4FF),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.settings_suggest, color: Color(0xFF002045), size: 20),
                            ),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'New Practice Session',
                                  style: GoogleFonts.hankenGrotesk(
                                    color: const Color(0xFF0D1C2E),
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  'Configure your mock test parameters.',
                                  style: GoogleFonts.inter(
                                    color: const Color(0xFF545F72),
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const Divider(color: Color(0xFFC4C6CF), height: 1),

                      Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // 1. Select Subject
                            Text(
                              'SELECT SUBJECT',
                              style: GoogleFonts.inter(
                                color: const Color(0xFF545F72),
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.8,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF4FF),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFC4C6CF).withValues(alpha: 0.5)),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: provider.subjects.containsKey(_selectedSubjectName)
                                      ? _selectedSubjectName
                                      : (provider.subjects.isNotEmpty ? provider.subjects.keys.first : null),
                                  isExpanded: true,
                                  icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF002045)),
                                  items: provider.subjects.keys.map((name) {
                                    return DropdownMenuItem<String>(
                                      value: name,
                                      child: Text(
                                        name,
                                        style: GoogleFonts.inter(
                                          color: const Color(0xFF0D1C2E),
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                  onChanged: (val) {
                                    if (val != null && provider.subjects.containsKey(val)) {
                                      setState(() {
                                        _selectedSubjectName = val;
                                        _selectedSubjectId = provider.subjects[val]!;
                                      });
                                    }
                                  },
                                ),
                              ),
                            ),
                            const SizedBox(height: 20),

                            // 2. Difficulty Level Segment
                            Text(
                              'DIFFICULTY LEVEL',
                              style: GoogleFonts.inter(
                                color: const Color(0xFF545F72),
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.8,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: _difficulties.map((diff) {
                                final isSelected = _selectedDifficulty == diff;
                                return Expanded(
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 3.0),
                                    child: GestureDetector(
                                      onTap: () {
                                        setState(() {
                                          _selectedDifficulty = diff;
                                        });
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(vertical: 10),
                                        decoration: BoxDecoration(
                                          color: isSelected ? const Color(0xFF002045) : const Color(0xFFEFF4FF),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          diff,
                                          textAlign: TextAlign.center,
                                          style: GoogleFonts.inter(
                                            color: isSelected ? Colors.white : const Color(0xFF545F72),
                                            fontSize: 12,
                                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                            const SizedBox(height: 20),

                            // 3. Question Count Slider
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'QUESTION COUNT',
                                  style: GoogleFonts.inter(
                                    color: const Color(0xFF545F72),
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                                Text(
                                  '${_questionCount.toInt()} Questions',
                                  style: GoogleFonts.hankenGrotesk(
                                    color: const Color(0xFF002045),
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            SliderTheme(
                              data: SliderThemeData(
                                activeTrackColor: const Color(0xFF002045),
                                inactiveTrackColor: const Color(0xFFD4E4FC),
                                thumbColor: const Color(0xFF002045),
                                overlayColor: const Color(0xFF002045).withValues(alpha: 0.1),
                              ),
                              child: Slider(
                                value: _questionCount,
                                min: 5,
                                max: 20,
                                divisions: 3,
                                onChanged: (val) {
                                  setState(() {
                                    _questionCount = val;
                                  });
                                },
                              ),
                            ),
                            const SizedBox(height: 12),

                            // 4. Option Toggles (Time Limit & Instant Explanations)
                            SwitchListTile(
                              contentPadding: EdgeInsets.zero,
                              activeColor: const Color(0xFF002045),
                              title: Text(
                                'Time Limit (1 min/question)',
                                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF0D1C2E)),
                              ),
                              value: _timeLimitEnabled,
                              onChanged: (val) => setState(() => _timeLimitEnabled = val),
                            ),
                            SwitchListTile(
                              contentPadding: EdgeInsets.zero,
                              activeColor: const Color(0xFF002045),
                              title: Text(
                                'Instant Explanations',
                                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF0D1C2E)),
                              ),
                              value: _instantExplanationsEnabled,
                              onChanged: (val) => setState(() => _instantExplanationsEnabled = val),
                            ),
                            const SizedBox(height: 16),

                            // Start Session Button
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                onPressed: provider.isLoading
                                    ? null
                                    : () => _startPracticeSession(context, provider),
                                icon: provider.isLoading
                                    ? const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                      )
                                    : const Icon(Icons.play_arrow_rounded, color: Colors.white),
                                label: Text(
                                  provider.isLoading ? 'Generating Session...' : 'Start Practice Session',
                                  style: GoogleFonts.hankenGrotesk(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF002045),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Recent Practice Sessions Section
                Text(
                  'Recent Practice Sessions',
                  style: GoogleFonts.hankenGrotesk(
                    color: const Color(0xFF0D1C2E),
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),

                if (provider.history.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFC4C6CF)),
                    ),
                    child: Center(
                      child: Text(
                        'No practice sessions found. Start one above!',
                        style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 13),
                      ),
                    ),
                  )
                else Column(
                  children: [
                    Builder(
                      builder: (context) {
                        final displayList = _showAllHistory ? provider.history : provider.history.take(5).toList();
                        return ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: displayList.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final item = displayList[index];
                            final isCompleted = item.status == 'completed';

                            return Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFC4C6CF)),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 42,
                                    height: 42,
                                    decoration: BoxDecoration(
                                      color: isCompleted ? const Color(0xFFE6F4EA) : const Color(0xFFEFF4FF),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(
                                      isCompleted ? Icons.check_circle_outline : Icons.history_toggle_off,
                                      color: isCompleted ? const Color(0xFF137333) : const Color(0xFF2563EB),
                                      size: 22,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              item.subjectName,
                                              style: GoogleFonts.hankenGrotesk(
                                                color: const Color(0xFF0D1C2E),
                                                fontSize: 15,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFFEFF4FF),
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: Text(
                                                item.difficulty,
                                                style: GoogleFonts.inter(
                                                  color: const Color(0xFF2563EB),
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${item.totalQuestions} Questions • ${item.createdAt.day}/${item.createdAt.month}/${item.createdAt.year}',
                                          style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 12),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        isCompleted ? '${item.score.toInt()}%' : 'In Progress',
                                        style: GoogleFonts.hankenGrotesk(
                                          color: isCompleted ? const Color(0xFF002045) : const Color(0xFFD97706),
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      if (isCompleted)
                                        Text(
                                          '${item.correctCount}/${item.totalQuestions} Correct',
                                          style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 11),
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        );
                      },
                    ),
                    if (provider.history.length > 5) ...[
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () {
                          setState(() {
                            _showAllHistory = !_showAllHistory;
                          });
                        },
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              _showAllHistory ? 'Show Less' : 'View All (${provider.history.length})',
                              style: GoogleFonts.inter(
                                color: const Color(0xFF002045),
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                            Icon(
                              _showAllHistory ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                              color: const Color(0xFF002045),
                              size: 18,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMetricTile(String title, String value, String subtitle, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFC4C6CF)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF545F72),
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Icon(icon, color: color, size: 18),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: GoogleFonts.hankenGrotesk(
                color: const Color(0xFF0D1C2E),
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: GoogleFonts.inter(
                color: const Color(0xFF545F72),
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Full Screen Interactive Quiz Modal
class QuizModalView extends StatefulWidget {
  final String sessionId;
  final List<QuestionModel> questions;
  final bool timeLimitEnabled;
  final bool instantExplanationsEnabled;
  final Future<void> Function(List<Map<String, dynamic>> answers, double score, int correctCount) onComplete;

  const QuizModalView({
    super.key,
    required this.sessionId,
    required this.questions,
    required this.timeLimitEnabled,
    required this.instantExplanationsEnabled,
    required this.onComplete,
  });

  @override
  State<QuizModalView> createState() => _QuizModalViewState();
}

class _QuizModalViewState extends State<QuizModalView> {
  int _currentIndex = 0;
  final Map<int, int> _selectedAnswers = {}; // questionIndex -> optionIndex
  Timer? _timer;
  late int _remainingSeconds;
  bool _isSubmitted = false;

  @override
  void initState() {
    super.initState();
    _remainingSeconds = widget.timeLimitEnabled ? widget.questions.length * 60 : 0;
    if (widget.timeLimitEnabled) {
      _startTimer();
    }
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        setState(() {
          _remainingSeconds--;
        });
      } else {
        _timer?.cancel();
        _submitQuiz();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _submitQuiz() async {
    if (_isSubmitted) return;
    setState(() {
      _isSubmitted = true;
    });
    _timer?.cancel();

    int correctCount = 0;
    final List<Map<String, dynamic>> formattedAnswers = [];

    for (int i = 0; i < widget.questions.length; i++) {
      final q = widget.questions[i];
      final userAnsIndex = _selectedAnswers[i];
      final isCorrect = userAnsIndex != null && userAnsIndex == q.correctOption;

      if (isCorrect) correctCount++;

      formattedAnswers.add({
        'question': q.id,
        'userAnswer': userAnsIndex,
        'isCorrect': isCorrect,
      });
    }

    final double score = ((correctCount / widget.questions.length) * 100).roundToDouble();

    await widget.onComplete(formattedAnswers, score, correctCount);
    if (!mounted) return;

    // Show Result Sheet
    _showResultSheet(context, score, correctCount, widget.questions.length);
  }

  void _showResultSheet(BuildContext context, double score, int correctCount, int total) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Practice Complete!',
          textAlign: TextAlign.center,
          style: GoogleFonts.hankenGrotesk(fontSize: 22, fontWeight: FontWeight.bold, color: const Color(0xFF002045)),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(
                color: Color(0xFFE6F4EA),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.emoji_events, color: Color(0xFF137333), size: 40),
            ),
            const SizedBox(height: 16),
            Text(
              '${score.toInt()}%',
              style: GoogleFonts.hankenGrotesk(fontSize: 36, fontWeight: FontWeight.bold, color: const Color(0xFF002045)),
            ),
            const SizedBox(height: 4),
            Text(
              'You answered $correctCount out of $total questions correctly.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF545F72)),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(context); // Close dialog
                Navigator.pop(context); // Close quiz modal
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF002045),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: Text('Done', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currentQ = widget.questions[_currentIndex];
    final selectedOpt = _selectedAnswers[_currentIndex];
    final String timerText = widget.timeLimitEnabled
        ? '${(_remainingSeconds ~/ 60).toString().padLeft(2, '0')}:${(_remainingSeconds % 60).toString().padLeft(2, '0')}'
        : 'Untimed';

    return Container(
      height: MediaQuery.of(context).size.height * 0.92,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Bar with Close & Timer
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.close, color: Color(0xFF0D1C2E)),
                onPressed: () => Navigator.pop(context),
              ),
              Container(
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
                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF002045)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Question Progress Indicator
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Question ${_currentIndex + 1} of ${widget.questions.length}',
                style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF545F72)),
              ),
              Text(
                currentQ.difficulty.toUpperCase(),
                style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: const Color(0xFF2563EB)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          LinearProgressIndicator(
            value: (_currentIndex + 1) / widget.questions.length,
            backgroundColor: const Color(0xFFD4E4FC),
            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF002045)),
          ),
          const SizedBox(height: 20),

          // Question Text
          Text(
            currentQ.text,
            style: GoogleFonts.hankenGrotesk(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF0D1C2E),
              height: 1.3,
            ),
          ),
          const SizedBox(height: 20),

          // Options List
          Expanded(
            child: ListView.separated(
              itemCount: currentQ.options.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final isSelected = selectedOpt == index;
                final isCorrectOption = currentQ.correctOption == index;
                final isAnswered = selectedOpt != null;

                Color optionBorderColor = const Color(0xFFC4C6CF);
                Color optionBgColor = Colors.white;

                if (isAnswered && widget.instantExplanationsEnabled) {
                  if (isCorrectOption) {
                    optionBorderColor = const Color(0xFF137333);
                    optionBgColor = const Color(0xFFE6F4EA);
                  } else if (isSelected) {
                    optionBorderColor = const Color(0xFFBA1A1A);
                    optionBgColor = const Color(0xFFFCE8E6);
                  }
                } else if (isSelected) {
                  optionBorderColor = const Color(0xFF002045);
                  optionBgColor = const Color(0xFFEFF4FF);
                }

                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedAnswers[_currentIndex] = index;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: optionBgColor,
                      border: Border.all(color: optionBorderColor, width: isSelected ? 2 : 1),
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
                              String.fromCharCode(65 + index), // A, B, C, D
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
                            currentQ.options[index],
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

          // Instant Explanation View (If Enabled)
          if (selectedOpt != null && widget.instantExplanationsEnabled) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF4FF),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFC4C6CF).withValues(alpha: 0.5)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline, color: Color(0xFF002045), size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      currentQ.explanation,
                      style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF0D1C2E), height: 1.3),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Footer Navigation Bar (Previous / Next / Submit)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (_currentIndex > 0)
                OutlinedButton(
                  onPressed: () {
                    setState(() {
                      _currentIndex--;
                    });
                  },
                  child: Text('Previous', style: GoogleFonts.inter(color: const Color(0xFF002045))),
                )
              else
                const SizedBox.shrink(),
              ElevatedButton(
                onPressed: () {
                  if (_currentIndex < widget.questions.length - 1) {
                    setState(() {
                      _currentIndex++;
                    });
                  } else {
                    _submitQuiz();
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF002045),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                ),
                child: Text(
                  _currentIndex == widget.questions.length - 1 ? 'Submit Test' : 'Next Question',
                  style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
