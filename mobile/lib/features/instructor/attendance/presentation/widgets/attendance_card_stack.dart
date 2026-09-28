import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/instructor/attendance/presentation/providers/instructor_attendance_provider.dart';
import 'package:student_app/l10n/app_localizations.dart';

class AttendanceCardStack extends StatefulWidget {
  const AttendanceCardStack({super.key});

  @override
  State<AttendanceCardStack> createState() => _AttendanceCardStackState();
}

class _AttendanceCardStackState extends State<AttendanceCardStack> {
  String _searchQuery = '';
  String _statusFilter = 'ALL'; // 'ALL', 'present', 'absent', 'late'

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InstructorAttendanceProvider>();
    final l10n = AppLocalizations.of(context);

    final students = provider.students;
    final attendanceMap = provider.attendanceMap;

    // Filter students
    final filtered = students.where((s) {
      final matchesSearch = s.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          s.enrollmentNumber.toLowerCase().contains(_searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (_statusFilter == 'ALL') return true;
      return attendanceMap[s.id] == _statusFilter;
    }).toList();

    return Column(
      children: [
        // Tally Bar (Clean flat Navy)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: const BoxDecoration(
            color: Color(0xFF002045),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildTallyItem('Total', '${provider.totalCount}', Colors.white),
              _buildTallyDivider(),
              _buildTallyItem(l10n?.present ?? 'Present', '${provider.presentCount}', const Color(0xFF34D399)),
              _buildTallyDivider(),
              _buildTallyItem(l10n?.absent ?? 'Absent', '${provider.absentCount}', const Color(0xFFF87171)),
              _buildTallyDivider(),
              _buildTallyItem(l10n?.late ?? 'Late', '${provider.lateCount}', const Color(0xFFFBBF24)),
              _buildTallyDivider(),
              _buildTallyItem('Holiday', '${provider.holidayCount}', const Color(0xFFA5B4FC)),
            ],
          ),
        ),

        // Controls bar: Search + Mark All Present + Mark All Holiday
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
          child: Column(
            children: [
              TextField(
                onChanged: (val) => setState(() => _searchQuery = val),
                decoration: InputDecoration(
                  hintText: l10n?.searchStudentHint ?? 'Search student...',
                  hintStyle: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF545F72)),
                  prefixIcon: const Icon(Icons.search, size: 18, color: Color(0xFF545F72)),
                  filled: true,
                  fillColor: const Color(0xFFEFF4FF),
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => provider.markAllPresent(),
                      icon: const Icon(Icons.done_all_rounded, size: 16, color: Colors.white),
                      label: Text(
                        l10n?.markAllPresent ?? 'All Present',
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF002045),
                        padding: const EdgeInsets.symmetric(vertical: 9),
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => provider.markAllHoliday(),
                      icon: const Icon(Icons.beach_access_outlined, size: 16, color: Color(0xFF6366F1)),
                      label: Text(
                        'Mark Holiday',
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF6366F1)),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFC7D2FE)),
                        backgroundColor: const Color(0xFFEEF2FF),
                        padding: const EdgeInsets.symmetric(vertical: 9),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // Filter chips row
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildFilterChip('ALL', 'All (${students.length})'),
                    const SizedBox(width: 6),
                    _buildFilterChip('present', '${l10n?.present ?? 'Present'} (${provider.presentCount})'),
                    const SizedBox(width: 6),
                    _buildFilterChip('absent', '${l10n?.absent ?? 'Absent'} (${provider.absentCount})'),
                    const SizedBox(width: 6),
                    _buildFilterChip('late', '${l10n?.late ?? 'Late'} (${provider.lateCount})'),
                    const SizedBox(width: 6),
                    _buildFilterChip('holiday', 'Holiday (${provider.holidayCount})'),
                  ],
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1, color: Color(0xFFC4C6CF)),

        // Student Roster List
        Expanded(
          child: filtered.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.person_search_outlined, size: 48, color: Color(0xFF545F72)),
                      const SizedBox(height: 8),
                      Text(
                        l10n?.emptyState ?? 'No students found',
                        style: GoogleFonts.inter(color: const Color(0xFF545F72), fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final student = filtered[index];
                    final currentStatus = attendanceMap[student.id] ?? 'present';

                    return Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(
                          color: currentStatus == 'absent'
                              ? const Color(0xFFFECDD3)
                              : currentStatus == 'late'
                                  ? const Color(0xFFFDE68A)
                                  : currentStatus == 'holiday'
                                      ? const Color(0xFFC7D2FE)
                                      : const Color(0xFFC4C6CF),
                        ),
                      ),
                      child: Column(
                        children: [
                          Row(
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
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      student.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: GoogleFonts.hankenGrotesk(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: const Color(0xFF0D1C2E),
                                      ),
                                    ),
                                    if (student.enrollmentNumber.isNotEmpty)
                                      Text(
                                        'Roll: ${student.enrollmentNumber}',
                                        style: GoogleFonts.inter(
                                          fontSize: 11,
                                          color: const Color(0xFF545F72),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              _buildStatusBadge(currentStatus, l10n),
                            ],
                          ),
                          const SizedBox(height: 10),
                          // 4-button status toggle with radius 4
                          Row(
                            children: [
                              _buildToggleButton(
                                label: l10n?.present ?? 'Present',
                                isSelected: currentStatus == 'present',
                                activeColor: const Color(0xFF16A34A),
                                activeBg: const Color(0xFFDCFCE7),
                                onTap: () => provider.setStatus(student.id, 'present'),
                              ),
                              const SizedBox(width: 6),
                              _buildToggleButton(
                                label: l10n?.absent ?? 'Absent',
                                isSelected: currentStatus == 'absent',
                                activeColor: const Color(0xFFDC2626),
                                activeBg: const Color(0xFFFEE2E2),
                                onTap: () => provider.setStatus(student.id, 'absent'),
                              ),
                              const SizedBox(width: 6),
                              _buildToggleButton(
                                label: l10n?.late ?? 'Late',
                                isSelected: currentStatus == 'late',
                                activeColor: const Color(0xFFD97706),
                                activeBg: const Color(0xFFFEF3C7),
                                onTap: () => provider.setStatus(student.id, 'late'),
                              ),
                              const SizedBox(width: 6),
                              _buildToggleButton(
                                label: 'Holiday',
                                isSelected: currentStatus == 'holiday',
                                activeColor: const Color(0xFF6366F1),
                                activeBg: const Color(0xFFEEF2FF),
                                onTap: () => provider.setStatus(student.id, 'holiday'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildTallyItem(String label, String count, Color color) {
    return Column(
      children: [
        Text(
          count,
          style: GoogleFonts.hankenGrotesk(
            color: color,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: GoogleFonts.inter(
            color: const Color(0xFF94A3B8),
            fontSize: 11,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildTallyDivider() {
    return Container(
      width: 1,
      height: 24,
      color: Colors.white.withValues(alpha: 0.15),
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _statusFilter == key;
    return InkWell(
      onTap: () => setState(() => _statusFilter = key),
      borderRadius: BorderRadius.circular(4),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF002045) : const Color(0xFFEFF4FF),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(
            color: isSelected ? const Color(0xFF002045) : const Color(0xFFC4C6CF),
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : const Color(0xFF002045),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status, AppLocalizations? l10n) {
    Color bg;
    Color fg;
    String label;

    switch (status) {
      case 'absent':
        bg = const Color(0xFFFEE2E2);
        fg = const Color(0xFFDC2626);
        label = l10n?.absent ?? 'Absent';
        break;
      case 'late':
        bg = const Color(0xFFFEF3C7);
        fg = const Color(0xFFD97706);
        label = l10n?.late ?? 'Late';
        break;
      case 'holiday':
        bg = const Color(0xFFEEF2FF);
        fg = const Color(0xFF6366F1);
        label = 'Holiday';
        break;
      case 'present':
      default:
        bg = const Color(0xFFDCFCE7);
        fg = const Color(0xFF16A34A);
        label = l10n?.present ?? 'Present';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: fg),
      ),
    );
  }

  Widget _buildToggleButton({
    required String label,
    required bool isSelected,
    required Color activeColor,
    required Color activeBg,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(4),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 7),
          decoration: BoxDecoration(
            color: isSelected ? activeBg : Colors.white,
            borderRadius: BorderRadius.circular(4),
            border: Border.all(
              color: isSelected ? activeColor : const Color(0xFFC4C6CF),
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 11.5,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                color: isSelected ? activeColor : const Color(0xFF545F72),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
