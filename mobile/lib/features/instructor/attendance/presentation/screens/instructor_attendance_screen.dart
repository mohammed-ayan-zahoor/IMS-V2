import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:student_app/features/instructor/attendance/presentation/providers/instructor_attendance_provider.dart';
import 'package:student_app/features/instructor/attendance/presentation/widgets/attendance_card_stack.dart';
import 'package:student_app/l10n/app_localizations.dart';

class InstructorAttendanceScreen extends StatefulWidget {
  final String? initialBatchId;

  const InstructorAttendanceScreen({
    super.key,
    this.initialBatchId,
  });

  @override
  State<InstructorAttendanceScreen> createState() => _InstructorAttendanceScreenState();
}

class _InstructorAttendanceScreenState extends State<InstructorAttendanceScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.initialBatchId != null) {
        context.read<InstructorAttendanceProvider>().selectBatch(widget.initialBatchId!);
      }
    });
  }

  Future<void> _pickDate(BuildContext context) async {
    final provider = context.read<InstructorAttendanceProvider>();
    final picked = await showDatePicker(
      context: context,
      initialDate: provider.selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 30)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF002045),
              onPrimary: Colors.white,
              onSurface: Color(0xFF0F172A),
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      provider.selectDate(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InstructorAttendanceProvider>();
    final l10n = AppLocalizations.of(context);
    final batches = provider.batches;

    final formattedDate = DateFormat('d MMM yyyy').format(provider.selectedDate);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          l10n?.markAttendance ?? 'Mark Attendance',
          style: GoogleFonts.hankenGrotesk(
            fontWeight: FontWeight.bold,
            color: const Color(0xFF002045),
            fontSize: 18,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: Color(0xFFC4C6CF))),
            ),
            child: Row(
              children: [
                // Batch/Class Dropdown with Class & Section
                Expanded(
                  flex: 3,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF4FF),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: const Color(0xFFC4C6CF)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: provider.selectedBatchId,
                        isExpanded: true,
                        dropdownColor: Colors.white,
                        borderRadius: BorderRadius.circular(4),
                        elevation: 3,
                        icon: const Icon(Icons.arrow_drop_down_rounded, size: 24, color: Color(0xFF002045)),
                        hint: Text(
                          'Select Class & Batch',
                          style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF545F72)),
                        ),
                        items: batches.map((b) {
                          final label = b.courseName.isNotEmpty
                              ? '${b.courseName} (Sec ${b.name})'
                              : 'Section ${b.name}';
                          return DropdownMenuItem<String>(
                            value: b.id,
                            child: Text(
                              label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.inter(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF0D1C2E),
                              ),
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            provider.selectBatch(val);
                          }
                        },
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Date Picker Button
                Expanded(
                  flex: 2,
                  child: InkWell(
                    onTap: () => _pickDate(context),
                    borderRadius: BorderRadius.circular(4),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 11),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF4FF),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: const Color(0xFFC4C6CF)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.calendar_today_rounded, size: 14, color: Color(0xFF002045)),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              formattedDate,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF002045),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: provider.isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF002045)))
          : batches.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.class_outlined, size: 48, color: Color(0xFF94A3B8)),
                      const SizedBox(height: 12),
                      Text(
                        l10n?.emptyState ?? 'No batches assigned to you.',
                        style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: const Color(0xFF545F72)),
                      ),
                    ],
                  ),
                )
              : const AttendanceCardStack(),
      bottomNavigationBar: provider.students.isNotEmpty
          ? SafeArea(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: Color(0xFFC4C6CF))),
                ),
                child: ElevatedButton(
                  onPressed: provider.isSaving
                      ? null
                      : () async {
                          final success = await provider.saveAttendance();
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  success
                                      ? 'Attendance saved successfully!'
                                      : 'Failed to save attendance. Try again.',
                                  style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                                ),
                                backgroundColor: success ? const Color(0xFF10B981) : const Color(0xFFBA1A1A),
                              ),
                            );
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF002045),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                    elevation: 0,
                  ),
                  child: provider.isSaving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(
                          '${l10n?.saveAttendance ?? 'Save Attendance'} (${provider.presentCount}/${provider.totalCount})',
                          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                ),
              ),
            )
          : null,
    );
  }
}
