import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_app/features/instructor/attendance/data/models/batch_attendance_model.dart';
import 'package:student_app/features/instructor/attendance/data/repositories/instructor_attendance_repository.dart';
import 'package:student_app/features/instructor/batches/data/models/instructor_batch_model.dart';
import 'package:student_app/features/timeline/presentation/screens/timeline_screen.dart';

class BatchRosterSheet extends StatefulWidget {
  final InstructorBatchDetail batch;

  const BatchRosterSheet({
    super.key,
    required this.batch,
  });

  static Future<void> show(BuildContext context, {required InstructorBatchDetail batch}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => BatchRosterSheet(batch: batch),
    );
  }

  @override
  State<BatchRosterSheet> createState() => _BatchRosterSheetState();
}

class _BatchRosterSheetState extends State<BatchRosterSheet> {
  final InstructorAttendanceRepository _repo = InstructorAttendanceRepository();
  bool _isLoading = true;
  List<StudentRosterItem> _students = [];
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadStudents();
  }

  Future<void> _loadStudents() async {
    setState(() => _isLoading = true);
    final list = await _repo.fetchBatchStudents(widget.batch.id);
    if (mounted) {
      setState(() {
        _students = list;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _students.where((s) {
      final q = _searchQuery.toLowerCase();
      return s.name.toLowerCase().contains(q) || s.enrollmentNumber.toLowerCase().contains(q);
    }).toList();

    return DraggableScrollableSheet(
      initialChildSize: 0.78,
      minChildSize: 0.45,
      maxChildSize: 0.94,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              // Drag handle
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 12, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${widget.batch.courseName} · Section ${widget.batch.name}',
                            style: GoogleFonts.hankenGrotesk(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF002045),
                            ),
                          ),
                          Text(
                            'Tap a student to view or log their timeline',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: const Color(0xFF545F72),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Color(0xFF545F72)),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              // Search field
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                child: TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: 'Search student by name or roll no...',
                    hintStyle: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF545F72)),
                    prefixIcon: const Icon(Icons.search, size: 18, color: Color(0xFF545F72)),
                    filled: true,
                    fillColor: const Color(0xFFEFF4FF),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFFC4C6CF)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFFC4C6CF)),
                    ),
                  ),
                ),
              ),

              const Divider(height: 1, color: Color(0xFFE2E8F0)),

              // List
              Expanded(
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF002045)),
                        ),
                      )
                    : filtered.isEmpty
                        ? Center(
                            child: Text(
                              'No students found in this section',
                              style: GoogleFonts.inter(color: const Color(0xFF545F72)),
                            ),
                          )
                        : ListView.separated(
                            controller: scrollController,
                            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                            itemCount: filtered.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final student = filtered[index];
                              return InkWell(
                                borderRadius: BorderRadius.circular(10),
                                onTap: () {
                                  Navigator.pop(context);
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => TimelineScreen(
                                        studentId: student.id,
                                        studentName: student.name,
                                        enrollmentNumber: student.enrollmentNumber,
                                      ),
                                    ),
                                  );
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: Row(
                                    children: [
                                      CircleAvatar(
                                        radius: 18,
                                        backgroundColor: const Color(0xFF002045),
                                        child: Text(
                                          student.name.isNotEmpty ? student.name[0].toUpperCase() : 'S',
                                          style: GoogleFonts.hankenGrotesk(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              student.name,
                                              style: GoogleFonts.hankenGrotesk(
                                                fontSize: 14.5,
                                                fontWeight: FontWeight.bold,
                                                color: const Color(0xFF0D1C2E),
                                              ),
                                            ),
                                            if (student.enrollmentNumber.isNotEmpty)
                                              Text(
                                                'Roll: ${student.enrollmentNumber}',
                                                style: GoogleFonts.inter(
                                                  fontSize: 11.5,
                                                  color: const Color(0xFF545F72),
                                                ),
                                              ),
                                          ],
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFEFF4FF),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Icon(Icons.timeline, size: 14, color: Color(0xFF002045)),
                                            const SizedBox(width: 4),
                                            Text(
                                              'Timeline',
                                              style: GoogleFonts.inter(
                                                fontSize: 11.5,
                                                fontWeight: FontWeight.bold,
                                                color: const Color(0xFF002045),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
              ),
            ],
          ),
        );
      },
    );
  }
}
