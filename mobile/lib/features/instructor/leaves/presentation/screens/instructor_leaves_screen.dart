import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:student_app/features/instructor/leaves/presentation/providers/instructor_leaves_provider.dart';
import 'package:student_app/features/instructor/leaves/presentation/widgets/apply_leave_sheet.dart';
import 'package:student_app/l10n/app_localizations.dart';

class InstructorLeavesScreen extends StatefulWidget {
  const InstructorLeavesScreen({super.key});

  @override
  State<InstructorLeavesScreen> createState() => _InstructorLeavesScreenState();
}

class _InstructorLeavesScreenState extends State<InstructorLeavesScreen> {
  String _selectedFilter = 'ALL';

  Color _getStatusColor(String status) {
    switch (status) {
      case 'APPROVED':
        return const Color(0xFF10B981);
      case 'REJECTED':
        return const Color(0xFFEF4444);
      case 'CANCELLED':
        return const Color(0xFF64748B);
      case 'PENDING':
      default:
        return const Color(0xFFF59E0B);
    }
  }

  Color _getStatusBg(String status) {
    switch (status) {
      case 'APPROVED':
        return const Color(0xFFECFDF5);
      case 'REJECTED':
        return const Color(0xFFFEF2F2);
      case 'CANCELLED':
        return const Color(0xFFF1F5F9);
      case 'PENDING':
      default:
        return const Color(0xFFFFFBEB);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InstructorLeavesProvider>();
    final l10n = AppLocalizations.of(context);

    final filtered = provider.leaveRequests.where((r) {
      if (_selectedFilter == 'ALL') return true;
      return r.status == _selectedFilter;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          l10n?.leaveRequestsTitle ?? 'My Leave Requests',
          style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF0F172A), fontSize: 17),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: ElevatedButton.icon(
              onPressed: () => ApplyLeaveSheet.show(context),
              icon: const Icon(Icons.add_rounded, size: 16, color: Colors.white),
              label: Text(
                l10n?.applyLeave ?? 'Apply',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF002045),
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs Bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
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
          const Divider(height: 1, color: Color(0xFFE2E8F0)),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => provider.loadLeaves(refresh: true),
              color: const Color(0xFF002045),
              child: provider.isLoading && provider.leaveRequests.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : filtered.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.time_to_leave_outlined, size: 48, color: Color(0xFF94A3B8)),
                              const SizedBox(height: 10),
                              Text(
                                l10n?.emptyState ?? 'No leave requests found',
                                style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: filtered.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final request = filtered[index];
                            final statusColor = _getStatusColor(request.status);
                            final statusBg = _getStatusBg(request.status);
                            final isPending = request.status == 'PENDING';

                            final start = request.startDate.length > 10 ? request.startDate.substring(0, 10) : request.startDate;
                            final end = request.endDate.length > 10 ? request.endDate.substring(0, 10) : request.endDate;

                            return Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: const Color(0xFFF1F5F9)),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.02),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
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
                                        request.leaveTypeName,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFF0F172A),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: statusBg,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          request.status,
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                            color: statusColor,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      const Icon(Icons.date_range_rounded, size: 14, color: Color(0xFF64748B)),
                                      const SizedBox(width: 6),
                                      Text(
                                        '$start  →  $end',
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                                      ),
                                    ],
                                  ),
                                  if (request.reason != null && request.reason!.isNotEmpty) ...[
                                    const SizedBox(height: 8),
                                    Text(
                                      request.reason!,
                                      style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                                    ),
                                  ],
                                  if (isPending) ...[
                                    const SizedBox(height: 12),
                                    const Divider(height: 1, color: Color(0xFFF1F5F9)),
                                    const SizedBox(height: 8),
                                    Align(
                                      alignment: Alignment.centerRight,
                                      child: OutlinedButton(
                                        onPressed: () async {
                                          final confirmed = await showDialog<bool>(
                                            context: context,
                                            builder: (ctx) => AlertDialog(
                                              title: const Text('Cancel Leave Request?'),
                                              content: const Text('Are you sure you want to cancel this pending leave?'),
                                              actions: [
                                                TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
                                                TextButton(
                                                  onPressed: () => Navigator.pop(ctx, true),
                                                  child: const Text('Yes, Cancel', style: TextStyle(color: Colors.red)),
                                                ),
                                              ],
                                            ),
                                          );
                                          if (confirmed == true) {
                                            provider.cancelLeave(request.id);
                                          }
                                        },
                                        style: OutlinedButton.styleFrom(
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                          side: const BorderSide(color: Color(0xFFEF4444)),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                        ),
                                        child: Text(
                                          l10n?.cancelLeave ?? 'Cancel Leave',
                                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFEF4444)),
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTab(String key, String label) {
    final isSelected = _selectedFilter == key;
    return InkWell(
      onTap: () => setState(() => _selectedFilter = key),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF002045) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }
}
