class LibraryLoanModel {
  final String id;
  final String bookTitle;
  final List<String> authors;
  final String? coverUrl;
  final String accessionNumber;
  final String shelfLocation;
  final DateTime issuedAt;
  final DateTime dueDate;
  final bool isOverdue;
  final int daysRemaining;
  final double fineAmount;
  final bool finePaid;
  final int renewalsCount;

  LibraryLoanModel({
    required this.id,
    required this.bookTitle,
    required this.authors,
    this.coverUrl,
    required this.accessionNumber,
    required this.shelfLocation,
    required this.issuedAt,
    required this.dueDate,
    required this.isOverdue,
    required this.daysRemaining,
    required this.fineAmount,
    required this.finePaid,
    required this.renewalsCount,
  });

  factory LibraryLoanModel.fromJson(Map<String, dynamic> json) {
    return LibraryLoanModel(
      id: json['id'] ?? '',
      bookTitle: json['bookTitle'] ?? 'Untitled Book',
      authors: (json['authors'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      coverUrl: json['coverUrl'],
      accessionNumber: json['accessionNumber'] ?? 'N/A',
      shelfLocation: json['shelfLocation'] ?? '',
      issuedAt: json['issuedAt'] != null ? DateTime.parse(json['issuedAt']) : DateTime.now(),
      dueDate: json['dueDate'] != null ? DateTime.parse(json['dueDate']) : DateTime.now(),
      isOverdue: json['isOverdue'] ?? false,
      daysRemaining: (json['daysRemaining'] is num) ? (json['daysRemaining'] as num).toInt() : 0,
      fineAmount: (json['fineAmount'] is num) ? (json['fineAmount'] as num).toDouble() : 0.0,
      finePaid: json['finePaid'] ?? false,
      renewalsCount: (json['renewalsCount'] is num) ? (json['renewalsCount'] as num).toInt() : 0,
    );
  }
}

class LibraryHoldModel {
  final String id;
  final String bookTitle;
  final List<String> authors;
  final String? coverUrl;
  final String status;
  final DateTime? requestedAt;
  final DateTime? readyAt;
  final DateTime? expiresAt;

  LibraryHoldModel({
    required this.id,
    required this.bookTitle,
    required this.authors,
    this.coverUrl,
    required this.status,
    this.requestedAt,
    this.readyAt,
    this.expiresAt,
  });

  factory LibraryHoldModel.fromJson(Map<String, dynamic> json) {
    return LibraryHoldModel(
      id: json['id'] ?? '',
      bookTitle: json['bookTitle'] ?? 'Untitled Book',
      authors: (json['authors'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      coverUrl: json['coverUrl'],
      status: json['status'] ?? 'waiting',
      requestedAt: json['requestedAt'] != null ? DateTime.tryParse(json['requestedAt']) : null,
      readyAt: json['readyAt'] != null ? DateTime.tryParse(json['readyAt']) : null,
      expiresAt: json['expiresAt'] != null ? DateTime.tryParse(json['expiresAt']) : null,
    );
  }
}

class LibraryStatsModel {
  final int activeLoansCount;
  final int maxBooks;
  final int overdueCount;
  final double totalFines;
  final bool canBorrow;

  LibraryStatsModel({
    required this.activeLoansCount,
    required this.maxBooks,
    required this.overdueCount,
    required this.totalFines,
    required this.canBorrow,
  });

  factory LibraryStatsModel.fromJson(Map<String, dynamic> json) {
    return LibraryStatsModel(
      activeLoansCount: (json['activeLoansCount'] is num) ? (json['activeLoansCount'] as num).toInt() : 0,
      maxBooks: (json['maxBooks'] is num) ? (json['maxBooks'] as num).toInt() : 3,
      overdueCount: (json['overdueCount'] is num) ? (json['overdueCount'] as num).toInt() : 0,
      totalFines: (json['totalFines'] is num) ? (json['totalFines'] as num).toDouble() : 0.0,
      canBorrow: json['canBorrow'] ?? true,
    );
  }
}

class LibraryDataModel {
  final List<LibraryLoanModel> loans;
  final List<LibraryHoldModel> holds;
  final LibraryStatsModel stats;

  LibraryDataModel({
    required this.loans,
    required this.holds,
    required this.stats,
  });

  factory LibraryDataModel.fromJson(Map<String, dynamic> json) {
    return LibraryDataModel(
      loans: (json['loans'] as List<dynamic>?)
              ?.map((e) => LibraryLoanModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      holds: (json['holds'] as List<dynamic>?)
              ?.map((e) => LibraryHoldModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      stats: json['stats'] != null
          ? LibraryStatsModel.fromJson(json['stats'] as Map<String, dynamic>)
          : LibraryStatsModel(
              activeLoansCount: 0,
              maxBooks: 3,
              overdueCount: 0,
              totalFines: 0.0,
              canBorrow: true,
            ),
    );
  }
}
