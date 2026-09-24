import 'package:flutter/material.dart';
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
        // Tally Bar
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
            ],
          ),
        ),

        // Controls bar: Search + Mark All Present
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      onChanged: (val) => setState(() => _searchQuery = val),
                      decoration: InputDecoration(
                        hintText: l10n?.searchStudentHint ?? 'Search student...',
                        hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                        prefixIcon: const Icon(Icons.search, size: 18, color: Color(0xFF64748B)),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    onPressed: () => provider.markAllPresent(),
                    icon: const Icon(Icons.done_all_rounded, size: 16, color: Colors.white),
                    label: Text(
                      l10n?.markAllPresent ?? 'All Present',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              // Filter Chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildFilterChip('ALL', 'All (${provider.totalCount})'),
                    const SizedBox(width: 8),
                    _buildFilterChip('present', '${l10n?.present ?? 'Present'} (${provider.presentCount})'),
                    const SizedBox(width: 8),
                    _buildFilterChip('absent', '${l10n?.absent ?? 'Absent'} (${provider.absentCount})'),
                    const SizedBox(width: 8),
                    _buildFilterChip('late', '${l10n?.late ?? 'Late'} (${provider.lateCount})'),
                  ],
                ),
              ),
            ],
          ),
        ),

        const Divider(height: 1, color: Color(0xFFE2E8F0)),

        // Student Roster Cards
        Expanded(
          child: filtered.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.people_outline, size: 48, color: Color(0xFF94A3B8)),
                      const SizedBox(height: 8),
                      Text(
                        l10n?.emptyState ?? 'No students found',
                        style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600),
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
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: currentStatus == 'absent'
                              ? const Color(0xFFFECDD3)
                              : currentStatus == 'late'
                                  ? const Color(0xFFFDE68A)
                                  : const Color(0xFFE2E8F0),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.02),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 18,
                                backgroundColor: const Color(0xFFEFF6FF),
                                child: Text(
                                  student.name.isNotEmpty ? student.name[0].toUpperCase() : 'S',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14,
                                    color: Color(0xFF2563EB),
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
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                    if (student.enrollmentNumber.isNotEmpty)
                                      Text(
                                        'Roll: ${student.enrollmentNumber}',
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: Color(0xFF64748B),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              _buildStatusBadge(currentStatus, l10n),
                            ],
                          ),
                          const SizedBox(height: 10),
                          // 3-button status toggle
                          Row(
                            children: [
                              _buildToggleButton(
                                label: l10n?.present ?? 'Present',
                                isSelected: currentStatus == 'present',
                                activeColor: const Color(0xFF10B981),
                                activeBg: const Color(0xFFECFDF5),
                                onTap: () => provider.setStatus(student.id, 'present'),
                              ),
                              const SizedBox(width: 8),
                              _buildToggleButton(
                                label: l10n?.absent ?? 'Absent',
                                isSelected: currentStatus == 'absent',
                                activeColor: const Color(0xFFEF4444),
                                activeBg: const Color(0xFFFEF2F2),
                                onTap: () => provider.setStatus(student.id, 'absent'),
                              ),
                              const SizedBox(width: 8),
                              _buildToggleButton(
                                label: l10n?.late ?? 'Late',
                                isSelected: currentStatus == 'late',
                                activeColor: const Color(0xFFF59E0B),
                                activeBg: const Color(0xFFFFFBEB),
                                onTap: () => provider.setStatus(student.id, 'late'),
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
          style: TextStyle(
            color: color,
            fontSize: 16,
            fontWeight: FontWeight.w800,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF94A3B8),
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
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF002045) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? Colors.white : const Color(0xFF475569),
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
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg),
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
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? activeBg : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? activeColor : const Color(0xFFE2E8F0),
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                color: isSelected ? activeColor : const Color(0xFF64748B),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
