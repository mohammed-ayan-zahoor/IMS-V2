import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/instructor/exams/presentation/providers/instructor_exams_provider.dart';
import 'package:student_app/features/instructor/exams/presentation/screens/create_online_exam_screen.dart';
import 'package:student_app/features/instructor/exams/presentation/screens/exam_grading_screen.dart';
import 'package:student_app/features/instructor/exams/presentation/screens/offline_exams_screen.dart';
import 'package:student_app/features/instructor/exams/presentation/screens/online_exam_results_screen.dart';
import 'package:student_app/features/instructor/exams/presentation/screens/question_bank_screen.dart';
import 'package:student_app/l10n/app_localizations.dart';

class InstructorExamsScreen extends StatelessWidget {
  const InstructorExamsScreen({super.key});

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'published':
      case 'ongoing':
        return const Color(0xFF10B981);
      case 'completed':
        return const Color(0xFF2563EB);
      case 'draft':
      default:
        return const Color(0xFFF59E0B);
    }
  }

  Color _getStatusBg(String status) {
    switch (status.toLowerCase()) {
      case 'published':
      case 'ongoing':
        return const Color(0xFFECFDF5);
      case 'completed':
        return const Color(0xFFEFF6FF);
      case 'draft':
      default:
        return const Color(0xFFFFFBEB);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InstructorExamsProvider>();
    final l10n = AppLocalizations.of(context);
    final exams = provider.exams;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          l10n?.examsTitle ?? 'Exams & Grading',
          style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 17),
        ),
        actions: [
          IconButton(
            tooltip: 'Offline Exams',
            icon: const Icon(Icons.edit_calendar_rounded, color: Color(0xFF002045)),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const OfflineExamsScreen()),
              );
            },
          ),
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: OutlinedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const QuestionBankScreen()),
                );
              },
              icon: const Icon(Icons.quiz_outlined, size: 16),
              label: Text(
                l10n?.questionBankTitle ?? 'Question Bank',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF002045),
                side: const BorderSide(color: Color(0xFF002045)),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => provider.loadExams(refresh: true),
        color: const Color(0xFF002045),
        child: provider.isLoading && exams.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : exams.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.assignment_outlined, size: 48, color: Color(0xFF94A3B8)),
                        const SizedBox(height: 10),
                        Text(
                          l10n?.emptyState ?? 'No exams assigned',
                          style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: exams.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final exam = exams[index];
                      final statusColor = _getStatusColor(exam.status);
                      final statusBg = _getStatusBg(exam.status);

                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: const Color(0xFFC4C6CF)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    exam.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF0F172A),
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: statusBg,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    exam.status.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      color: statusColor,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${exam.courseName ?? 'General'} • ${exam.subjectName ?? 'Subject'}',
                              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.timer_outlined, size: 14, color: Color(0xFF64748B)),
                                    const SizedBox(width: 4),
                                    Text('${exam.duration} mins', style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                                  ],
                                ),
                                const SizedBox(width: 16),
                                Row(
                                  children: [
                                    const Icon(Icons.star_outline, size: 14, color: Color(0xFF64748B)),
                                    const SizedBox(width: 4),
                                    Text('${exam.totalMarks} Marks', style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            const Divider(height: 1, color: Color(0xFFF1F5F9)),
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                OutlinedButton.icon(
                                  onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => OnlineExamResultsScreen(exam: exam),
                                      ),
                                    );
                                  },
                                  icon: const Icon(Icons.analytics_outlined, size: 15, color: Color(0xFF002045)),
                                  label: const Text(
                                    'View Results',
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF002045)),
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: Color(0xFFC4C6CF)),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton.icon(
                                  onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => ExamGradingScreen(
                                          examId: exam.id,
                                          examTitle: exam.title,
                                        ),
                                      ),
                                    );
                                  },
                                  icon: const Icon(Icons.grade_outlined, size: 15, color: Colors.white),
                                  label: Text(
                                    l10n?.gradeSubmissions ?? 'Grade Answers',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                                  ),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF002045),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF002045),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_circle_outline, size: 20),
        label: const Text(
          'Create Exam',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
        ),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const CreateOnlineExamScreen()),
          );
        },
      ),
    );
  }
}
