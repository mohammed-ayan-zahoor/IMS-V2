import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:student_app/features/assignments/data/models/assignment_model.dart';
import 'package:student_app/features/assignments/presentation/providers/assignments_provider.dart';

class AssignmentsScreen extends StatefulWidget {
  const AssignmentsScreen({super.key});

  @override
  State<AssignmentsScreen> createState() => _AssignmentsScreenState();
}

class _AssignmentsScreenState extends State<AssignmentsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<AssignmentsProvider>(context, listen: false).loadAssignments(refresh: true);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _handleOpenUrl(BuildContext context, String url, String title) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open file: $title')),
        );
      }
    }
  }

  void _showAssignmentDetailsSheet(BuildContext context, AssignmentModel assignment, AssignmentSubmissionModel? submission) {
    final provider = Provider.of<AssignmentsProvider>(context, listen: false);
    final TextEditingController fileController = TextEditingController(
      text: submission?.fileUrl.isNotEmpty == true ? submission!.fileUrl : '',
    );
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (modalContext) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
                top: 20,
                left: 20,
                right: 20,
              ),
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 36,
                        height: 4,
                        decoration: BoxDecoration(
                          color: const Color(0xFFC4C6CF),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF4FF),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            assignment.courseName.toUpperCase(),
                            style: GoogleFonts.inter(color: const Color(0xFF2563EB), fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
                        const Spacer(),
                        if (assignment.totalMarks != null)
                          Text(
                            'Max: ${assignment.totalMarks} pts',
                            style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      assignment.title,
                      style: GoogleFonts.hankenGrotesk(
                        color: const Color(0xFF0D1C2E),
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      assignment.description,
                      style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 13, height: 1.4),
                    ),
                    const SizedBox(height: 16),

                    // Problem Set File Attachment if available
                    if (assignment.fileUrl != null && assignment.fileUrl!.isNotEmpty) ...[
                      InkWell(
                        onTap: () => _handleOpenUrl(context, assignment.fileUrl!, assignment.title),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8F9FF),
                            border: Border.all(color: const Color(0xFFC4C6CF)),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.picture_as_pdf, color: Color(0xFFDC2626), size: 28),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      assignment.fileName ?? 'Assignment Instructions.pdf',
                                      style: GoogleFonts.inter(color: const Color(0xFF0D1C2E), fontSize: 13, fontWeight: FontWeight.bold),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Text(
                                      'Tap to download/view problem set',
                                      style: GoogleFonts.inter(color: const Color(0xFF2563EB), fontSize: 11),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(Icons.download_outlined, color: Color(0xFF002045), size: 20),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Submission & Grading Details Box
                    const Divider(color: Color(0xFFE2E8F0)),
                    const SizedBox(height: 8),

                    if (submission != null && submission.status == 'graded') ...[
                      // GRADED RESULTS BOX
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDF4),
                          border: Border.all(color: const Color(0xFF86EFAC)),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.check_circle, color: Color(0xFF16A34A), size: 22),
                                const SizedBox(width: 8),
                                Text(
                                  'EVALUATED & GRADED',
                                  style: GoogleFonts.hankenGrotesk(
                                    color: const Color(0xFF16A34A),
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const Spacer(),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF16A34A),
                                    borderRadius: BorderRadius.circular(100),
                                  ),
                                  child: Text(
                                    'Score: ${submission.score} / ${assignment.totalMarks ?? 100}',
                                    style: GoogleFonts.inter(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                            if (submission.feedback != null && submission.feedback!.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              Text(
                                'Teacher Feedback:',
                                style: GoogleFonts.inter(color: const Color(0xFF15803D), fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '"${submission.feedback}"',
                                style: GoogleFonts.inter(color: const Color(0xFF166534), fontSize: 13, fontStyle: FontStyle.italic),
                              ),
                            ],
                            const SizedBox(height: 8),
                            Text(
                              'Evaluated by: ${submission.gradedByName}',
                              style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ] else if (submission != null && submission.status == 'pending') ...[
                      // PENDING SUBMISSION IN REVIEW
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF4FF),
                          border: Border.all(color: const Color(0xFF93C5FD)),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.schedule, color: Color(0xFF2563EB), size: 22),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Submission Received',
                                    style: GoogleFonts.inter(color: const Color(0xFF1E40AF), fontSize: 13, fontWeight: FontWeight.bold),
                                  ),
                                  Text(
                                    'Submitted on ${DateFormat('MMM d, h:mm a').format(submission.submittedAt)}. Awaiting evaluation.',
                                    style: GoogleFonts.inter(color: const Color(0xFF1E3A8A), fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ] else ...[
                      // NEW SUBMISSION INPUT PORTAL
                      Text(
                        'Submit Assignment Solutions',
                        style: GoogleFonts.hankenGrotesk(color: const Color(0xFF0D1C2E), fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: fileController,
                        style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF0D1C2E)),
                        decoration: InputDecoration(
                          hintText: 'Enter Document URL or Cloudinary file link',
                          hintStyle: GoogleFonts.inter(color: const Color(0xFF94A3B8), fontSize: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        ),
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          onPressed: isSubmitting
                              ? null
                              : () async {
                                  final link = fileController.text.trim();
                                  if (link.isEmpty) return;

                                  setModalState(() => isSubmitting = true);
                                  final success = await provider.submitAssignment(
                                    assignmentId: assignment.id,
                                    fileUrl: link,
                                    fileName: 'Assignment_${assignment.title.replaceAll(' ', '_')}.pdf',
                                  );
                                  setModalState(() => isSubmitting = false);

                                  if (context.mounted) {
                                    Navigator.pop(context);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          success ? 'Assignment submitted successfully!' : 'Failed to submit assignment',
                                        ),
                                        backgroundColor: success ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                                      ),
                                    );
                                  }
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF002045),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: isSubmitting
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : const Icon(Icons.cloud_upload_outlined, color: Colors.white, size: 20),
                          label: Text(
                            isSubmitting ? 'Uploading...' : 'Submit Homework',
                            style: GoogleFonts.inter(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AssignmentsProvider>(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FF),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0D1C2E)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Assignments & Homework',
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
          labelStyle: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13),
          tabs: const [
            Tab(text: 'All'),
            Tab(text: 'Pending'),
            Tab(text: 'Submitted'),
            Tab(text: 'Graded'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF0D1C2E)),
            onPressed: () => provider.loadAssignments(refresh: true),
          ),
        ],
      ),
      body: provider.isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF002045)))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildAssignmentsList(provider.assignments, provider),
                _buildAssignmentsList(
                  provider.assignments.where((a) => provider.submissions[a.id] == null).toList(),
                  provider,
                ),
                _buildAssignmentsList(
                  provider.assignments.where((a) => provider.submissions[a.id]?.status == 'pending').toList(),
                  provider,
                ),
                _buildAssignmentsList(
                  provider.assignments.where((a) => provider.submissions[a.id]?.status == 'graded').toList(),
                  provider,
                ),
              ],
            ),
    );
  }

  Widget _buildAssignmentsList(List<AssignmentModel> list, AssignmentsProvider provider) {
    if (list.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.assignment_turned_in_outlined, size: 54, color: Color(0xFFC4C6CF)),
              const SizedBox(height: 12),
              Text(
                'No assignments found',
                style: GoogleFonts.hankenGrotesk(color: const Color(0xFF0D1C2E), fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                'You have no assigned tasks in this section.',
                style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: const Color(0xFF002045),
      onRefresh: () => provider.loadAssignments(refresh: true),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        itemCount: list.length,
        itemBuilder: (context, index) {
          final assignment = list[index];
          final submission = provider.submissions[assignment.id];

          return _buildAssignmentCard(context, assignment, submission);
        },
      ),
    );
  }

  Widget _buildAssignmentCard(BuildContext context, AssignmentModel assignment, AssignmentSubmissionModel? submission) {
    final now = DateTime.now();
    final bool isOverdue = assignment.dueDate != null && now.isAfter(assignment.dueDate!) && submission == null;

    String statusLabel = 'Action Required';
    Color statusBg = const Color(0xFFFEF3C7);
    Color statusText = const Color(0xFFD97706);

    if (submission != null) {
      if (submission.status == 'graded') {
        statusLabel = 'Graded: ${submission.score}/${assignment.totalMarks ?? 100}';
        statusBg = const Color(0xFFDCFCE7);
        statusText = const Color(0xFF16A34A);
      } else {
        statusLabel = 'Submitted';
        statusBg = const Color(0xFFDBEAFE);
        statusText = const Color(0xFF2563EB);
      }
    } else if (isOverdue) {
      statusLabel = 'OVERDUE';
      statusBg = const Color(0xFFFEE2E2);
      statusText = const Color(0xFFDC2626);
    }

    final dueDateStr = assignment.dueDate != null ? DateFormat('MMM d, yyyy').format(assignment.dueDate!) : 'No Due Date';

    return Padding(
      padding: const EdgeInsets.only(bottom: 14.0),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: const Color(0xFFC4C6CF)),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF4FF),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    assignment.courseName.toUpperCase(),
                    style: GoogleFonts.inter(color: const Color(0xFF2563EB), fontSize: 9, fontWeight: FontWeight.bold),
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: Text(
                    statusLabel.toUpperCase(),
                    style: GoogleFonts.inter(color: statusText, fontSize: 9, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              assignment.title,
              style: GoogleFonts.hankenGrotesk(
                color: const Color(0xFF0D1C2E),
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              assignment.description,
              style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 12),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                const Icon(Icons.event, color: Color(0xFF545F72), size: 16),
                const SizedBox(width: 4),
                Text(
                  'Due: $dueDateStr',
                  style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 11),
                ),
                const Spacer(),
                TextButton(
                  onPressed: () => _showAssignmentDetailsSheet(context, assignment, submission),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    backgroundColor: const Color(0xFF002045),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: Text(
                    submission != null ? 'View Submission' : 'Submit Work',
                    style: GoogleFonts.inter(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
