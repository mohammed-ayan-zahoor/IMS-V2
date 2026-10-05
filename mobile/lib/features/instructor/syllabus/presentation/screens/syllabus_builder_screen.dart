import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/instructor/syllabus/data/models/syllabus_model.dart';
import 'package:student_app/features/instructor/syllabus/presentation/providers/instructor_syllabus_provider.dart';

class SyllabusBuilderScreen extends StatefulWidget {
  final SyllabusSubject subject;

  const SyllabusBuilderScreen({super.key, required this.subject});

  @override
  State<SyllabusBuilderScreen> createState() => _SyllabusBuilderScreenState();
}

class _SyllabusBuilderScreenState extends State<SyllabusBuilderScreen> {
  late List<SyllabusChapter> _chapters;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    // Deep clone from provider syllabus
    final prov = context.read<InstructorSyllabusProvider>();
    _chapters = prov.syllabus.map((ch) {
      return SyllabusChapter(
        id: ch.id,
        title: ch.title,
        order: ch.order,
        topics: ch.topics.map((t) {
          return SyllabusTopic(
            id: t.id,
            title: t.title,
            order: t.order,
            subTopics: t.subTopics.map((st) {
              return SyllabusSubTopic(
                id: st.id,
                title: st.title,
                order: st.order,
              );
            }).toList(),
          );
        }).toList(),
      );
    }).toList();
  }

  void _addChapter() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Text(
          'Add Chapter / Module',
          style: GoogleFonts.hankenGrotesk(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'e.g., Unit 1: Introduction to Mechanics',
            border: OutlineInputBorder(),
          ),
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
            onPressed: () {
              final text = controller.text.trim();
              if (text.isNotEmpty) {
                setState(() {
                  _chapters.add(
                    SyllabusChapter(
                      id: 'tmp_ch_${DateTime.now().millisecondsSinceEpoch}',
                      title: text,
                      order: _chapters.length,
                    ),
                  );
                });
                Navigator.pop(ctx);
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _editChapter(int chapterIndex) {
    final controller = TextEditingController(text: _chapters[chapterIndex].title);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Text(
          'Edit Chapter',
          style: GoogleFonts.hankenGrotesk(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Chapter title',
            border: OutlineInputBorder(),
          ),
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
            onPressed: () {
              final text = controller.text.trim();
              if (text.isNotEmpty) {
                setState(() {
                  _chapters[chapterIndex].title = text;
                });
                Navigator.pop(ctx);
              }
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  void _deleteChapter(int chapterIndex) {
    setState(() {
      _chapters.removeAt(chapterIndex);
    });
  }

  void _addTopic(int chapterIndex) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Text(
          'Add Topic',
          style: GoogleFonts.hankenGrotesk(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'e.g., Newton\'s Laws of Motion',
            border: OutlineInputBorder(),
          ),
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
            onPressed: () {
              final text = controller.text.trim();
              if (text.isNotEmpty) {
                setState(() {
                  _chapters[chapterIndex].topics.add(
                    SyllabusTopic(
                      id: 'tmp_tp_${DateTime.now().millisecondsSinceEpoch}',
                      title: text,
                      order: _chapters[chapterIndex].topics.length,
                    ),
                  );
                });
                Navigator.pop(ctx);
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _editTopic(int chapterIndex, int topicIndex) {
    final controller = TextEditingController(text: _chapters[chapterIndex].topics[topicIndex].title);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Text(
          'Edit Topic',
          style: GoogleFonts.hankenGrotesk(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Topic title',
            border: OutlineInputBorder(),
          ),
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
            onPressed: () {
              final text = controller.text.trim();
              if (text.isNotEmpty) {
                setState(() {
                  _chapters[chapterIndex].topics[topicIndex].title = text;
                });
                Navigator.pop(ctx);
              }
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  void _deleteTopic(int chapterIndex, int topicIndex) {
    setState(() {
      _chapters[chapterIndex].topics.removeAt(topicIndex);
    });
  }

  void _addSubTopic(int chapterIndex, int topicIndex) {
    final controller = TextEditingController();
    final parentTopic = _chapters[chapterIndex].topics[topicIndex];
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Text(
          'Add Sub-Topic',
          style: GoogleFonts.hankenGrotesk(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Under: ${parentTopic.title}',
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              autofocus: true,
              decoration: const InputDecoration(
                hintText: 'e.g., Definitions & Key Concepts',
                border: OutlineInputBorder(),
                isDense: true,
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
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF002045),
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              final text = controller.text.trim();
              if (text.isNotEmpty) {
                setState(() {
                  parentTopic.subTopics.add(
                    SyllabusSubTopic(
                      id: 'tmp_st_${DateTime.now().millisecondsSinceEpoch}',
                      title: text,
                      order: parentTopic.subTopics.length,
                    ),
                  );
                });
                Navigator.pop(ctx);
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _editSubTopic(int chapterIndex, int topicIndex, int subTopicIndex) {
    final parentTopic = _chapters[chapterIndex].topics[topicIndex];
    final subTopic = parentTopic.subTopics[subTopicIndex];
    final controller = TextEditingController(text: subTopic.title);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Text(
          'Edit Sub-Topic',
          style: GoogleFonts.hankenGrotesk(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Sub-topic title',
            border: OutlineInputBorder(),
            isDense: true,
          ),
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
            onPressed: () {
              final text = controller.text.trim();
              if (text.isNotEmpty) {
                setState(() {
                  subTopic.title = text;
                });
                Navigator.pop(ctx);
              }
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  void _deleteSubTopic(int chapterIndex, int topicIndex, int subTopicIndex) {
    setState(() {
      _chapters[chapterIndex].topics[topicIndex].subTopics.removeAt(subTopicIndex);
    });
  }

  Future<void> _handleSave() async {
    setState(() => _isSaving = true);
    final prov = context.read<InstructorSyllabusProvider>();

    // Re-index orders before saving
    for (int i = 0; i < _chapters.length; i++) {
      _chapters[i].order = i;
      for (int j = 0; j < _chapters[i].topics.length; j++) {
        _chapters[i].topics[j].order = j;
        for (int k = 0; k < _chapters[i].topics[j].subTopics.length; k++) {
          _chapters[i].topics[j].subTopics[k].order = k;
        }
      }
    }

    final res = await prov.saveSyllabus(
      subjectId: widget.subject.id,
      chapters: _chapters,
    );

    setState(() => _isSaving = false);

    if (mounted) {
      if (res['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Syllabus updated successfully'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message']?.toString() ?? 'Failed to update syllabus'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
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
              'Syllabus Builder',
              style: GoogleFonts.hankenGrotesk(
                fontWeight: FontWeight.bold,
                color: const Color(0xFF002045),
                fontSize: 16,
              ),
            ),
            Text(
              widget.subject.name,
              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: _isSaving ? null : _handleSave,
            icon: _isSaving
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF002045)),
                  )
                : const Icon(Icons.check, size: 18, color: Color(0xFF002045)),
            label: Text(
              _isSaving ? 'Saving...' : 'Save',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Color(0xFF002045),
              ),
            ),
          ),
        ],
      ),
      body: _chapters.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.library_books_outlined, size: 54, color: Color(0xFFCBD5E1)),
                  const SizedBox(height: 12),
                  Text(
                    'No Chapters Yet',
                    style: GoogleFonts.hankenGrotesk(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF334155),
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Start organizing this subject into chapters and topics',
                    style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _addChapter,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF002045),
                      foregroundColor: Colors.white,
                    ),
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Add First Chapter'),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _chapters.length,
              itemBuilder: (context, chIdx) {
                final chapter = _chapters[chIdx];
                return Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Theme(
                    data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                    child: ExpansionTile(
                      initiallyExpanded: true,
                      tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                      title: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF4FF),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              'Ch ${chIdx + 1}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF002045),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              chapter.title,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                          ),
                        ],
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 18, color: Color(0xFF64748B)),
                            onPressed: () => _editChapter(chIdx),
                            tooltip: 'Edit Chapter',
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, size: 18, color: Color(0xFFEF4444)),
                            onPressed: () => _deleteChapter(chIdx),
                            tooltip: 'Delete Chapter',
                          ),
                        ],
                      ),
                      children: [
                        const Divider(height: 1, color: Color(0xFFF1F5F9)),
                        if (chapter.topics.isEmpty)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(
                              child: Text(
                                'No topics in this chapter yet',
                                style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                              ),
                            ),
                          )
                        else
                          ReorderableListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: chapter.topics.length,
                            onReorder: (oldIdx, newIdx) {
                              setState(() {
                                if (oldIdx < newIdx) {
                                  newIdx -= 1;
                                }
                                final item = chapter.topics.removeAt(oldIdx);
                                chapter.topics.insert(newIdx, item);
                              });
                            },
                            itemBuilder: (context, tpIdx) {
                              final topic = chapter.topics[tpIdx];
                              return Container(
                                key: ValueKey(topic.id ?? 'tp_${chIdx}_$tpIdx'),
                                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Padding(
                                      padding: const EdgeInsets.fromLTRB(8, 6, 8, 6),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.drag_indicator, size: 16, color: Color(0xFFCBD5E1)),
                                          const SizedBox(width: 4),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: Colors.white,
                                              borderRadius: BorderRadius.circular(4),
                                              border: Border.all(color: const Color(0xFFE2E8F0)),
                                            ),
                                            child: Text(
                                              '${chIdx + 1}.${tpIdx + 1}',
                                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              topic.title,
                                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1E293B)),
                                            ),
                                          ),
                                          InkWell(
                                            onTap: () => _addSubTopic(chIdx, tpIdx),
                                            borderRadius: BorderRadius.circular(4),
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFFEFF4FF),
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: const Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  Icon(Icons.add, size: 11, color: Color(0xFF002045)),
                                                  SizedBox(width: 2),
                                                  Text(
                                                    'Subtopic',
                                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF002045)),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 2),
                                          IconButton(
                                            icon: const Icon(Icons.edit_outlined, size: 15, color: Color(0xFF64748B)),
                                            onPressed: () => _editTopic(chIdx, tpIdx),
                                            padding: EdgeInsets.zero,
                                            constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                                            tooltip: 'Edit Topic',
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.close, size: 15, color: Color(0xFF94A3B8)),
                                            onPressed: () => _deleteTopic(chIdx, tpIdx),
                                            padding: EdgeInsets.zero,
                                            constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
                                            tooltip: 'Delete Topic',
                                          ),
                                        ],
                                      ),
                                    ),
                                    if (topic.subTopics.isNotEmpty)
                                      Container(
                                        margin: const EdgeInsets.fromLTRB(28, 0, 8, 6),
                                        padding: const EdgeInsets.only(left: 8, top: 2, bottom: 2),
                                        decoration: const BoxDecoration(
                                          border: Border(left: BorderSide(color: Color(0xFFCBD5E1), width: 1.5)),
                                        ),
                                        child: Column(
                                          children: topic.subTopics.asMap().entries.map((stEntry) {
                                            final stIdx = stEntry.key;
                                            final subTopic = stEntry.value;
                                            return Padding(
                                              padding: const EdgeInsets.symmetric(vertical: 2),
                                              child: Row(
                                                children: [
                                                  Container(
                                                    width: 4,
                                                    height: 4,
                                                    decoration: const BoxDecoration(
                                                      color: Color(0xFF94A3B8),
                                                      shape: BoxShape.circle,
                                                    ),
                                                  ),
                                                  const SizedBox(width: 6),
                                                  Expanded(
                                                    child: Text(
                                                      subTopic.title,
                                                      style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
                                                    ),
                                                  ),
                                                  IconButton(
                                                    icon: const Icon(Icons.edit_outlined, size: 13, color: Color(0xFF94A3B8)),
                                                    onPressed: () => _editSubTopic(chIdx, tpIdx, stIdx),
                                                    padding: EdgeInsets.zero,
                                                    constraints: const BoxConstraints(minWidth: 22, minHeight: 22),
                                                    tooltip: 'Edit Subtopic',
                                                  ),
                                                  IconButton(
                                                    icon: const Icon(Icons.close, size: 13, color: Color(0xFFCBD5E1)),
                                                    onPressed: () => _deleteSubTopic(chIdx, tpIdx, stIdx),
                                                    padding: EdgeInsets.zero,
                                                    constraints: const BoxConstraints(minWidth: 22, minHeight: 22),
                                                    tooltip: 'Delete Subtopic',
                                                  ),
                                                ],
                                              ),
                                            );
                                          }).toList(),
                                        ),
                                      ),
                                  ],
                                ),
                              );
                            },
                          ),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(14, 4, 14, 12),
                          child: OutlinedButton.icon(
                            onPressed: () => _addTopic(chIdx),
                            icon: const Icon(Icons.add, size: 14),
                            label: const Text('Add Topic', style: TextStyle(fontSize: 12)),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF002045),
                              side: const BorderSide(color: Color(0xFFCBD5E1)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
          ),
          child: ElevatedButton.icon(
            onPressed: _addChapter,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF002045),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Add Chapter', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          ),
        ),
      ),
    );
  }
}
