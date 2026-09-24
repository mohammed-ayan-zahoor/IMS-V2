class LeaveTypeItem {
  final String id;
  final String name;
  final String code;

  LeaveTypeItem({
    required this.id,
    required this.name,
    required this.code,
  });

  factory LeaveTypeItem.fromJson(Map<String, dynamic> json) {
    return LeaveTypeItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? 'Leave').toString(),
      code: (json['code'] ?? 'LV').toString(),
    );
  }
}

class InstructorLeaveRequestItem {
  final String id;
  final String leaveTypeName;
  final String startDate;
  final String endDate;
  final String? reason;
  final String status; // 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
  final String? adminComment;

  InstructorLeaveRequestItem({
    required this.id,
    required this.leaveTypeName,
    required this.startDate,
    required this.endDate,
    this.reason,
    required this.status,
    this.adminComment,
  });

  factory InstructorLeaveRequestItem.fromJson(Map<String, dynamic> json) {
    String typeName = 'General Leave';
    if (json['leaveType'] is Map) {
      typeName = json['leaveType']['name']?.toString() ?? 'General Leave';
    } else if (json['leaveTypeName'] != null) {
      typeName = json['leaveTypeName'].toString();
    }

    return InstructorLeaveRequestItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      leaveTypeName: typeName,
      startDate: (json['startDate'] ?? '').toString(),
      endDate: (json['endDate'] ?? '').toString(),
      reason: json['reason']?.toString(),
      status: (json['status'] ?? 'PENDING').toString().toUpperCase(),
      adminComment: json['adminComment']?.toString(),
    );
  }
}
