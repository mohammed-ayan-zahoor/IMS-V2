class FeeInstallmentModel {
  final String id;
  final String label;
  final double amount;
  final String status;
  final DateTime? dueDate;
  final DateTime? paidDate;

  FeeInstallmentModel({
    required this.id,
    required this.label,
    required this.amount,
    required this.status,
    this.dueDate,
    this.paidDate,
  });

  bool get isPaid => status.toLowerCase() == 'paid';

  factory FeeInstallmentModel.fromJson(Map<String, dynamic> json) {
    return FeeInstallmentModel(
      id: json['_id'] ?? '',
      label: json['label'] ?? json['month'] ?? 'Installment',
      amount: (json['amount'] is num) ? (json['amount'] as num).toDouble() : 0.0,
      status: json['status'] ?? 'pending',
      dueDate: json['dueDate'] != null ? DateTime.tryParse(json['dueDate']) : null,
      paidDate: json['paidDate'] != null ? DateTime.tryParse(json['paidDate']) : null,
    );
  }
}

class FeeCategoryModel {
  final String id;
  final String title;
  final String subtitle;
  final double totalAmount;
  final double paidAmount;
  final double balanceAmount;
  final List<FeeInstallmentModel> installments;

  FeeCategoryModel({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.totalAmount,
    required this.paidAmount,
    required this.balanceAmount,
    required this.installments,
  });

  double get paidPercentage {
    if (totalAmount <= 0) return 0.0;
    return (paidAmount / totalAmount).clamp(0.0, 1.0);
  }

  factory FeeCategoryModel.fromCourseFee(Map<String, dynamic> json) {
    final batch = json['batch'];
    String batchName = 'Course';
    if (batch != null) {
      final courseName = batch['course']?['name'];
      final name = batch['name'];
      if (courseName != null && name != null) {
        batchName = '$courseName - $name';
      } else if (name != null) {
        batchName = name;
      }
    }
    final installmentsList = (json['installments'] as List<dynamic>?)
            ?.map((e) => FeeInstallmentModel.fromJson(e))
            .toList() ??
        [];

    return FeeCategoryModel(
      id: json['_id'] ?? '',
      title: 'Course Fee - $batchName',
      subtitle: 'Academic Session',
      totalAmount: (json['totalAmount'] is num) ? (json['totalAmount'] as num).toDouble() : 0.0,
      paidAmount: (json['paidAmount'] is num) ? (json['paidAmount'] as num).toDouble() : 0.0,
      balanceAmount: (json['balanceAmount'] is num) ? (json['balanceAmount'] as num).toDouble() : 0.0,
      installments: installmentsList,
    );
  }

  factory FeeCategoryModel.fromTransportFee(Map<String, dynamic> json) {
    final routeName = json['route']?['name'] ?? 'Route';
    final installmentsList = (json['installments'] as List<dynamic>?)
            ?.map((e) => FeeInstallmentModel.fromJson(e))
            .toList() ??
        [];

    return FeeCategoryModel(
      id: json['_id'] ?? '',
      title: 'Transport Fee - $routeName',
      subtitle: 'Vehicle Bus Service',
      totalAmount: (json['totalAmount'] is num) ? (json['totalAmount'] as num).toDouble() : 0.0,
      paidAmount: (json['paidAmount'] is num) ? (json['paidAmount'] as num).toDouble() : 0.0,
      balanceAmount: (json['balanceAmount'] is num) ? (json['balanceAmount'] as num).toDouble() : 0.0,
      installments: installmentsList,
    );
  }

  factory FeeCategoryModel.fromHostelFee(Map<String, dynamic> json) {
    final blockName = json['block']?['name'] ?? 'Hostel Block';
    final roomNo = json['room']?['roomNumber'] ?? 'Room';
    final installmentsList = (json['installments'] as List<dynamic>?)
            ?.map((e) => FeeInstallmentModel.fromJson(e))
            .toList() ??
        [];

    return FeeCategoryModel(
      id: json['_id'] ?? '',
      title: 'Hostel Fee - $blockName ($roomNo)',
      subtitle: 'Accommodation Rent',
      totalAmount: (json['totalAmount'] is num) ? (json['totalAmount'] as num).toDouble() : 0.0,
      paidAmount: (json['paidAmount'] is num) ? (json['paidAmount'] as num).toDouble() : 0.0,
      balanceAmount: (json['balanceAmount'] is num) ? (json['balanceAmount'] as num).toDouble() : 0.0,
      installments: installmentsList,
    );
  }
}

class FeesResponse {
  final List<FeeCategoryModel> categories;

  FeesResponse({required this.categories});

  factory FeesResponse.fromJson(Map<String, dynamic> json) {
    final List<FeeCategoryModel> cats = [];

    if (json['fees'] is List) {
      for (final item in json['fees']) {
        cats.add(FeeCategoryModel.fromCourseFee(item));
      }
    }
    if (json['transportFees'] is List) {
      for (final item in json['transportFees']) {
        cats.add(FeeCategoryModel.fromTransportFee(item));
      }
    }
    if (json['hostelAllotments'] is List) {
      for (final item in json['hostelAllotments']) {
        cats.add(FeeCategoryModel.fromHostelFee(item));
      }
    }

    return FeesResponse(categories: cats);
  }
}
