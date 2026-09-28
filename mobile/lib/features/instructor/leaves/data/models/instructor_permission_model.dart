class InstructorPermissionItem {
  final String id;
  final String passNumber;
  final String recipientType;
  final String recipientName;
  final String departureTime;
  final String expectedReturnTime;
  final String durationHours;
  final String category;
  final String reason;
  final String status; // 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'DEPARTED', 'COMPLETED'
  final DateTime? requestDate;
  final String? adminComment;
  final String? approvedByName;
  final DateTime? createdAt;

  InstructorPermissionItem({
    required this.id,
    required this.passNumber,
    required this.recipientType,
    required this.recipientName,
    required this.departureTime,
    required this.expectedReturnTime,
    required this.durationHours,
    required this.category,
    required this.reason,
    required this.status,
    this.requestDate,
    this.adminComment,
    this.approvedByName,
    this.createdAt,
  });

  factory InstructorPermissionItem.fromJson(Map<String, dynamic> json) {
    String? approver;
    if (json['approvedBy'] is Map) {
      final p = json['approvedBy']['profile'];
      if (p is Map) {
        approver = '${p['firstName'] ?? ''} ${p['lastName'] ?? ''}'.trim();
      }
      if (approver == null || approver.isEmpty) {
        approver = json['approvedBy']['name']?.toString();
      }
    }

    DateTime? reqDate;
    if (json['requestDate'] != null) {
      reqDate = DateTime.tryParse(json['requestDate'].toString());
    }

    DateTime? created;
    if (json['createdAt'] != null) {
      created = DateTime.tryParse(json['createdAt'].toString());
    }

    return InstructorPermissionItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      passNumber: (json['passNumber'] ?? 'GP-PASS').toString(),
      recipientType: (json['recipientType'] ?? 'staff').toString(),
      recipientName: (json['recipientName'] ?? '').toString(),
      departureTime: (json['departureTime'] ?? '').toString(),
      expectedReturnTime: (json['expectedReturnTime'] ?? '').toString(),
      durationHours: (json['durationHours'] ?? '1 hour').toString(),
      category: (json['category'] ?? 'personal_errand').toString(),
      reason: (json['reason'] ?? '').toString(),
      status: (json['status'] ?? 'PENDING').toString().toUpperCase(),
      requestDate: reqDate,
      adminComment: json['adminComment']?.toString(),
      approvedByName: approver,
      createdAt: created,
    );
  }

  String get categoryLabel {
    switch (category.toLowerCase()) {
      case 'personal_errand':
        return 'Personal Errand';
      case 'official_work':
        return 'Official Work';
      case 'emergency':
        return 'Emergency';
      case 'medical':
        return 'Medical';
      default:
        return category.replaceAll('_', ' ').toUpperCase();
    }
  }
}
