import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:student_app/features/fees/presentation/providers/fees_provider.dart';
import 'package:student_app/features/fees/data/models/fees_model.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/core/providers/academic_session_provider.dart';

class FeesScreen extends StatefulWidget {
  const FeesScreen({super.key});

  @override
  State<FeesScreen> createState() => _FeesScreenState();
}

class _FeesScreenState extends State<FeesScreen> {
  String? _lastSessionId;
  final NumberFormat _currencyFormat = NumberFormat.currency(
    symbol: '₹',
    decimalDigits: 0,
    locale: 'en_IN',
  );

  @override
  Widget build(BuildContext context) {
    final sessionProv = Provider.of<AcademicSessionProvider>(context);
    final feesProviderListen = Provider.of<FeesProvider>(context, listen: false);

    if (sessionProv.selectedSessionId != null && sessionProv.selectedSessionId != _lastSessionId) {
      _lastSessionId = sessionProv.selectedSessionId;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        feesProviderListen.loadFees(refresh: true, sessionId: _lastSessionId);
      });
    }

    return Consumer2<AuthProvider, FeesProvider>(
      builder: (context, auth, feesProvider, _) {
        final user = auth.user;
        final avatarUrl = user?['image'] ?? user?['profile']?['avatar'] ?? '';
        final name = user?['name'] ?? 'Student';

        return Scaffold(
          backgroundColor: const Color(0xFFF8F9FF),
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Color(0xFF002045)),
              onPressed: () => Navigator.of(context).pop(),
            ),
            titleSpacing: 0,
            title: Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFF002045),
                    border: Border.all(
                      color: const Color(0xFFC4C6CF),
                      width: 1,
                    ),
                  ),
                  child: ClipOval(
                    child: avatarUrl.isNotEmpty
                        ? Image.network(
                            avatarUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => _buildInitialsAvatar(name),
                          )
                        : _buildInitialsAvatar(name),
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  'Fees & Payments',
                  style: GoogleFonts.hankenGrotesk(
                    color: const Color(0xFF002045),
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          body: SafeArea(
            child: RefreshIndicator(
              onRefresh: () => feesProvider.loadFees(refresh: true),
              child: feesProvider.isLoading
                  ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
                  : feesProvider.categories.isEmpty
                      ? _buildEmptyState()
                      : ListView.separated(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(16.0),
                          itemCount: feesProvider.categories.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 16),
                          itemBuilder: (context, index) {
                            final category = feesProvider.categories[index];
                            return _buildCategoryFeeCard(context, feesProvider, category);
                          },
                        ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildInitialsAvatar(String name) {
    final initials = name.trim().isNotEmpty
        ? name.trim().split(' ').map((e) => e[0]).take(2).join('').toUpperCase()
        : 'ST';
    return Center(
      child: Text(
        initials,
        style: GoogleFonts.hankenGrotesk(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return ListView(
      children: [
        SizedBox(height: MediaQuery.of(context).size.height * 0.25),
        Center(
          child: Column(
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(
                  color: Color(0xFFEFF4FF),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.receipt_long,
                  color: Color(0xFF002045),
                  size: 32,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'No Fee Statements Found',
                style: GoogleFonts.hankenGrotesk(
                  color: const Color(0xFF0D1C2E),
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'You have no active fee ledgers assigned.',
                style: GoogleFonts.inter(
                  color: const Color(0xFF545F72),
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCategoryFeeCard(BuildContext context, FeesProvider feesProvider, FeeCategoryModel category) {
    final bool isAutopay = feesProvider.isAutopayEnabled(category.id);
    final double pct = category.paidPercentage;
    final int pctInt = (pct * 100).round();

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFC4C6CF)),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          )
        ],
      ),
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      category.title,
                      style: GoogleFonts.hankenGrotesk(
                        color: const Color(0xFF0D1C2E),
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      category.subtitle,
                      style: GoogleFonts.inter(
                        color: const Color(0xFF545F72),
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              TextButton.icon(
                onPressed: () => _showReceiptsModal(context, category),
                icon: const Icon(Icons.receipt_long, size: 16, color: Color(0xFF002045)),
                label: Text(
                  'Receipts',
                  style: GoogleFonts.inter(
                    color: const Color(0xFF002045),
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Financial Bento Grid (2 columns)
          Row(
            children: [
              // Total Due Card
              Expanded(
                child: Container(
                  height: 76,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF4FF),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Total Due',
                        style: GoogleFonts.inter(
                          color: const Color(0xFF545F72),
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _currencyFormat.format(category.balanceAmount),
                        style: GoogleFonts.hankenGrotesk(
                          color: category.balanceAmount > 0 ? const Color(0xFFBA1A1A) : const Color(0xFF137333),
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Total & Paid Cards
              Expanded(
                child: Column(
                  children: [
                    _buildMiniSummary('Total', _currencyFormat.format(category.totalAmount), const Color(0xFF0D1C2E)),
                    const SizedBox(height: 8),
                    _buildMiniSummary('Paid', _currencyFormat.format(category.paidAmount), const Color(0xFF002045)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Progress & Autopay Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$pctInt% Paid',
                style: GoogleFonts.inter(
                  color: const Color(0xFF545F72),
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
              GestureDetector(
                onTap: () => feesProvider.toggleAutopay(category.id),
                child: Text(
                  isAutopay ? 'Autopay Enabled' : 'Enable Autopay',
                  style: GoogleFonts.inter(
                    color: const Color(0xFF002045),
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          // Progress Bar
          Container(
            height: 8,
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFFD4E4FC),
              borderRadius: BorderRadius.circular(9999),
            ),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: pct,
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF002045),
                  borderRadius: BorderRadius.circular(9999),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Divider(color: Color(0xFFC4C6CF), thickness: 0.5),
          const SizedBox(height: 12),

          // Installments Section
          Text(
            'INSTALLMENTS SCHEDULE',
            style: GoogleFonts.inter(
              color: const Color(0xFF545F72),
              fontSize: 10,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 8),

          if (category.installments.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              child: Text(
                'No installments scheduled.',
                style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 12),
              ),
            )
          else
            ...category.installments.take(3).map((inst) {
              String dateStr = inst.label;
              if (inst.dueDate != null) {
                dateStr = DateFormat('MMM d').format(inst.dueDate!);
              }

              return _buildInstallmentRow(
                date: dateStr,
                status: inst.isPaid ? 'Paid' : 'Pending',
                amount: _currencyFormat.format(inst.amount),
                isPaid: inst.isPaid,
                isUpcoming: !inst.isPaid,
              );
            }),

          const SizedBox(height: 12),

          // View all installments button
          if (category.installments.length > 3)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => _showAllInstallmentsModal(context, category),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFC4C6CF)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: Text(
                  'View all ${category.installments.length} installments',
                  style: GoogleFonts.inter(
                    color: const Color(0xFF545F72),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  // Mini summary card (Total, Paid)
  Widget _buildMiniSummary(String label, String value, Color textColor) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF4FF),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
              color: const Color(0xFF545F72),
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: GoogleFonts.hankenGrotesk(
              color: textColor,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  // Installment Row Builder
  Widget _buildInstallmentRow({
    required String date,
    required String status,
    required String amount,
    required bool isPaid,
    bool isUpcoming = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isPaid
                      ? const Color(0xFF137333)
                      : isUpcoming
                          ? const Color(0xFFE37400)
                          : const Color(0xFFBA1A1A),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                date,
                style: GoogleFonts.inter(
                  color: const Color(0xFF0D1C2E),
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isPaid
                      ? const Color(0xFFE6F4EA)
                      : isUpcoming
                          ? const Color(0xFFFEF7E0)
                          : const Color(0xFFFCE8E6),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  status,
                  style: GoogleFonts.inter(
                    color: isPaid
                        ? const Color(0xFF137333)
                        : isUpcoming
                            ? const Color(0xFFE37400)
                            : const Color(0xFFBA1A1A),
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          Text(
            amount,
            style: GoogleFonts.hankenGrotesk(
              color: const Color(0xFF0D1C2E),
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  void _showAllInstallmentsModal(BuildContext context, FeeCategoryModel category) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.65,
          maxChildSize: 0.9,
          minChildSize: 0.4,
          builder: (context, scrollController) {
            return Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
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
                  Text(
                    'Installments Breakup',
                    style: GoogleFonts.hankenGrotesk(
                      color: const Color(0xFF0D1C2E),
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    category.title,
                    style: GoogleFonts.inter(
                      color: const Color(0xFF545F72),
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: ListView.separated(
                      controller: scrollController,
                      itemCount: category.installments.length,
                      separatorBuilder: (_, __) => const Divider(color: Color(0xFFC4C6CF), thickness: 0.5),
                      itemBuilder: (context, index) {
                        final inst = category.installments[index];
                        String dateStr = inst.label;
                        if (inst.dueDate != null) {
                          dateStr = DateFormat('EEE, MMM d, yyyy').format(inst.dueDate!);
                        }

                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    inst.label,
                                    style: GoogleFonts.hankenGrotesk(
                                      color: const Color(0xFF0D1C2E),
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Due: $dateStr',
                                    style: GoogleFonts.inter(
                                      color: const Color(0xFF545F72),
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    _currencyFormat.format(inst.amount),
                                    style: GoogleFonts.hankenGrotesk(
                                      color: const Color(0xFF0D1C2E),
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: inst.isPaid ? const Color(0xFFE6F4EA) : const Color(0xFFFCE8E6),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      inst.status.toUpperCase(),
                                      style: GoogleFonts.inter(
                                        color: inst.isPaid ? const Color(0xFF137333) : const Color(0xFFBA1A1A),
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
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
              ),
            );
          },
        );
      },
    );
  }

  void _showReceiptsModal(BuildContext context, FeeCategoryModel category) {
    final paidInstallments = category.installments.where((e) => e.isPaid).toList();

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20.0),
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
              Text(
                'Paid Fee Receipts',
                style: GoogleFonts.hankenGrotesk(
                  color: const Color(0xFF0D1C2E),
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                category.title,
                style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 12),
              ),
              const SizedBox(height: 16),
              if (paidInstallments.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24.0),
                  child: Center(
                    child: Text(
                      'No completed payment receipts found.',
                      style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 13),
                    ),
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: paidInstallments.length,
                  separatorBuilder: (_, __) => const Divider(color: Color(0xFFC4C6CF), thickness: 0.5),
                  itemBuilder: (context, index) {
                    final inst = paidInstallments[index];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Container(
                        width: 40,
                        height: 40,
                        decoration: const BoxDecoration(
                          color: Color(0xFFE6F4EA),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.check_circle, color: Color(0xFF137333), size: 22),
                      ),
                      title: Text(
                        inst.label,
                        style: GoogleFonts.hankenGrotesk(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      subtitle: Text(
                        inst.paidDate != null ? DateFormat('dd MMM yyyy').format(inst.paidDate!) : 'Payment Completed',
                        style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF545F72)),
                      ),
                      trailing: Text(
                        _currencyFormat.format(inst.amount),
                        style: GoogleFonts.hankenGrotesk(fontWeight: FontWeight.bold, fontSize: 15, color: const Color(0xFF002045)),
                      ),
                    );
                  },
                ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }
}
