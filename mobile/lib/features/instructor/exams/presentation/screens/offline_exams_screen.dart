import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/providers/academic_session_provider.dart';
import 'package:student_app/features/instructor/exams/data/models/offline_exam_model.dart';
import 'package:student_app/features/instructor/exams/presentation/providers/instructor_exams_provider.dart';
import 'package:student_app/features/instructor/exams/presentation/screens/offline_marks_entry_screen.dart';

class OfflineExamsScreen extends StatefulWidget {
  const OfflineExamsScreen({super.key});

  @override
  State<OfflineExamsScreen> createState() => _OfflineExamsScreenState();
}

class _OfflineExamsScreenState extends State<OfflineExamsScreen> {
  int _selectedTab = 0; // 0: Active / Upcoming, 1: Results Published
  String _searchQuery = '';
  String? _lastSessionId;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final sessionProv = Provider.of<AcademicSessionProvider>(context, listen: false);
      final examsProv = Provider.of<InstructorExamsProvider>(context, listen: false);
      _lastSessionId = sessionProv.selectedSessionId;
      examsProv.loadOfflineExams(sessionId: _lastSessionId);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'published':
      case 'completed':
        return const Color(0xFF10B981);
      case 'marks_entry_open':
        return const Color(0xFF2563EB);
      case 'draft':
      default:
        return const Color(0xFFF59E0B);
    }
  }

  Color _getStatusBg(String status) {
    switch (status.toLowerCase()) {
      case 'published':
      case 'completed':
        return const Color(0xFFECFDF5);
      case 'marks_entry_open':
        return const Color(0xFFEFF6FF);
      case 'draft':
      default:
        return const Color(0xFFFFFBEB);
    }
  }

  String _formatStatus(String status) {
    switch (status.toLowerCase()) {
      case 'marks_entry_open':
        return 'MARKS ENTRY OPEN';
      case 'published':
        return 'RESULTS PUBLISHED';
      case 'draft':
        return 'DRAFT';
      default:
        return status.toUpperCase();
    }
  }

  void _showSessionPicker(BuildContext context, AcademicSessionProvider sessionProv) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: Text(
                    'Select Academic Session',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                ),
                const Divider(),
                ListTile(
                  title: const Text('All Sessions', style: TextStyle(fontWeight: FontWeight.w600)),
                  trailing: sessionProv.selectedSessionId == null ? const Icon(Icons.check, color: Color(0xFF002045)) : null,
                  onTap: () {
                    Navigator.pop(context);
                    sessionProv.selectSession('');
                    final examsProv = Provider.of<InstructorExamsProvider>(context, listen: false);
                    examsProv.loadOfflineExams(refresh: true, sessionId: '');
                  },
                ),
                ...sessionProv.sessions.map((s) {
                  final isSelected = s.id == sessionProv.selectedSessionId;
                  return ListTile(
                    title: Text(s.sessionName, style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.w500)),
                    subtitle: s.isActive ? const Text('Active Session', style: TextStyle(fontSize: 11, color: Color(0xFF10B981))) : null,
                    trailing: isSelected ? const Icon(Icons.check, color: Color(0xFF002045)) : null,
                    onTap: () {
                      Navigator.pop(context);
                      sessionProv.selectSession(s.id);
                      final examsProv = Provider.of<InstructorExamsProvider>(context, listen: false);
                      examsProv.loadOfflineExams(refresh: true, sessionId: s.id);
                    },
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showExamDetails(BuildContext context, OfflineExamItem exam) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.7,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      exam.title,
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: _getStatusBg(exam.status),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      _formatStatus(exam.status),
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: _getStatusColor(exam.status)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                '${exam.courseName ?? "General Course"}${exam.sessionName != null ? " • ${exam.sessionName}" : ""}',
                style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 16),
              const Divider(height: 1, color: Color(0xFFC4C6CF)),
              const SizedBox(height: 14),
              const Text(
                'Subjects & Evaluation Criteria:',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 10),
              Expanded(
                child: exam.subjects.isEmpty
                    ? const Center(child: Text('No subjects defined for this exam', style: TextStyle(color: Color(0xFF64748B))))
                    : ListView.separated(
                        itemCount: exam.subjects.length,
                        separatorBuilder: (context, index) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final sub = exam.subjects[index];
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.book_outlined, size: 16, color: Color(0xFF002045)),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        sub.name,
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                      ),
                                      if (sub.code != null && sub.code!.isNotEmpty)
                                        Text(
                                          'Code: ${sub.code}',
                                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                        ),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      'Max: ${sub.maxMarks}',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                    ),
                                    Text(
                                      'Pass: ${sub.passMarks}',
                                      style: const TextStyle(fontSize: 11, color: Color(0xFF10B981), fontWeight: FontWeight.w600),
                                    ),
                                  ],
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
                  onPressed: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => OfflineMarksEntryScreen(exam: exam),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF002045),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                  ),
                  child: const Text('Enter Marks for this Exam', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final sessionProv = context.watch<AcademicSessionProvider>();
    final provider = context.watch<InstructorExamsProvider>();

    if (sessionProv.selectedSessionId != null && sessionProv.selectedSessionId != _lastSessionId) {
      _lastSessionId = sessionProv.selectedSessionId;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        provider.loadOfflineExams(refresh: true, sessionId: _lastSessionId);
      });
    }

    final allExams = provider.offlineExams;

    // Filter by Tab matching web app logic:
    // Tab 0 (Active / Upcoming): draft or marks_entry_open
    // Tab 1 (Results Published): published or completed
    final upcomingExams = allExams.where((e) {
      final s = e.status.toLowerCase();
      return s == 'draft' || s == 'marks_entry_open' || s == 'ongoing' || s == 'active';
    }).toList();

    final publishedExams = allExams.where((e) {
      final s = e.status.toLowerCase();
      return s == 'published' || s == 'completed' || s == 'closed';
    }).toList();

    final currentTabList = _selectedTab == 0 ? upcomingExams : publishedExams;

    // Secondary search filter
    final filteredExams = currentTabList.where((e) {
      if (_searchQuery.trim().isEmpty) return true;
      final q = _searchQuery.trim().toLowerCase();
      final titleMatch = e.title.toLowerCase().contains(q);
      final courseMatch = (e.courseName ?? '').toLowerCase().contains(q);
      final subjectsMatch = e.subjects.any((s) => s.name.toLowerCase().contains(q));
      return titleMatch || courseMatch || subjectsMatch;
    }).toList();

    final sessionDisplayName = sessionProv.selectedSession?.sessionName ?? 'All Sessions';

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Offline Exams',
          style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 17),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: InkWell(
              onTap: () => _showSessionPicker(context, sessionProv),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF4FF),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFC4C6CF), width: 0.8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.school_outlined, size: 14, color: Color(0xFF002045)),
                    const SizedBox(width: 4),
                    Text(
                      sessionDisplayName,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF002045)),
                    ),
                    const Icon(Icons.arrow_drop_down, size: 16, color: Color(0xFF002045)),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Segmented Tab Switcher (Exact Web Match: Active / Upcoming vs Results Published)
          Container(
            margin: const EdgeInsets.fromLTRB(16, 12, 16, 6),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedTab = 0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: _selectedTab == 0 ? Colors.white : Colors.transparent,
                        borderRadius: BorderRadius.circular(6),
                        boxShadow: _selectedTab == 0
                            ? [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 3, offset: const Offset(0, 1))]
                            : null,
                      ),
                      alignment: Alignment.center,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Active / Upcoming',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: _selectedTab == 0 ? FontWeight.bold : FontWeight.w600,
                              color: _selectedTab == 0 ? const Color(0xFF002045) : const Color(0xFF64748B),
                            ),
                          ),
                          if (upcomingExams.isNotEmpty) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                              decoration: BoxDecoration(
                                color: _selectedTab == 0 ? const Color(0xFF002045) : const Color(0xFF94A3B8),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '${upcomingExams.length}',
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedTab = 1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: _selectedTab == 1 ? Colors.white : Colors.transparent,
                        borderRadius: BorderRadius.circular(6),
                        boxShadow: _selectedTab == 1
                            ? [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 3, offset: const Offset(0, 1))]
                            : null,
                      ),
                      alignment: Alignment.center,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Results Published',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: _selectedTab == 1 ? FontWeight.bold : FontWeight.w600,
                              color: _selectedTab == 1 ? const Color(0xFF002045) : const Color(0xFF64748B),
                            ),
                          ),
                          if (publishedExams.isNotEmpty) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                              decoration: BoxDecoration(
                                color: _selectedTab == 1 ? const Color(0xFF002045) : const Color(0xFF94A3B8),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '${publishedExams.length}',
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Search Input Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 6, 16, 8),
            child: TextField(
              controller: _searchController,
              onChanged: (val) => setState(() => _searchQuery = val),
              decoration: InputDecoration(
                hintText: 'Search ${_selectedTab == 0 ? "active" : "published"} exams...',
                hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                prefixIcon: const Icon(Icons.search, size: 18, color: Color(0xFF64748B)),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 16, color: Color(0xFF64748B)),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(6),
                  borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(6),
                  borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(6),
                  borderSide: const BorderSide(color: Color(0xFF002045), width: 1.5),
                ),
              ),
            ),
          ),

          // List Content
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => provider.loadOfflineExams(refresh: true, sessionId: sessionProv.selectedSessionId),
              color: const Color(0xFF002045),
              child: provider.isLoading && allExams.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : filteredExams.isEmpty
                      ? Center(
                          child: SingleChildScrollView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.edit_calendar_outlined, size: 48, color: Color(0xFF94A3B8)),
                                const SizedBox(height: 10),
                                Text(
                                  _selectedTab == 0
                                      ? 'No active/upcoming offline exams found'
                                      : 'No published offline exams found',
                                  style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                                ),
                                if (sessionDisplayName != 'All Sessions') ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    'Filtered for Academic Session: $sessionDisplayName',
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredExams.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final exam = filteredExams[index];
                            final statusColor = _getStatusColor(exam.status);
                            final statusBg = _getStatusBg(exam.status);

                            final subjectsText = exam.subjects.map((s) => s.name).join(', ');
                            final batchesText = exam.batches.isNotEmpty
                                ? exam.batches.map((b) => b.name).join(', ')
                                : 'All Course Batches';

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
                                          _formatStatus(exam.status),
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
                                    '${exam.courseName ?? "General Course"}${exam.sessionName != null ? " • ${exam.sessionName}" : ""}',
                                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      const Icon(Icons.groups_outlined, size: 14, color: Color(0xFF64748B)),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          'Batches: $batchesText',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (subjectsText.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        const Icon(Icons.book_outlined, size: 14, color: Color(0xFF64748B)),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            'Subjects: $subjectsText',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                  const SizedBox(height: 12),
                                  const Divider(height: 1, color: Color(0xFFF1F5F9)),
                                  const SizedBox(height: 10),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.end,
                                    children: [
                                      OutlinedButton.icon(
                                        onPressed: () => _showExamDetails(context, exam),
                                        icon: const Icon(Icons.info_outline_rounded, size: 14, color: Color(0xFF002045)),
                                        label: const Text(
                                          'Details',
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
                                              builder: (_) => OfflineMarksEntryScreen(exam: exam),
                                            ),
                                          );
                                        },
                                        icon: const Icon(Icons.edit_note_rounded, size: 16, color: Colors.white),
                                        label: const Text(
                                          'Enter Marks',
                                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                                        ),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: const Color(0xFF002045),
                                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
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
          ),
        ],
      ),
    );
  }
}
