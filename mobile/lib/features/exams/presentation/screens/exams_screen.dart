import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/exams/presentation/providers/exams_provider.dart';
import 'package:student_app/features/exams/data/models/exam_model.dart';
import 'package:student_app/features/exams/presentation/screens/take_exam_screen.dart';
import 'package:student_app/features/exams/presentation/dialogs/exam_result_dialog.dart';

class ExamsScreen extends StatefulWidget {
  const ExamsScreen({super.key});

  @override
  State<ExamsScreen> createState() => _ExamsScreenState();
}

class _ExamsScreenState extends State<ExamsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        Provider.of<ExamsProvider>(context, listen: false).loadExams(refresh: true);
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _handleStartOrResumeExam(BuildContext context, ExamsProvider provider, ExamModel exam) async {
    // Show Instructions Sheet before launching test
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetContext) {
        bool isStarting = false;
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Container(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        exam.title,
                        style: GoogleFonts.hankenGrotesk(fontSize: 18, fontWeight: FontWeight.bold, color: const Color(0xFF002045)),
                      ),
                      IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(sheetContext)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Course: ${exam.courseName} • Subject: ${exam.subjectName}',
                    style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF545F72)),
                  ),
                  const SizedBox(height: 16),

                  // Exam Rules Summary Grid
                  Row(
                    children: [
                      _buildRuleBadge('Duration', '${exam.duration} mins', Icons.timer_outlined),
                      const SizedBox(width: 8),
                      _buildRuleBadge('Passing', '${exam.passingMarks}/${exam.totalMarks} Marks', Icons.score),
                      const SizedBox(width: 8),
                      _buildRuleBadge('Attempts', '${exam.attemptsUsed}/${exam.maxAttempts}', Icons.replay),
                    ],
                  ),
                  const SizedBox(height: 16),

                  Text('EXAM INSTRUCTIONS', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF545F72))),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF4FF),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      exam.instructions,
                      style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF0D1C2E), height: 1.4),
                    ),
                  ),
                  const SizedBox(height: 20),

                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: isStarting
                          ? null
                          : () async {
                              setSheetState(() {
                                isStarting = true;
                              });

                              final examSessionData = await provider.startExam(exam.id);

                              if (!mounted) return;

                              if (examSessionData == null) {
                                setSheetState(() {
                                  isStarting = false;
                                });
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Failed to start exam session. Attempt limit reached or server unavailable.')),
                                );
                                return;
                              }

                              Navigator.pop(sheetContext); // Pop bottom sheet NOW that session is ready

                              final String subId = examSessionData['submissionId'];
                              final List<ExamQuestionModel> questions = examSessionData['questions'];

                              // Open Take Exam Runner Screen
                              final submitted = await Navigator.push<bool>(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => TakeExamScreen(
                                    submissionId: subId,
                                    examTitle: examSessionData['examTitle'],
                                    durationMinutes: examSessionData['duration'],
                                    totalMarks: examSessionData['totalMarks'],
                                    questions: questions,
                                    onSubmit: (answers) async {
                                      await provider.submitExam(
                                        submissionId: subId,
                                        answers: answers,
                                      );
                                    },
                                  ),
                                ),
                              );

                              if (mounted && submitted == true) {
                                _handleViewResult(provider, subId);
                              }
                            },
                      icon: isStarting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Icon(Icons.play_arrow_rounded, color: Colors.white),
                      label: Text(
                        isStarting ? 'Preparing Exam...' : 'Begin Exam Now',
                        style: GoogleFonts.hankenGrotesk(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF002045),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _handleViewResult(ExamsProvider provider, String id) async {
    final result = await provider.fetchResult(id);
    if (!mounted) return;

    if (result != null) {
      showDialog(
        context: context,
        builder: (_) => ExamResultDialog(result: result),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Result not published yet or unavailable.')),
      );
    }
  }

  Widget _buildRuleBadge(String title, String val, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFF8F9FF),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFC4C6CF).withValues(alpha: 0.5)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 16, color: const Color(0xFF002045)),
            const SizedBox(height: 4),
            Text(title.toUpperCase(), style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.bold, color: const Color(0xFF545F72))),
            const SizedBox(height: 2),
            Text(val, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF0D1C2E))),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ExamsProvider>(
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
              'Online Exams & Tests',
              style: GoogleFonts.hankenGrotesk(
                color: const Color(0xFF0D1C2E),
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            bottom: TabBar(
              controller: _tabController,
              labelColor: const Color(0xFF002045),
              unselectedLabelColor: const Color(0xFF545F72),
              indicatorColor: const Color(0xFF002045),
              indicatorWeight: 3,
              labelStyle: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13),
              tabs: const [
                Tab(text: 'Available'),
                Tab(text: 'Completed'),
                Tab(text: 'Upcoming'),
              ],
            ),
          ),
          body: provider.isLoading
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF002045)))
              : RefreshIndicator(
                  onRefresh: () => provider.loadExams(refresh: true),
                  color: const Color(0xFF002045),
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildExamsList(context, provider, provider.availableExams, 'No available exams at this time.'),
                      _buildExamsList(context, provider, provider.completedExams, 'No completed exam records.'),
                      _buildExamsList(context, provider, provider.upcomingOrMissedExams, 'No upcoming or missed exams.'),
                    ],
                  ),
                ),
        );
      },
    );
  }

  Widget _buildExamsList(BuildContext context, ExamsProvider provider, List<ExamModel> list, String emptyMsg) {
    if (list.isEmpty) {
      return Center(
        child: Text(
          emptyMsg,
          style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 13),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final exam = list[index];
        final isAvailable = exam.submissionStatus == 'available' || exam.submissionStatus == 'in_progress';
        final isCompleted = exam.submissionStatus == 'submitted';

        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFC4C6CF)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Card Header
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF4FF),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            exam.subjectName,
                            style: GoogleFonts.inter(
                              color: const Color(0xFF2563EB),
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: isCompleted
                                ? const Color(0xFFE6F4EA)
                                : isAvailable
                                    ? const Color(0xFFEFF4FF)
                                    : const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            exam.submissionStatus.toUpperCase(),
                            style: GoogleFonts.inter(
                              color: isCompleted
                                  ? const Color(0xFF137333)
                                  : isAvailable
                                      ? const Color(0xFF002045)
                                      : const Color(0xFFD97706),
                              fontWeight: FontWeight.bold,
                              fontSize: 10,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    Text(
                      exam.title,
                      style: GoogleFonts.hankenGrotesk(
                        color: const Color(0xFF0D1C2E),
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),

                    Text(
                      'Course: ${exam.courseName} • Duration: ${exam.duration} Mins',
                      style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 12),
                    ),
                    const SizedBox(height: 12),

                    // Metrics Grid (Passing Marks & Total Marks & Attempts)
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildMetricChip('Passing Marks', '${exam.passingMarks} / ${exam.totalMarks}'),
                        _buildMetricChip('Attempts', '${exam.attemptsUsed} / ${exam.maxAttempts}'),
                        if (exam.bestScore != null)
                          _buildMetricChip('Best Score', '${exam.bestScore!.toInt()} (${exam.bestPercentage?.toInt()}%)'),
                      ],
                    ),
                  ],
                ),
              ),

              const Divider(color: Color(0xFFC4C6CF), height: 1),

              // Action Button Bar
              Padding(
                padding: const EdgeInsets.all(12.0),
                child: SizedBox(
                  width: double.infinity,
                  child: isCompleted
                      ? ElevatedButton.icon(
                          onPressed: () => _handleViewResult(provider, exam.id),
                          icon: const Icon(Icons.assessment_outlined, color: Colors.white, size: 18),
                          label: Text('View Score & Result', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF002045),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        )
                      : isAvailable
                          ? ElevatedButton.icon(
                              onPressed: () => _handleStartOrResumeExam(context, provider, exam),
                              icon: Icon(
                                exam.submissionStatus == 'in_progress' ? Icons.play_arrow : Icons.assignment_turned_in,
                                color: Colors.white,
                                size: 18,
                              ),
                              label: Text(
                                exam.submissionStatus == 'in_progress'
                                    ? 'Resume Active Exam'
                                    : (exam.attemptsUsed > 0 ? 'Re-attempt Exam' : 'Start Online Exam'),
                                style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF002045),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                            )
                          : Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              alignment: Alignment.center,
                              child: Text(
                                'Scheduled: ${exam.startTime.day}/${exam.startTime.month} at ${exam.startTime.hour}:${exam.startTime.minute.toString().padLeft(2, '0')}',
                                style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMetricChip(String label, String val) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF4FF),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        children: [
          Text('$label: ', style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF545F72))),
          Text(val, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF002045))),
        ],
      ),
    );
  }
}
