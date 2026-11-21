import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';

class StudentSyllabusScreen extends StatefulWidget {
  final String? initialSubjectId;

  const StudentSyllabusScreen({super.key, this.initialSubjectId});

  @override
  State<StudentSyllabusScreen> createState() => _StudentSyllabusScreenState();
}

class _StudentSyllabusScreenState extends State<StudentSyllabusScreen> {
  final ApiClient _apiClient = ApiClient();
  bool _isLoading = true;
  String? _errorMessage;
  List<StudentSubjectProgress> _progressList = [];
  int _selectedSubjectIndex = 0;

  @override
  void initState() {
    super.initState();
    _fetchSyllabus();
  }

  Future<void> _fetchSyllabus() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await _apiClient.get(ApiEndpoints.syllabus);
      if (response.statusCode == 200 && response.data != null) {
        final rawList = response.data['progress'] as List<dynamic>? ?? [];
        final parsed = rawList.map((item) => StudentSubjectProgress.fromJson(item)).toList();

        int defaultIndex = 0;
        if (widget.initialSubjectId != null) {
          final found = parsed.indexWhere((p) => p.subjectId == widget.initialSubjectId);
          if (found != -1) defaultIndex = found;
        }

        setState(() {
          _progressList = parsed;
          _selectedSubjectIndex = parsed.isNotEmpty ? defaultIndex.clamp(0, parsed.length - 1) : 0;
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage = response.data?['message']?.toString() ?? 'Unable to load syllabus progress';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to connect. Please check your network connection.';
        _isLoading = false;
      });
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '';
    try {
      final dt = DateTime.parse(dateStr);
      return DateFormat('MMM d, yyyy').format(dt);
    } catch (_) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context, listen: false);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF002045)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          auth.isDegreeCollege
              ? 'Course Syllabus & Modules'
              : (auth.isPuCollege ? 'Syllabus & Chapters' : 'Curriculum & Syllabus'),
          style: GoogleFonts.hankenGrotesk(
            fontWeight: FontWeight.bold,
            color: const Color(0xFF002045),
            fontSize: 18,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF002045)),
        ),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Color(0xFFDC2626)),
              const SizedBox(height: 12),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 14),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _fetchSyllabus,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Try Again'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF002045),
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (_progressList.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.menu_book_outlined, size: 64, color: Color(0xFF94A3B8)),
              const SizedBox(height: 16),
              Text(
                'No Syllabus Available',
                style: GoogleFonts.hankenGrotesk(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF0D1C2E),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Your teachers have not uploaded the curriculum topics for your enrolled subjects yet.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 13, height: 1.4),
              ),
            ],
          ),
        ),
      );
    }

    final currentSubject = _progressList[_selectedSubjectIndex];
    final chapters = currentSubject.chapters;
    final progressPct = currentSubject.overallProgress.clamp(0, 100);

    return RefreshIndicator(
      onRefresh: _fetchSyllabus,
      color: const Color(0xFF002045),
      child: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // 1. Horizontal Subject Selector (Pills)
          if (_progressList.length > 1) ...[
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: List.generate(_progressList.length, (idx) {
                  final item = _progressList[idx];
                  final isSelected = idx == _selectedSubjectIndex;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          _selectedSubjectIndex = idx;
                        });
                      },
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFF002045) : Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isSelected ? const Color(0xFF002045) : const Color(0xFFE2E8F0),
                          ),
                          boxShadow: isSelected
                              ? [
                                  BoxShadow(
                                    color: const Color(0xFF002045).withValues(alpha: 0.15),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  )
                                ]
                              : null,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              item.subjectName,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: isSelected ? Colors.white : const Color(0xFF334155),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? Colors.white.withValues(alpha: 0.2)
                                    : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '${item.overallProgress}%',
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: isSelected ? Colors.white : const Color(0xFF002045),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // 2. Hero Subject Overview Banner
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF002045), Color(0xFF0E386E)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF002045).withValues(alpha: 0.2),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            currentSubject.subjectName,
                            style: GoogleFonts.hankenGrotesk(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (currentSubject.subjectCode.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              'Code: ${currentSubject.subjectCode} • ${currentSubject.batchName}',
                              style: GoogleFonts.inter(
                                color: Colors.white.withValues(alpha: 0.8),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${chapters.length} Chapters',
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Progress Bar & Percentage
                Row(
                  children: [
                    Text(
                      '$progressPct%',
                      style: GoogleFonts.hankenGrotesk(
                        fontSize: 34,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${currentSubject.completedTopics} of ${currentSubject.totalTopics} Topics Completed',
                            style: GoogleFonts.inter(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 6),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: LinearProgressIndicator(
                              value: currentSubject.totalTopics > 0
                                  ? (currentSubject.completedTopics / currentSubject.totalTopics).clamp(0.0, 1.0)
                                  : (progressPct / 100.0),
                              minHeight: 8,
                              backgroundColor: Colors.white.withValues(alpha: 0.2),
                              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF34D399)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 3. Chapters Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Chapter Breakdown',
                style: GoogleFonts.hankenGrotesk(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF0D1C2E),
                ),
              ),
              Text(
                '${currentSubject.completedChapters} Cleared',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF10B981),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // 4. Chapter Accordion List
          if (chapters.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Center(
                child: Text(
                  'No chapters added for this subject yet.',
                  style: GoogleFonts.inter(color: const Color(0xFF64748B), fontSize: 13),
                ),
              ),
            )
          else
            ...chapters.asMap().entries.map((entry) {
              final idx = entry.key;
              final chapter = entry.value;
              return _buildChapterAccordion(idx + 1, chapter);
            }),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildChapterAccordion(int chapterNum, StudentChapter chapter) {
    final completedCount = chapter.topics.where((t) => t.isCompleted).length;
    final totalCount = chapter.topics.length;
    final isFullyDone = chapter.isCompleted || (totalCount > 0 && completedCount == totalCount);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isFullyDone ? const Color(0xFFBBF7D0) : const Color(0xFFE2E8F0),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: !isFullyDone,
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          leading: CircleAvatar(
            radius: 14,
            backgroundColor: isFullyDone ? const Color(0xFFDCFCE7) : const Color(0xFFEFF4FF),
            child: isFullyDone
                ? const Icon(Icons.check, size: 16, color: Color(0xFF16A34A))
                : Text(
                    '$chapterNum',
                    style: const TextStyle(
                      color: Color(0xFF002045),
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
          ),
          title: Text(
            chapter.title,
            style: GoogleFonts.hankenGrotesk(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF0F172A),
            ),
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 4.0),
            child: Row(
              children: [
                if (isFullyDone) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDCFCE7),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      chapter.completedAt != null
                          ? 'Completed ${_formatDate(chapter.completedAt)}'
                          : 'Completed',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF15803D),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                Text(
                  '$completedCount of $totalCount topics covered',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          children: [
            const Divider(color: Color(0xFFF1F5F9), height: 16),
            if (chapter.topics.isEmpty)
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: Text(
                  'No topics defined for this chapter.',
                  style: GoogleFonts.inter(color: const Color(0xFF94A3B8), fontSize: 12, fontStyle: FontStyle.italic),
                ),
              )
            else
              ...chapter.topics.asMap().entries.map((tEntry) {
                final tIdx = tEntry.key;
                final topic = tEntry.value;
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: topic.isCompleted ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: topic.isCompleted ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(top: 2.0),
                        child: Icon(
                          topic.isCompleted ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                          size: 16,
                          color: topic.isCompleted ? const Color(0xFF16A34A) : const Color(0xFF94A3B8),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              topic.title,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: topic.isCompleted ? FontWeight.w600 : FontWeight.w500,
                                color: topic.isCompleted ? const Color(0xFF14532D) : const Color(0xFF1E293B),
                              ),
                            ),
                            if (topic.subTopics.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              ...topic.subTopics.map((st) => Padding(
                                    padding: const EdgeInsets.only(left: 4.0, bottom: 2.0),
                                    child: Row(
                                      children: [
                                        const Text('• ', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                                        Expanded(
                                          child: Text(
                                            st.title,
                                            style: GoogleFonts.inter(
                                              fontSize: 11,
                                              color: const Color(0xFF64748B),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  )),
                            ],
                          ],
                        ),
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
}

// ---------------------------------------------------------------------------
// Clean Data Models for Student Syllabus
// ---------------------------------------------------------------------------

class StudentSubjectProgress {
  final String batchId;
  final String batchName;
  final String subjectId;
  final String subjectName;
  final String subjectCode;
  final int overallProgress;
  final int completedChapters;
  final int totalChapters;
  final int completedTopics;
  final int totalTopics;
  final List<StudentChapter> chapters;

  StudentSubjectProgress({
    required this.batchId,
    required this.batchName,
    required this.subjectId,
    required this.subjectName,
    required this.subjectCode,
    required this.overallProgress,
    required this.completedChapters,
    required this.totalChapters,
    required this.completedTopics,
    required this.totalTopics,
    required this.chapters,
  });

  factory StudentSubjectProgress.fromJson(Map<String, dynamic> json) {
    return StudentSubjectProgress(
      batchId: json['batchId']?.toString() ?? '',
      batchName: json['batchName']?.toString() ?? '',
      subjectId: json['subjectId']?.toString() ?? '',
      subjectName: json['subjectName']?.toString() ?? 'Subject',
      subjectCode: json['subjectCode']?.toString() ?? '',
      overallProgress: json['overallProgress'] is num ? (json['overallProgress'] as num).round() : 0,
      completedChapters: json['completedChapters'] is num ? (json['completedChapters'] as num).toInt() : 0,
      totalChapters: json['totalChapters'] is num ? (json['totalChapters'] as num).toInt() : 0,
      completedTopics: json['completedTopics'] is num ? (json['completedTopics'] as num).toInt() : 0,
      totalTopics: json['totalTopics'] is num ? (json['totalTopics'] as num).toInt() : 0,
      chapters: (json['chapters'] as List<dynamic>?)
              ?.map((c) => StudentChapter.fromJson(c))
              .toList() ??
          [],
    );
  }
}

class StudentChapter {
  final String id;
  final String title;
  final bool isCompleted;
  final String? completedAt;
  final List<StudentTopic> topics;

  StudentChapter({
    required this.id,
    required this.title,
    required this.isCompleted,
    this.completedAt,
    required this.topics,
  });

  factory StudentChapter.fromJson(Map<String, dynamic> json) {
    return StudentChapter(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Chapter',
      isCompleted: json['isCompleted'] == true,
      completedAt: json['completedAt']?.toString(),
      topics: (json['topics'] as List<dynamic>?)
              ?.map((t) => StudentTopic.fromJson(t))
              .toList() ??
          [],
    );
  }
}

class StudentTopic {
  final String id;
  final String title;
  final bool isCompleted;
  final List<StudentSubTopic> subTopics;

  StudentTopic({
    required this.id,
    required this.title,
    required this.isCompleted,
    required this.subTopics,
  });

  factory StudentTopic.fromJson(Map<String, dynamic> json) {
    return StudentTopic(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Topic',
      isCompleted: json['isCompleted'] == true,
      subTopics: (json['subTopics'] as List<dynamic>?)
              ?.map((st) => StudentSubTopic.fromJson(st))
              .toList() ??
          [],
    );
  }
}

class StudentSubTopic {
  final String id;
  final String title;

  StudentSubTopic({
    required this.id,
    required this.title,
  });

  factory StudentSubTopic.fromJson(Map<String, dynamic> json) {
    return StudentSubTopic(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
    );
  }
}
