import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/instructor/batches/data/models/instructor_batch_model.dart';
import 'package:student_app/features/instructor/syllabus/data/models/syllabus_model.dart';
import 'package:student_app/features/instructor/syllabus/presentation/providers/instructor_syllabus_provider.dart';

class BatchSyllabusTrackerScreen extends StatefulWidget {
  final InstructorBatchDetail batch;
  final SyllabusSubject subject;

  const BatchSyllabusTrackerScreen({
    super.key,
    required this.batch,
    required this.subject,
  });

  @override
  State<BatchSyllabusTrackerScreen> createState() => _BatchSyllabusTrackerScreenState();
}

class _BatchSyllabusTrackerScreenState extends State<BatchSyllabusTrackerScreen> {
  final Set<String> _pendingToggles = {};
  final Set<String> _collapsedTopicIds = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InstructorSyllabusProvider>().loadProgress(
            batchId: widget.batch.id,
            subjectId: widget.subject.id,
          );
    });
  }

  void _showMarkDialog({
    required String itemId,
    required String itemType,
    required String chapterId,
    String? topicId,
    required String title,
    required bool currentlyCompleted,
  }) {
    final noteController = TextEditingController();

    if (currentlyCompleted) {
      // Direct unmark confirmation
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          title: Text(
            itemType == 'subtopic' ? 'Unmark Subtopic?' : 'Unmark Topic?',
            style: GoogleFonts.hankenGrotesk(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          content: Text('Mark "$title" as incomplete for ${widget.batch.name}?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444),
                foregroundColor: Colors.white,
              ),
              onPressed: () async {
                Navigator.pop(ctx);
                _toggleItem(
                  itemId: itemId,
                  itemType: itemType,
                  chapterId: chapterId,
                  topicId: topicId,
                  notes: null,
                );
              },
              child: const Text('Unmark'),
            ),
          ],
        ),
      );
      return;
    }

    // Mark as completed with optional notes
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Text(
          'Mark as Completed',
          style: GoogleFonts.hankenGrotesk(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: noteController,
              decoration: const InputDecoration(
                hintText: 'Notes / remarks (e.g. Covered in Lecture #12)',
                labelText: 'Session Remarks (Optional)',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF002045),
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              final notes = noteController.text.trim();
              Navigator.pop(ctx);
              _toggleItem(
                itemId: itemId,
                itemType: itemType,
                chapterId: chapterId,
                topicId: topicId,
                notes: notes.isNotEmpty ? notes : null,
              );
            },
            child: const Text('Mark Done'),
          ),
        ],
      ),
    );
  }

  Future<void> _toggleItem({
    required String itemId,
    required String itemType,
    required String chapterId,
    String? topicId,
    String? notes,
  }) async {
    setState(() => _pendingToggles.add(itemId));
    final prov = context.read<InstructorSyllabusProvider>();

    final success = await prov.toggleTopicCompletion(
      itemId: itemId,
      itemType: itemType,
      chapterId: chapterId,
      topicId: topicId,
      notes: notes,
    );

    if (mounted) {
      setState(() => _pendingToggles.remove(itemId));
      if (!success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update progress. Please retry.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<InstructorSyllabusProvider>();
    final progress = prov.currentProgress;
    final syllabus = prov.syllabus;

    final progressPct = (progress?.overallProgress ?? 0).clamp(0.0, 100.0);
    final totalTopics = prov.totalTopicsCount;
    final completedTopics = prov.completedTopicsCount;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF002045)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Batch Syllabus Tracker',
              style: GoogleFonts.hankenGrotesk(
                fontWeight: FontWeight.bold,
                color: const Color(0xFF002045),
                fontSize: 16,
              ),
            ),
            Text(
              '${widget.batch.name} • ${widget.subject.name}',
              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
            ),
          ],
        ),
      ),
      body: prov.isLoading && progress == null
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF002045)))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Top Progress Card
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Overall Completion',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF64748B),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '$completedTopics of $totalTopics Topics',
                                style: GoogleFonts.hankenGrotesk(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF0F172A),
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF4FF),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              '${progressPct.toStringAsFixed(1)}%',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF002045),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: totalTopics > 0 ? (completedTopics / totalTopics).clamp(0.0, 1.0) : 0,
                          minHeight: 8,
                          backgroundColor: const Color(0xFFF1F5F9),
                          valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF10B981)),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 18),

                Text(
                  'Chapters & Topics',
                  style: GoogleFonts.hankenGrotesk(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 10),

                if (syllabus.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: const Center(
                      child: Text(
                        'No syllabus topics available for this subject yet.',
                        style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                      ),
                    ),
                  )
                else
                  ...syllabus.asMap().entries.map((entry) {
                    final chIdx = entry.key;
                    final chapter = entry.value;

                    int chDone = 0;
                    int chTotal = 0;
                    for (final t in chapter.topics) {
                      if (t.subTopics.isNotEmpty) {
                        for (final st in t.subTopics) {
                          chTotal++;
                          if (st.id != null && progress != null && progress.isItemCompleted(st.id!)) {
                            chDone++;
                          }
                        }
                      } else {
                        chTotal++;
                        if (t.id != null && progress != null && progress.isItemCompleted(t.id!)) {
                          chDone++;
                        }
                      }
                    }

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Theme(
                        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                        child: ExpansionTile(
                          initiallyExpanded: true,
                          tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                          title: Text(
                            'Chapter ${chIdx + 1}: ${chapter.title}',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          subtitle: Text(
                            '$chDone / $chTotal completed',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          ),
                          children: [
                            const Divider(height: 1, color: Color(0xFFF1F5F9)),
                            ...chapter.topics.asMap().entries.map((tpEntry) {
                              final topic = tpEntry.value;
                              final topicId = topic.id;
                              final hasSubTopics = topic.subTopics.isNotEmpty;

                              // Calculate subtopic completions if present
                              int stDoneCount = 0;
                              if (hasSubTopics) {
                                for (final st in topic.subTopics) {
                                  if (st.id != null && (progress?.isItemCompleted(st.id!) ?? false)) {
                                    stDoneCount++;
                                  }
                                }
                              }

                              final isTopicDone = hasSubTopics
                                  ? (stDoneCount == topic.subTopics.length)
                                  : (topicId != null && (progress?.isItemCompleted(topicId) ?? false));
                              final isPartial = hasSubTopics && stDoneCount > 0 && stDoneCount < topic.subTopics.length;
                              final isPending = topicId != null && _pendingToggles.contains(topicId);
                              final isCollapsed = topicId != null && _collapsedTopicIds.contains(topicId);

                              // Find topic completion record if any
                              final completion = topicId != null ? progress?.findCompletion(topicId) : null;

                              return Container(
                                decoration: const BoxDecoration(
                                  border: Border(bottom: BorderSide(color: Color(0xFFF8FAFC))),
                                ),
                                child: Column(
                                  children: [
                                    // Topic Row
                                    Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.center,
                                        children: [
                                          // Checkbox for topic
                                          InkWell(
                                            onTap: topicId == null || isPending
                                                ? null
                                                : () {
                                                    _showMarkDialog(
                                                      itemId: topicId,
                                                      itemType: 'topic',
                                                      chapterId: chapter.id ?? '',
                                                      topicId: topicId,
                                                      title: topic.title,
                                                      currentlyCompleted: isTopicDone,
                                                    );
                                                  },
                                            child: Padding(
                                              padding: const EdgeInsets.only(right: 10),
                                              child: isPending
                                                  ? const SizedBox(
                                                      width: 20,
                                                      height: 20,
                                                      child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF002045)),
                                                    )
                                                  : Icon(
                                                      isTopicDone
                                                          ? Icons.check_box
                                                          : (isPartial ? Icons.indeterminate_check_box : Icons.check_box_outline_blank),
                                                      color: isTopicDone
                                                          ? const Color(0xFF10B981)
                                                          : (isPartial ? const Color(0xFF002045) : const Color(0xFF94A3B8)),
                                                      size: 22,
                                                    ),
                                            ),
                                          ),

                                          // Topic Title & Subtopic Badge
                                          Expanded(
                                            child: InkWell(
                                              onTap: hasSubTopics
                                                  ? () {
                                                      if (topicId != null) {
                                                        setState(() {
                                                          if (isCollapsed) {
                                                            _collapsedTopicIds.remove(topicId);
                                                          } else {
                                                            _collapsedTopicIds.add(topicId);
                                                          }
                                                        });
                                                      }
                                                    }
                                                  : (topicId == null || isPending
                                                      ? null
                                                      : () {
                                                          _showMarkDialog(
                                                            itemId: topicId,
                                                            itemType: 'topic',
                                                            chapterId: chapter.id ?? '',
                                                            title: topic.title,
                                                            currentlyCompleted: isTopicDone,
                                                          );
                                                        }),
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Row(
                                                    children: [
                                                      Expanded(
                                                        child: Text(
                                                          topic.title,
                                                          style: TextStyle(
                                                            fontSize: 13,
                                                            fontWeight: FontWeight.w600,
                                                            color: isTopicDone ? const Color(0xFF64748B) : const Color(0xFF0F172A),
                                                            decoration: isTopicDone ? TextDecoration.lineThrough : null,
                                                          ),
                                                        ),
                                                      ),
                                                      if (hasSubTopics) ...[
                                                        const SizedBox(width: 6),
                                                        Container(
                                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                          decoration: BoxDecoration(
                                                            color: isTopicDone
                                                                ? const Color(0xFFECFDF5)
                                                                : const Color(0xFFEFF4FF),
                                                            borderRadius: BorderRadius.circular(4),
                                                          ),
                                                          child: Text(
                                                            '$stDoneCount/${topic.subTopics.length}',
                                                            style: TextStyle(
                                                              fontSize: 10,
                                                              fontWeight: FontWeight.bold,
                                                              color: isTopicDone
                                                                  ? const Color(0xFF059669)
                                                                  : const Color(0xFF002045),
                                                            ),
                                                          ),
                                                        ),
                                                        const SizedBox(width: 4),
                                                        Icon(
                                                          isCollapsed
                                                              ? Icons.keyboard_arrow_down
                                                              : Icons.keyboard_arrow_up,
                                                          size: 16,
                                                          color: const Color(0xFF94A3B8),
                                                        ),
                                                      ],
                                                    ],
                                                  ),
                                                  if (completion?.notes != null && completion!.notes!.isNotEmpty) ...[
                                                    const SizedBox(height: 2),
                                                    Text(
                                                      'Note: ${completion.notes!}',
                                                      style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Color(0xFF475569)),
                                                    ),
                                                  ],
                                                ],
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),

                                    // Sub-Topics indented checklist
                                    if (hasSubTopics && !isCollapsed)
                                      Container(
                                        margin: const EdgeInsets.fromLTRB(36, 0, 14, 8),
                                        padding: const EdgeInsets.only(left: 8),
                                        decoration: const BoxDecoration(
                                          border: Border(left: BorderSide(color: Color(0xFFE2E8F0), width: 1.5)),
                                        ),
                                        child: Column(
                                          children: topic.subTopics.map((subTopic) {
                                            final stId = subTopic.id;
                                            final isStDone = stId != null && (progress?.isItemCompleted(stId) ?? false);
                                            final isStPending = stId != null && _pendingToggles.contains(stId);
                                            final stCompletion = stId != null ? progress?.findCompletion(stId) : null;

                                            return InkWell(
                                              onTap: stId == null || isStPending
                                                  ? null
                                                  : () {
                                                      _showMarkDialog(
                                                        itemId: stId,
                                                        itemType: 'subtopic',
                                                        chapterId: chapter.id ?? '',
                                                        topicId: topic.id,
                                                        title: subTopic.title,
                                                        currentlyCompleted: isStDone,
                                                      );
                                                    },
                                              child: Padding(
                                                padding: const EdgeInsets.symmetric(vertical: 5, horizontal: 4),
                                                child: Row(
                                                  children: [
                                                    if (isStPending)
                                                      const SizedBox(
                                                        width: 17,
                                                        height: 17,
                                                        child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF002045)),
                                                      )
                                                    else
                                                      Icon(
                                                        isStDone ? Icons.check_box : Icons.check_box_outline_blank,
                                                        color: isStDone ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
                                                        size: 17,
                                                      ),
                                                    const SizedBox(width: 8),
                                                    Expanded(
                                                      child: Column(
                                                        crossAxisAlignment: CrossAxisAlignment.start,
                                                        children: [
                                                          Text(
                                                            subTopic.title,
                                                            style: TextStyle(
                                                              fontSize: 12,
                                                              color: isStDone ? const Color(0xFF64748B) : const Color(0xFF334155),
                                                              decoration: isStDone ? TextDecoration.lineThrough : null,
                                                            ),
                                                          ),
                                                          if (stCompletion?.notes != null && stCompletion!.notes!.isNotEmpty)
                                                            Text(
                                                              'Note: ${stCompletion.notes!}',
                                                              style: const TextStyle(fontSize: 10, fontStyle: FontStyle.italic, color: Color(0xFF64748B)),
                                                            ),
                                                        ],
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            );
                                          }).toList(),
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
                  }),
                const SizedBox(height: 32),
              ],
            ),
    );
  }
}
