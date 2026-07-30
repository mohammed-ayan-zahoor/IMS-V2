import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ExamResultsScreen extends StatelessWidget {
  final String examTitle;
  const ExamResultsScreen({super.key, required this.examTitle});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF002045)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Results: CS301',
          style: GoogleFonts.hankenGrotesk(
            color: const Color(0xFF002045),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero Score Display Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF4FF), // surface-container-low
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  RichText(
                    text: TextSpan(
                      text: '84',
                      style: GoogleFonts.hankenGrotesk(
                        color: const Color(0xFF002045),
                        fontSize: 48,
                        fontWeight: FontWeight.bold,
                      ),
                      children: [
                        TextSpan(
                          text: '/100',
                          style: GoogleFonts.hankenGrotesk(
                            color: const Color(0xFF545F72),
                            fontSize: 22,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Column(
                        children: [
                          Text(
                            'GRADE',
                            style: GoogleFonts.inter(
                              color: const Color(0xFF545F72),
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'A-',
                            style: GoogleFonts.hankenGrotesk(
                              color: const Color(0xFF0D1C2E),
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 24),
                      Container(
                        width: 1,
                        height: 36,
                        color: const Color(0xFFC4C6CF),
                      ),
                      const SizedBox(width: 24),
                      Column(
                        children: [
                          Text(
                            'STATUS',
                            style: GoogleFonts.inter(
                              color: const Color(0xFF545F72),
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFBBF7D0), // success-container
                              borderRadius: BorderRadius.circular(100),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.check_circle,
                                  color: Color(0xFF14532D),
                                  size: 14,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'PASS',
                                  style: GoogleFonts.inter(
                                    color: const Color(0xFF14532D),
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Performance Summary (Accuracy, Time, Rank)
            Row(
              children: [
                Expanded(
                  child: _buildMetricItem(
                    Icons.my_location,
                    'ACCURACY',
                    '84%',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildMetricItem(
                    Icons.timer_outlined,
                    'TIME',
                    '105m',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildMetricItem(
                    Icons.leaderboard_outlined,
                    'RANK',
                    '12/150',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Review Section Header
            Text(
              'Question Review',
              style: GoogleFonts.hankenGrotesk(
                color: const Color(0xFF002045),
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            const Divider(color: Color(0xFFC4C6CF), height: 1),
            const SizedBox(height: 16),

            // Question 1: Correct
            _buildCorrectQuestionCard(
              'Q1',
              'What is the time complexity of building a heap from an unsorted array?',
              'O(n)',
            ),
            const SizedBox(height: 16),

            // Question 2: Incorrect
            _buildIncorrectQuestionCard(
              'Q2',
              'Which data structure provides the fastest average time complexity for both key-value lookups and insertions?',
              'Linked List',
              'Hash Table',
            ),
            const SizedBox(height: 16),

            // Question 3: Correct
            _buildCorrectQuestionCard(
              'Q3',
              'In a binary search tree, which traversal yields the elements in sorted order?',
              'In-order traversal',
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricItem(IconData icon, String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F9FF),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFC4C6CF)),
      ),
      child: Column(
        children: [
          Icon(icon, color: const Color(0xFF002045), size: 20),
          const SizedBox(height: 6),
          Text(
            label,
            style: GoogleFonts.inter(
              color: const Color(0xFF545F72),
              fontSize: 10,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: GoogleFonts.hankenGrotesk(
              color: const Color(0xFF0D1C2E),
              fontSize: 15,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCorrectQuestionCard(String qNumber, String questionText, String answerText) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F9FF),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFBBF7D0).withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      qNumber,
                      style: GoogleFonts.inter(
                        color: const Color(0xFF545F72),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      questionText,
                      style: GoogleFonts.inter(
                        color: const Color(0xFF0D1C2E),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(
                Icons.check_circle,
                color: Color(0xFF14532D),
                size: 20,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFBBF7D0).withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: const Color(0xFFBBF7D0).withValues(alpha: 0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'YOUR ANSWER',
                  style: GoogleFonts.inter(
                    color: const Color(0xFF545F72),
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  answerText,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF14532D),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIncorrectQuestionCard(
    String qNumber,
    String questionText,
    String yourAnswer,
    String correctAnswer,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F9FF),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFFFFAD6).withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      qNumber,
                      style: GoogleFonts.inter(
                        color: const Color(0xFF545F72),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      questionText,
                      style: GoogleFonts.inter(
                        color: const Color(0xFF0D1C2E),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(
                Icons.cancel,
                color: Color(0xFFBA1A1A),
                size: 20,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFFFDAD6).withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: const Color(0xFFFFDAD6).withValues(alpha: 0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'YOUR ANSWER',
                  style: GoogleFonts.inter(
                    color: const Color(0xFF545F72),
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  yourAnswer,
                  style: GoogleFonts.inter(
                    color: const Color(0xFFBA1A1A),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    decoration: TextDecoration.lineThrough,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF4FF),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: const Color(0xFFC4C6CF), style: BorderStyle.solid),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'CORRECT ANSWER',
                  style: GoogleFonts.inter(
                    color: const Color(0xFF545F72),
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  correctAnswer,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF0D1C2E),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
