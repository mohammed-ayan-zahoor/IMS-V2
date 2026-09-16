import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:student_app/features/library/presentation/providers/library_provider.dart';
import 'package:student_app/features/library/data/models/library_model.dart';
import 'package:student_app/core/auth/auth_provider.dart';

class MyLibraryScreen extends StatefulWidget {
  const MyLibraryScreen({super.key});

  @override
  State<MyLibraryScreen> createState() => _MyLibraryScreenState();
}

class _MyLibraryScreenState extends State<MyLibraryScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        Provider.of<LibraryProvider>(context, listen: false).loadLibrary(refresh: true);
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<AuthProvider, LibraryProvider>(
      builder: (context, auth, libProvider, _) {
        final stats = libProvider.stats;
        final activeLoans = libProvider.loans;
        final holds = libProvider.holds;

        return Scaffold(
          backgroundColor: const Color(0xFFF8F9FF),
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0.5,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Color(0xFF002045)),
              onPressed: () => Navigator.pop(context),
            ),
            title: Text(
              'Digital Library Card',
              style: GoogleFonts.hankenGrotesk(
                color: const Color(0xFF002045),
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            bottom: TabBar(
              controller: _tabController,
              labelColor: const Color(0xFF002045),
              unselectedLabelColor: const Color(0xFF545F72),
              indicatorColor: const Color(0xFF002045),
              indicatorWeight: 3,
              labelStyle: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13),
              tabs: [
                Tab(text: 'Borrowed (${activeLoans.length})'),
                Tab(text: 'Holds (${holds.length})'),
              ],
            ),
          ),
          body: libProvider.isLoading
              ? const Center(child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF002045)))
              : RefreshIndicator(
                  onRefresh: () => libProvider.loadLibrary(refresh: true),
                  color: const Color(0xFF002045),
                  child: Column(
                    children: [
                      // Top Patron Status Strip
                      _buildPatronSummaryStrip(stats),

                      // Tabs Content
                      Expanded(
                        child: TabBarView(
                          controller: _tabController,
                          children: [
                            _buildLoansTab(activeLoans),
                            _buildHoldsTab(holds),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
        );
      },
    );
  }

  Widget _buildPatronSummaryStrip(LibraryStatsModel? stats) {
    final active = stats?.activeLoansCount ?? 0;
    final max = stats?.maxBooks ?? 3;
    final overdue = stats?.overdueCount ?? 0;
    final fines = stats?.totalFines ?? 0.0;

    return Container(
      margin: const EdgeInsets.all(16.0),
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFC4C6CF)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatMetric(
            'BORROWED',
            '$active / $max',
            Icons.book_outlined,
            const Color(0xFF002045),
          ),
          Container(width: 1, height: 36, color: const Color(0xFFE2E8F0)),
          _buildStatMetric(
            'OVERDUE',
            '$overdue',
            Icons.warning_amber_rounded,
            overdue > 0 ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
          ),
          Container(width: 1, height: 36, color: const Color(0xFFE2E8F0)),
          _buildStatMetric(
            'FINES DUE',
            '₹${fines.toStringAsFixed(0)}',
            Icons.receipt_outlined,
            fines > 0 ? const Color(0xFFDC2626) : const Color(0xFF545F72),
          ),
        ],
      ),
    );
  }

  Widget _buildStatMetric(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF545F72),
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: GoogleFonts.hankenGrotesk(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildLoansTab(List<LibraryLoanModel> loans) {
    if (loans.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF4FF),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.menu_book_outlined, size: 40, color: Color(0xFF002045)),
            ),
            const SizedBox(height: 12),
            Text(
              'No Books Borrowed',
              style: GoogleFonts.hankenGrotesk(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF002045),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Visit the campus library circulation desk to check out books.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF545F72)),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: loans.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final loan = loans[index];
        final dueStr = DateFormat('dd MMM yyyy').format(loan.dueDate);

        Color badgeBg = const Color(0xFFF0FDF4);
        Color badgeBorder = const Color(0xFF86EFAC);
        Color badgeText = const Color(0xFF16A34A);
        String badgeLabel = 'Due in ${loan.daysRemaining} days';

        if (loan.isOverdue) {
          badgeBg = const Color(0xFFFEF2F2);
          badgeBorder = const Color(0xFFFECACA);
          badgeText = const Color(0xFFDC2626);
          badgeLabel = 'Overdue by ${loan.daysRemaining.abs()} days';
        } else if (loan.daysRemaining <= 2) {
          badgeBg = const Color(0xFFFFFBEB);
          badgeBorder = const Color(0xFFFDE68A);
          badgeText = const Color(0xFFD97706);
          badgeLabel = loan.daysRemaining == 0 ? 'Due Today' : 'Due in ${loan.daysRemaining}d';
        }

        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: loan.isOverdue ? const Color(0xFFFCA5A5) : const Color(0xFFC4C6CF),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Book Icon / Cover
              Container(
                width: 48,
                height: 64,
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF4FF),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFC4C6CF).withValues(alpha: 0.5)),
                ),
                child: loan.coverUrl != null && loan.coverUrl!.isNotEmpty
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(5),
                        child: Image.network(loan.coverUrl!, fit: BoxFit.cover),
                      )
                    : const Center(
                        child: Icon(Icons.book, color: Color(0xFF002045), size: 28),
                      ),
              ),
              const SizedBox(width: 14),

              // Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      loan.bookTitle,
                      style: GoogleFonts.hankenGrotesk(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF0D1C2E),
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (loan.authors.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        'By ${loan.authors.join(', ')}',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: const Color(0xFF545F72),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 8),

                    // Accession & Shelf
                    Row(
                      children: [
                        Text(
                          'Acc: ${loan.accessionNumber}',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF002045),
                          ),
                        ),
                        if (loan.shelfLocation.isNotEmpty) ...[
                          const SizedBox(width: 8),
                          Text(
                            '•  Shelf: ${loan.shelfLocation}',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: const Color(0xFF545F72),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Due Date Pill
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: badgeBg,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: badgeBorder),
                          ),
                          child: Text(
                            badgeLabel,
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: badgeText,
                            ),
                          ),
                        ),
                        const Spacer(),
                        Text(
                          'Due: $dueStr',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: const Color(0xFF545F72),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHoldsTab(List<LibraryHoldModel> holds) {
    if (holds.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF4FF),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.bookmark_border_rounded, size: 40, color: Color(0xFF002045)),
            ),
            const SizedBox(height: 12),
            Text(
              'No Book Reservations',
              style: GoogleFonts.hankenGrotesk(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF002045),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'When a book is checked out by others, you can reserve it at the desk.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF545F72)),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: holds.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final hold = holds[index];
        final isReady = hold.status == 'ready';

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isReady ? const Color(0xFF86EFAC) : const Color(0xFFC4C6CF),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      hold.bookTitle,
                      style: GoogleFonts.hankenGrotesk(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF0D1C2E),
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: isReady ? const Color(0xFFDCFCE7) : const Color(0xFFEFF4FF),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      isReady ? 'READY FOR PICKUP' : 'IN QUEUE',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: isReady ? const Color(0xFF15803D) : const Color(0xFF002045),
                      ),
                    ),
                  ),
                ],
              ),
              if (hold.authors.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  'By ${hold.authors.join(', ')}',
                  style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF545F72)),
                ),
              ],
              if (isReady && hold.expiresAt != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF86EFAC)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_outline, size: 16, color: Color(0xFF16A34A)),
                      const SizedBox(width: 6),
                      Text(
                        'Hold expires: ${DateFormat('dd MMM yyyy').format(hold.expiresAt!)}',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF15803D),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
