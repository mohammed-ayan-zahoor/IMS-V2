import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:student_app/features/instructor/materials/data/models/instructor_material_model.dart';
import 'package:student_app/features/instructor/materials/data/repositories/instructor_materials_repository.dart';

class MaterialSubmissionsScreen extends StatefulWidget {
  final String materialId;
  final String materialTitle;

  const MaterialSubmissionsScreen({
    super.key,
    required this.materialId,
    required this.materialTitle,
  });

  @override
  State<MaterialSubmissionsScreen> createState() => _MaterialSubmissionsScreenState();
}

class _MaterialSubmissionsScreenState extends State<MaterialSubmissionsScreen> {
  final InstructorMaterialsRepository _repo = InstructorMaterialsRepository();
  bool _isLoading = true;
  List<StudentSubmissionItem> _submissions = [];

  @override
  void initState() {
    super.initState();
    _loadSubmissions();
  }

  Future<void> _loadSubmissions() async {
    setState(() => _isLoading = true);
    final list = await _repo.fetchSubmissions(widget.materialId);
    if (mounted) {
      setState(() {
        _submissions = list;
        _isLoading = false;
      });
    }
  }

  void _openUrl(String? url) async {
    if (url == null || url.isEmpty) return;
    final uri = Uri.tryParse(url);
    if (uri != null) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _showGradeDialog(StudentSubmissionItem sub) {
    final marksController = TextEditingController(text: sub.marksAwarded?.toString() ?? '');
    final feedbackController = TextEditingController(text: sub.feedback ?? '');
    bool isSaving = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
            title: Text(
              'Grade: ${sub.studentName}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: marksController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: 'Marks Awarded',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: feedbackController,
                  decoration: InputDecoration(
                    labelText: 'Feedback (Optional)',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: isSaving
                    ? null
                    : () async {
                        final marks = int.tryParse(marksController.text.trim());
                        if (marks == null) return;
                        final messenger = ScaffoldMessenger.of(context);
                        setDialogState(() => isSaving = true);
                        final success = await _repo.gradeSubmission(
                          materialId: widget.materialId,
                          submissionId: sub.id,
                          marksAwarded: marks,
                          feedback: feedbackController.text.trim(),
                        );
                        if (ctx.mounted) {
                          Navigator.pop(ctx);
                        }
                        if (mounted && success) {
                          _loadSubmissions();
                          messenger.showSnackBar(
                            const SnackBar(content: Text('Grade saved successfully!'), backgroundColor: Color(0xFF10B981)),
                          );
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF002045),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: isSaving
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Save', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          widget.materialTitle,
          style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 16),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF002045)))
          : _submissions.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.assignment_outlined, size: 48, color: Color(0xFF94A3B8)),
                      SizedBox(height: 10),
                      Text('No submissions received yet', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _submissions.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final sub = _submissions[index];
                    final isGraded = sub.marksAwarded != null;

                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFF1F5F9)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 18,
                                backgroundColor: const Color(0xFFEFF6FF),
                                child: Text(
                                  sub.studentName.isNotEmpty ? sub.studentName[0].toUpperCase() : 'S',
                                  style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF2563EB)),
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
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                                    ),
                                    if (sub.enrollmentNumber != null)
                                      Text(
                                        'Roll: ${sub.enrollmentNumber}',
                                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                      ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: isGraded ? const Color(0xFFECFDF5) : const Color(0xFFFFFBEB),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  isGraded ? 'Score: ${sub.marksAwarded}' : 'Pending',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: isGraded ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              if (sub.fileUrl != null && sub.fileUrl!.isNotEmpty)
                                TextButton.icon(
                                  onPressed: () => _openUrl(sub.fileUrl),
                                  icon: const Icon(Icons.open_in_new_rounded, size: 14),
                                  label: const Text('View File', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                                ),
                              const SizedBox(width: 8),
                              ElevatedButton(
                                onPressed: () => _showGradeDialog(sub),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF002045),
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                child: Text(
                                  isGraded ? 'Edit Grade' : 'Grade',
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
