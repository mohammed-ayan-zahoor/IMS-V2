import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/instructor/exams/data/models/instructor_exam_model.dart';
import 'package:student_app/features/instructor/exams/presentation/providers/instructor_exams_provider.dart';
import 'package:student_app/features/instructor/exams/presentation/screens/exam_grading_screen.dart';

class OnlineExamResultsScreen extends StatefulWidget {
  final InstructorExamItem exam;

  const OnlineExamResultsScreen({super.key, required this.exam});

  @override
  State<OnlineExamResultsScreen> createState() => _OnlineExamResultsScreenState();
}

class _OnlineExamResultsScreenState extends State<OnlineExamResultsScreen> {
  bool _isLoading = true;
  List<OnlineExamSubmissionItem> _submissions = [];
  String _searchQuery = '';
  String _filterStatus = 'all'; // 'all', 'passed', 'failed', 'grading'

  @override
  void initState() {
    super.initState();
    _loadSubmissions();
  }

  Future<void> _loadSubmissions() async {
    setState(() => _isLoading = true);
    final provider = context.read<InstructorExamsProvider>();
    final data = await provider.fetchOnlineSubmissions(widget.exam.id);

    if (mounted) {
      setState(() {
        _submissions = data;
        _isLoading = false;
      });
    }
  }

  bool _isPassed(OnlineExamSubmissionItem sub) {
    if (widget.exam.passingMarks > 0) {
      return sub.score >= widget.exam.passingMarks;
    }
    return sub.percentage >= 35.0;
  }

  List<OnlineExamSubmissionItem> get _filteredList {
    return _submissions.where((s) {
      // Search filter
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final nameMatch = s.studentName.toLowerCase().contains(q);
        final rollMatch = (s.rollNumber ?? '').toLowerCase().contains(q);
        final enrollMatch = (s.enrollmentNumber ?? '').toLowerCase().contains(q);
        if (!nameMatch && !rollMatch && !enrollMatch) return false;
      }

      // Status filter
      if (_filterStatus == 'passed') {
        return _isPassed(s);
      } else if (_filterStatus == 'failed') {
        return !_isPassed(s);
      } else if (_filterStatus == 'grading') {
        return s.gradingStatus == 'pending' || s.gradingStatus == 'in_progress';
      }

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final totalSubmissions = _submissions.length;
    final avgScore = totalSubmissions > 0
        ? (_submissions.fold<double>(0.0, (acc, s) => acc + s.score) / totalSubmissions).toStringAsFixed(1)
        : '0.0';
    final highestScore = totalSubmissions > 0
        ? _submissions.map((s) => s.score).reduce((a, b) => a > b ? a : b).toStringAsFixed(1)
        : '0.0';
    final passedCount = _submissions.where((s) => _isPassed(s)).length;
    final passRate = totalSubmissions > 0
        ? ((passedCount / totalSubmissions) * 100).toStringAsFixed(0)
        : '0';

    final filtered = _filteredList;

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
              'Results: ${widget.exam.title}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 16),
            ),
            Text(
              '${widget.exam.courseName ?? 'General'} • Total: ${widget.exam.totalMarks} Marks',
              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF002045)),
            onPressed: _loadSubmissions,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF002045)))
          : RefreshIndicator(
              onRefresh: _loadSubmissions,
              color: const Color(0xFF002045),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                children: [
                  // Stats Bento Box - Student UI Style: Radius 4, Border C4C6CF, Flat
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: const Color(0xFFC4C6CF)),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildStatCol('Submissions', '$totalSubmissions', const Color(0xFF0F172A)),
                        Container(width: 1, height: 32, color: const Color(0xFFE2E8F0)),
                        _buildStatCol('Average', avgScore, const Color(0xFF2563EB)),
                        Container(width: 1, height: 32, color: const Color(0xFFE2E8F0)),
                        _buildStatCol('Highest', highestScore, const Color(0xFF10B981)),
                        Container(width: 1, height: 32, color: const Color(0xFFE2E8F0)),
                        _buildStatCol('Pass Rate', '$passRate%', const Color(0xFF002045)),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Search input
                  TextField(
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A)),
                    decoration: InputDecoration(
                      hintText: 'Search by student name or roll no...',
                      hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                      prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF64748B)),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      fillColor: Colors.white,
                      filled: true,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(4),
                        borderSide: const BorderSide(color: Color(0xFFC4C6CF)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(4),
                        borderSide: const BorderSide(color: Color(0xFFC4C6CF)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(4),
                        borderSide: const BorderSide(color: Color(0xFF002045), width: 1.5),
                      ),
                    ),
                  ),

                  const SizedBox(height: 10),

                  // Filter Pills Row
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildFilterPill('All (${_submissions.length})', 'all'),
                        const SizedBox(width: 8),
                        _buildFilterPill('Passed ($passedCount)', 'passed'),
                        const SizedBox(width: 8),
                        _buildFilterPill('Failed (${totalSubmissions - passedCount})', 'failed'),
                        if (widget.exam.requiresManualGrading) ...[
                          const SizedBox(width: 8),
                          _buildFilterPill(
                            'Needs Grading (${_submissions.where((s) => s.gradingStatus == 'pending' || s.gradingStatus == 'in_progress').length})',
                            'grading',
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  if (filtered.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      alignment: Alignment.center,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.assignment_outlined, size: 40, color: Color(0xFF94A3B8)),
                          const SizedBox(height: 10),
                          Text(
                            totalSubmissions == 0
                                ? 'No student submissions found for this exam yet.'
                                : 'No submissions match your filter.',
                            style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600, fontSize: 13),
                          ),
                        ],
                      ),
                    )
                  else
                    ...filtered.asMap().entries.map((entry) {
                      final rank = entry.key + 1;
                      final sub = entry.value;
                      final passed = _isPassed(sub);
                      final isPendingGrading = sub.gradingStatus == 'pending' || sub.gradingStatus == 'in_progress';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
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
                                // Rank indicator
                                Text(
                                  '#$rank',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        sub.studentName,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFF0F172A),
                                        ),
                                      ),
                                      if (sub.rollNumber != null || sub.enrollmentNumber != null)
                                        Text(
                                          [
                                            if (sub.rollNumber != null) 'Roll: ${sub.rollNumber}',
                                            if (sub.enrollmentNumber != null) 'Enroll: ${sub.enrollmentNumber}',
                                          ].join(' • '),
                                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                        ),
                                    ],
                                  ),
                                ),
                                // Score badge
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      '${sub.score.toStringAsFixed(1)} / ${widget.exam.totalMarks}',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                    Text(
                                      '${sub.percentage.toStringAsFixed(0)}%',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: passed ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            const Divider(height: 1, color: Color(0xFFF1F5F9)),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    // Pass/Fail Pill
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: passed ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
                                        borderRadius: BorderRadius.circular(4),
                                        border: Border.all(
                                          color: passed ? const Color(0xFFA7F3D0) : const Color(0xFFFECACA),
                                        ),
                                      ),
                                      child: Text(
                                        passed ? 'PASSED' : 'FAILED',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w800,
                                          color: passed ? const Color(0xFF047857) : const Color(0xFFB91C1C),
                                        ),
                                      ),
                                    ),
                                    if (isPendingGrading) ...[
                                      const SizedBox(width: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFFFFBEB),
                                          borderRadius: BorderRadius.circular(4),
                                          border: Border.all(color: const Color(0xFFFDE68A)),
                                        ),
                                        child: const Text(
                                          'NEEDS GRADING',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFFB45309),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                if (isPendingGrading)
                                  InkWell(
                                    onTap: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => ExamGradingScreen(
                                            examId: widget.exam.id,
                                            examTitle: widget.exam.title,
                                          ),
                                        ),
                                      ).then((_) => _loadSubmissions());
                                    },
                                    child: const Padding(
                                      padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                      child: Text(
                                        'Grade Answer →',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFF002045),
                                        ),
                                      ),
                                    ),
                                  )
                                else if (sub.submittedAt != null)
                                  Text(
                                    'Submitted ${_formatDate(sub.submittedAt!)}',
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }

  Widget _buildStatCol(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  Widget _buildFilterPill(String label, String key) {
    final isSelected = _filterStatus == key;
    return GestureDetector(
      onTap: () => setState(() => _filterStatus = key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF002045) : Colors.white,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(
            color: isSelected ? const Color(0xFF002045) : const Color(0xFFC4C6CF),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  String _formatDate(String isoString) {
    try {
      final dt = DateTime.parse(isoString).toLocal();
      final date = '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}';
      final hour = dt.hour.toString().padLeft(2, '0');
      final min = dt.minute.toString().padLeft(2, '0');
      return '$date $hour:$min';
    } catch (_) {
      return '';
    }
  }
}
