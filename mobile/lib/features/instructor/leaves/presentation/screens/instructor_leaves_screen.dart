import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/instructor/leaves/data/models/instructor_leave_model.dart';
import 'package:student_app/features/instructor/leaves/data/models/instructor_permission_model.dart';
import 'package:student_app/features/instructor/leaves/presentation/providers/instructor_leaves_provider.dart';
import 'package:student_app/features/instructor/leaves/presentation/widgets/apply_leave_sheet.dart';
import 'package:student_app/features/instructor/leaves/presentation/widgets/apply_permission_sheet.dart';
import 'package:student_app/l10n/app_localizations.dart';

class InstructorLeavesScreen extends StatefulWidget {
  const InstructorLeavesScreen({super.key});

  @override
  State<InstructorLeavesScreen> createState() => _InstructorLeavesScreenState();
}

class _InstructorLeavesScreenState extends State<InstructorLeavesScreen> {
  // Main view segment: 0 = Leaves, 1 = Permissions (Out-Pass)
  int _selectedSegment = 0;
  String _selectedStatus = 'ALL';

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return const Color(0xFF10B981);
      case 'REJECTED':
        return const Color(0xFFEF4444);
      case 'CANCELLED':
        return const Color(0xFF64748B);
      case 'DEPARTED':
        return const Color(0xFF6366F1);
      case 'COMPLETED':
        return const Color(0xFF059669);
      case 'PENDING':
      default:
        return const Color(0xFFF59E0B);
    }
  }

  Color _getStatusBg(String status) {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return const Color(0xFFECFDF5);
      case 'REJECTED':
        return const Color(0xFFFEF2F2);
      case 'CANCELLED':
        return const Color(0xFFF1F5F9);
      case 'DEPARTED':
        return const Color(0xFFEEF2FF);
      case 'COMPLETED':
        return const Color(0xFFD1FAE5);
      case 'PENDING':
      default:
        return const Color(0xFFFFFBEB);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InstructorLeavesProvider>();
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          _selectedSegment == 0 ? (l10n?.leaveRequestsTitle ?? 'My Leave Requests') : 'Permissions (Out-Pass)',
          style: GoogleFonts.hankenGrotesk(
            fontWeight: FontWeight.w800,
            color: const Color(0xFF0F172A),
            fontSize: 17,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: ElevatedButton.icon(
              onPressed: () {
                if (_selectedSegment == 0) {
                  ApplyLeaveSheet.show(context);
                } else {
                  ApplyPermissionSheet.show(context);
                }
              },
              icon: const Icon(Icons.add_rounded, size: 16, color: Colors.white),
              label: Text(
                _selectedSegment == 0 ? (l10n?.applyLeave ?? 'Apply') : 'Request',
                style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF002045),
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Segmented Control (Leaves vs Permissions)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: Container(
              height: 38,
              decoration: BoxDecoration(
                color: const Color(0xFFEFF4FF),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: const Color(0xFFC4C6CF)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedSegment = 0),
                      child: Container(
                        decoration: BoxDecoration(
                          color: _selectedSegment == 0 ? const Color(0xFF002045) : Colors.transparent,
                          borderRadius: BorderRadius.circular(3),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          'Leave Requests',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: _selectedSegment == 0 ? FontWeight.bold : FontWeight.w500,
                            color: _selectedSegment == 0 ? Colors.white : const Color(0xFF545F72),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedSegment = 1),
                      child: Container(
                        decoration: BoxDecoration(
                          color: _selectedSegment == 1 ? const Color(0xFF002045) : Colors.transparent,
                          borderRadius: BorderRadius.circular(3),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          'Permissions (Out-Pass)',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: _selectedSegment == 1 ? FontWeight.bold : FontWeight.w500,
                            color: _selectedSegment == 1 ? Colors.white : const Color(0xFF545F72),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Status Filter Tabs
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildTab('ALL', 'All'),
                  const SizedBox(width: 8),
                  _buildTab('PENDING', l10n?.statusPending ?? 'Pending'),
                  const SizedBox(width: 8),
                  _buildTab('APPROVED', l10n?.statusApproved ?? 'Approved'),
                  const SizedBox(width: 8),
                  _buildTab('REJECTED', l10n?.statusRejected ?? 'Rejected'),
                ],
              ),
            ),
          ),
          const Divider(height: 1, color: Color(0xFFC4C6CF)),

          // Main List View
          Expanded(
            child: _selectedSegment == 0
                ? _buildLeavesList(provider, l10n)
                : _buildPermissionsList(provider),
          ),
        ],
      ),
    );
  }

  Widget _buildTab(String key, String label) {
    final isSelected = _selectedStatus == key;
    return GestureDetector(
      onTap: () => setState(() => _selectedStatus = key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
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
            color: isSelected ? Colors.white : const Color(0xFF545F72),
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          ),
        ),
      ),
    );
  }

  // TAB 1: Leaves
  Widget _buildLeavesList(InstructorLeavesProvider provider, AppLocalizations? l10n) {
    final filtered = provider.leaveRequests.where((r) {
      if (_selectedStatus == 'ALL') return true;
      return r.status.toUpperCase() == _selectedStatus;
    }).toList();

    return RefreshIndicator(
      onRefresh: () => provider.loadLeaves(refresh: true),
      color: const Color(0xFF002045),
      child: provider.isLoading && provider.leaveRequests.isEmpty
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF002045)))
          : filtered.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.time_to_leave_outlined, size: 44, color: Color(0xFF94A3B8)),
                      const SizedBox(height: 10),
                      Text(
                        l10n?.emptyState ?? 'No leave requests found',
                        style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF64748B), fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: () => ApplyLeaveSheet.show(context),
                        icon: const Icon(Icons.add, size: 16, color: Color(0xFF002045)),
                        label: Text('Apply for Leave', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF002045))),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFFC4C6CF)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final req = filtered[index];
                    return _buildLeaveCard(context, provider, req);
                  },
                ),
    );
  }

  Widget _buildLeaveCard(BuildContext context, InstructorLeavesProvider provider, InstructorLeaveRequestItem req) {
    final statusColor = _getStatusColor(req.status);
    final statusBg = _getStatusBg(req.status);
    final startStr = req.parsedStartDate != null ? DateFormat('MMM dd, yyyy').format(req.parsedStartDate!) : req.startDate;
    final endStr = req.parsedEndDate != null ? DateFormat('MMM dd, yyyy').format(req.parsedEndDate!) : req.endDate;

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
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF4FF),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  req.leaveTypeName,
                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF002045)),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusBg,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  req.status.toUpperCase(),
                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: statusColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.date_range_outlined, size: 14, color: Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text(
                '$startStr  →  $endStr',
                style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            req.reason ?? '',
            style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF475569)),
          ),
          if (req.adminComment != null && req.adminComment!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Text(
                'Admin Remark: ${req.adminComment}',
                style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF64748B), fontStyle: FontStyle.italic),
              ),
            ),
          ],
          if (req.isPending) ...[
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => _confirmCancelLeave(context, provider, req.id),
                icon: const Icon(Icons.cancel_outlined, size: 14, color: Color(0xFFEF4444)),
                label: Text('Cancel Request', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFFEF4444))),
              ),
            ),
          ],
        ],
      ),
    );
  }

  // TAB 2: Permissions (Out-Pass)
  Widget _buildPermissionsList(InstructorLeavesProvider provider) {
    final filtered = provider.permissions.where((p) {
      if (_selectedStatus == 'ALL') return true;
      return p.status.toUpperCase() == _selectedStatus;
    }).toList();

    return RefreshIndicator(
      onRefresh: () => provider.loadPermissions(refresh: true),
      color: const Color(0xFF002045),
      child: provider.isLoadingPermissions && provider.permissions.isEmpty
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF002045)))
          : filtered.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.badge_outlined, size: 44, color: Color(0xFF94A3B8)),
                      const SizedBox(height: 10),
                      Text(
                        'No out-pass permission requests found',
                        style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF64748B), fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: () => ApplyPermissionSheet.show(context),
                        icon: const Icon(Icons.add, size: 16, color: Color(0xFF002045)),
                        label: Text('Request Permission', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF002045))),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFFC4C6CF)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final item = filtered[index];
                    return _buildPermissionCard(context, provider, item);
                  },
                ),
    );
  }

  Widget _buildPermissionCard(BuildContext context, InstructorLeavesProvider provider, InstructorPermissionItem item) {
    final statusColor = _getStatusColor(item.status);
    final statusBg = _getStatusBg(item.status);
    final dateStr = item.requestDate != null ? DateFormat('MMM dd, yyyy').format(item.requestDate!) : 'Today';

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
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF4FF),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      item.passNumber,
                      style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800, color: const Color(0xFF002045)),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      item.categoryLabel,
                      style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: const Color(0xFF475569)),
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusBg,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  item.status,
                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: statusColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Timings & Duration
          Row(
            children: [
              const Icon(Icons.access_time_rounded, size: 14, color: Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text(
                '${item.departureTime}  →  ${item.expectedReturnTime}',
                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF0F172A)),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF2FF),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  item.durationHours,
                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF4F46E5)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Date and Reason
          Text(
            'Date: $dateStr',
            style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF64748B)),
          ),
          const SizedBox(height: 4),
          Text(
            item.reason,
            style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF334155)),
          ),

          if (item.adminComment != null && item.adminComment!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Text(
                'Admin Remark: ${item.adminComment}',
                style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF64748B), fontStyle: FontStyle.italic),
              ),
            ),
          ],

          if (item.status == 'PENDING') ...[
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => _confirmCancelPermission(context, provider, item.id),
                icon: const Icon(Icons.cancel_outlined, size: 14, color: Color(0xFFEF4444)),
                label: Text('Cancel Out-Pass', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFFEF4444))),
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _confirmCancelLeave(BuildContext context, InstructorLeavesProvider provider, String leaveId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Leave Request?'),
        content: const Text('Are you sure you want to cancel this pending leave application?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('No')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await provider.cancelLeave(leaveId);
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            child: const Text('Yes, Cancel', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _confirmCancelPermission(BuildContext context, InstructorLeavesProvider provider, String permissionId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Out-Pass Request?'),
        content: const Text('Are you sure you want to cancel this pending permission request?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('No')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await provider.cancelPermission(permissionId);
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            child: const Text('Yes, Cancel', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
