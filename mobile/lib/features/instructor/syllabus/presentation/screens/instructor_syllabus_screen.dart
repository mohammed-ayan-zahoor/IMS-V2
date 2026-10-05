import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/instructor/batches/data/models/instructor_batch_model.dart';
import 'package:student_app/features/instructor/batches/presentation/providers/instructor_batches_provider.dart';
import 'package:student_app/features/instructor/syllabus/presentation/providers/instructor_syllabus_provider.dart';
import 'package:student_app/features/instructor/syllabus/presentation/screens/batch_syllabus_tracker_screen.dart';
import 'package:student_app/features/instructor/syllabus/presentation/screens/syllabus_builder_screen.dart';

class InstructorSyllabusScreen extends StatefulWidget {
  final String? initialBatchId;

  const InstructorSyllabusScreen({super.key, this.initialBatchId});

  @override
  State<InstructorSyllabusScreen> createState() => _InstructorSyllabusScreenState();
}

class _InstructorSyllabusScreenState extends State<InstructorSyllabusScreen> {
  InstructorBatchDetail? _selectedBatch;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final batchesProv = context.read<InstructorBatchesProvider>();
      if (batchesProv.batches.isEmpty) {
        batchesProv.loadBatches();
      }

      final sylProv = context.read<InstructorSyllabusProvider>();
      sylProv.loadSubjects().then((_) {
        _syncSelection();
      });
    });
  }

  void _syncSelection() {
    final batches = context.read<InstructorBatchesProvider>().batches;
    if (batches.isNotEmpty) {
      if (widget.initialBatchId != null) {
        final match = batches.where((b) => b.id == widget.initialBatchId);
        if (match.isNotEmpty) {
          _selectedBatch = match.first;
        }
      }
      _selectedBatch ??= batches.first;
    }

    final sylProv = context.read<InstructorSyllabusProvider>();
    if (sylProv.subjects.isNotEmpty) {
      final sub = sylProv.selectedSubject ?? sylProv.subjects.first;
      sylProv.setSelectedSubject(sub, batchId: _selectedBatch?.id);
    }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final batchesProv = context.watch<InstructorBatchesProvider>();
    final sylProv = context.watch<InstructorSyllabusProvider>();

    final batches = batchesProv.batches;
    final subjects = sylProv.subjects;
    final selectedSubject = sylProv.selectedSubject;
    final progress = sylProv.currentProgress;

    final progressPct = (progress?.overallProgress ?? 0).clamp(0.0, 100.0);
    final totalTopics = sylProv.totalTopicsCount;
    final completedTopics = sylProv.completedTopicsCount;

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
          'Syllabus & Curriculum',
          style: GoogleFonts.hankenGrotesk(
            fontWeight: FontWeight.bold,
            color: const Color(0xFF002045),
            fontSize: 18,
          ),
        ),
        actions: [
          if (selectedSubject != null)
            IconButton(
              tooltip: 'Edit Template',
              icon: const Icon(Icons.edit_note_rounded, color: Color(0xFF002045)),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => SyllabusBuilderScreen(subject: selectedSubject),
                  ),
                ).then((_) {
                  if (_selectedBatch != null) {
                    sylProv.setSelectedSubject(selectedSubject, batchId: _selectedBatch!.id);
                  }
                });
              },
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          if (selectedSubject != null && _selectedBatch != null) {
            await sylProv.loadSyllabus(selectedSubject.id);
            await sylProv.loadProgress(batchId: _selectedBatch!.id, subjectId: selectedSubject.id);
          }
        },
        color: const Color(0xFF002045),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Batch & Subject Selection Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Class & Subject',
                    style: GoogleFonts.hankenGrotesk(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Batch Dropdown
                  DropdownButtonFormField<String>(
                    value: _selectedBatch?.id,
                    decoration: _buildInputDecoration(label: 'Select Batch / Section'),
                    items: batches.map((b) {
                      return DropdownMenuItem<String>(
                        value: b.id,
                        child: Text('${b.name} (${b.courseName})', style: const TextStyle(fontSize: 13)),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          _selectedBatch = batches.firstWhere((b) => b.id == val);
                        });
                        if (selectedSubject != null) {
                          sylProv.setSelectedSubject(selectedSubject, batchId: _selectedBatch!.id);
                        }
                      }
                    },
                  ),
                  const SizedBox(height: 12),

                  // Subject Dropdown
                  DropdownButtonFormField<String>(
                    value: selectedSubject?.id,
                    decoration: _buildInputDecoration(label: 'Select Subject'),
                    items: subjects.map((s) {
                      return DropdownMenuItem<String>(
                        value: s.id,
                        child: Text('${s.name} (${s.code})', style: const TextStyle(fontSize: 13)),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        final chosen = subjects.firstWhere((s) => s.id == val);
                        sylProv.setSelectedSubject(chosen, batchId: _selectedBatch?.id);
                      }
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Progress Banner
            if (sylProv.isLoading)
              const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator(color: Color(0xFF002045))),
              )
            else if (selectedSubject == null)
              const Center(child: Text('No subjects found'))
            else if (sylProv.syllabus.isEmpty)
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.menu_book_outlined, size: 48, color: Color(0xFF94A3B8)),
                    const SizedBox(height: 12),
                    Text(
                      'No Syllabus Defined Yet',
                      style: GoogleFonts.hankenGrotesk(fontSize: 16, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Create chapters and topics for ${selectedSubject.name} to start tracking class progress.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => SyllabusBuilderScreen(subject: selectedSubject),
                          ),
                        ).then((_) {
                          if (_selectedBatch != null) {
                            sylProv.setSelectedSubject(selectedSubject, batchId: _selectedBatch!.id);
                          }
                        });
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF002045),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('Build Syllabus Template', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              )
            else ...[
              // Active Progress Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF002045), Color(0xFF0F2B5C)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF002045).withValues(alpha: 0.15),
                      blurRadius: 12,
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
                        Text(
                          'Batch Completion',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF94A3B8),
                            letterSpacing: 0.5,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '${sylProv.syllabus.length} Chapters',
                            style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    Row(
                      children: [
                        Text(
                          '${progressPct.toStringAsFixed(0)}%',
                          style: GoogleFonts.hankenGrotesk(
                            fontSize: 36,
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
                                '$completedTopics of $totalTopics Topics Covered',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 6),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: totalTopics > 0 ? (completedTopics / totalTopics).clamp(0.0, 1.0) : 0,
                                  minHeight: 6,
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

              const SizedBox(height: 16),

              // Two Action Buttons
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        if (_selectedBatch == null) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Please select a batch')),
                          );
                          return;
                        }
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => BatchSyllabusTrackerScreen(
                              batch: _selectedBatch!,
                              subject: selectedSubject,
                            ),
                          ),
                        ).then((_) {
                          sylProv.loadProgress(batchId: _selectedBatch!.id, subjectId: selectedSubject.id);
                        });
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF002045),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.checklist_rtl_rounded, size: 18),
                      label: const Text(
                        'Track Progress',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => SyllabusBuilderScreen(subject: selectedSubject),
                          ),
                        ).then((_) {
                          if (_selectedBatch != null) {
                            sylProv.setSelectedSubject(selectedSubject, batchId: _selectedBatch!.id);
                          }
                        });
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF002045),
                        side: const BorderSide(color: Color(0xFF002045)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.edit_note_rounded, size: 18),
                      label: const Text(
                        'Edit Template',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Chapter Overview List
              Text(
                'Curriculum Chapters',
                style: GoogleFonts.hankenGrotesk(fontSize: 15, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
              ),
              const SizedBox(height: 10),

              ...sylProv.syllabus.asMap().entries.map((entry) {
                final idx = entry.key;
                final ch = entry.value;

                int chDone = 0;
                for (final tp in ch.topics) {
                  if (tp.id != null && progress != null && progress.isItemCompleted(tp.id!)) {
                    chDone++;
                  }
                }

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 12,
                        backgroundColor: const Color(0xFFEFF4FF),
                        child: Text(
                          '${idx + 1}',
                          style: const TextStyle(color: Color(0xFF002045), fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              ch.title,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
                            ),
                            Text(
                              '$chDone of ${ch.topics.length} topics completed',
                              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                      if (ch.topics.isNotEmpty && chDone == ch.topics.length)
                        const Icon(Icons.check_circle, size: 18, color: Color(0xFF10B981))
                      else
                        Text(
                          '${ch.topics.isNotEmpty ? ((chDone / ch.topics.length) * 100).toStringAsFixed(0) : 0}%',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                        ),
                    ],
                  ),
                );
              }),
            ],
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  InputDecoration _buildInputDecoration({required String label}) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF002045), width: 1.5)),
    );
  }
}
