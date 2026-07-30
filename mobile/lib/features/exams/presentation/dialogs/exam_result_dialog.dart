import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_app/features/exams/data/models/exam_model.dart';

class ExamResultDialog extends StatelessWidget {
  final ExamSubmissionResultModel result;

  const ExamResultDialog({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      insetPadding: const EdgeInsets.all(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: Title & Close Button
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    result.examTitle,
                    style: GoogleFonts.hankenGrotesk(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0D1C2E),
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Color(0xFF0D1C2E)),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Pass/Fail or Notice Banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: result.message != null
                    ? const Color(0xFFEFF4FF)
                    : (result.isPassed ? const Color(0xFFE6F4EA) : const Color(0xFFFCE8E6)),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: result.message != null
                      ? const Color(0xFF2563EB)
                      : (result.isPassed ? const Color(0xFF137333) : const Color(0xFFBA1A1A)),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    result.message != null
                        ? Icons.info_outline
                        : (result.isPassed ? Icons.check_circle : Icons.cancel),
                    color: result.message != null
                        ? const Color(0xFF2563EB)
                        : (result.isPassed ? const Color(0xFF137333) : const Color(0xFFBA1A1A)),
                    size: 32,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          result.message != null
                              ? 'SUBMISSION RECEIVED'
                              : (result.isPassed ? 'PASSED EXAM' : 'FAILED EXAM'),
                          style: GoogleFonts.inter(
                            color: result.message != null
                                ? const Color(0xFF2563EB)
                                : (result.isPassed ? const Color(0xFF137333) : const Color(0xFFBA1A1A)),
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          result.message ??
                              'Score: ${result.score.toInt()} / ${result.totalMarks} (${result.percentage.toInt()}%) • Passing: ${result.passingMarks}',
                          style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Question Breakdown List
            if (result.answers.isNotEmpty) ...[
              Text(
                'Detailed Answers Breakdown',
                style: GoogleFonts.hankenGrotesk(fontSize: 15, fontWeight: FontWeight.bold, color: const Color(0xFF0D1C2E)),
              ),
              const SizedBox(height: 10),
            ],

            Expanded(
              child: result.answers.isEmpty
                  ? Center(
                      child: Text(
                        result.message ?? 'No detailed question review available.',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 13),
                      ),
                    )
                  : ListView.separated(
                      itemCount: result.answers.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final item = result.answers[index];
                        return Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8F9FF),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFC4C6CF).withValues(alpha: 0.6)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    item.isCorrect ? Icons.check_circle_outline : Icons.highlight_off,
                                    color: item.isCorrect ? const Color(0xFF137333) : const Color(0xFFBA1A1A),
                                    size: 18,
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      'Q${index + 1}: ${item.questionText}',
                                      style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: const Color(0xFF0D1C2E)),
                                    ),
                                  ),
                                  Text(
                                    '${item.marksAwarded}/${item.maxMarks} pts',
                                    style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF545F72)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              if (item.yourAnswer != null)
                                Text(
                                  'Your Answer: ${item.yourAnswer}',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: item.isCorrect ? const Color(0xFF137333) : const Color(0xFFBA1A1A),
                                  ),
                                ),
                              if (item.correctAnswer != null && !item.isCorrect)
                                Text(
                                  'Correct Answer: ${item.correctAnswer}',
                                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF137333)),
                                ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
            const SizedBox(height: 12),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF002045),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: Text('Close Result', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
