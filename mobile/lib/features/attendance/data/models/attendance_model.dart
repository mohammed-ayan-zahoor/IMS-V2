class AttendanceModel {
  final String id;
  final DateTime date;
  final String batchId;
  final String batchName;
  final String status;
  final String topic;

  AttendanceModel({
    required this.id,
    required this.date,
    required this.batchId,
    required this.batchName,
    required this.status,
    required this.topic,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    return AttendanceModel(
      id: json['_id'] ?? '',
      date: json['date'] != null ? DateTime.parse(json['date']).toLocal() : DateTime.now(),
      batchId: json['batchId'] ?? '',
      batchName: json['batchName'] ?? 'Unknown Batch',
      status: json['status'] ?? 'absent',
      topic: json['topic'] ?? '-',
    );
  }
}

class AttendanceStatsModel {
  final int present;
  final int absent;
  final int late;
  final int excused;
  final int holiday;
  final int total;
  final int rate;

  AttendanceStatsModel({
    required this.present,
    required this.absent,
    required this.late,
    required this.excused,
    required this.holiday,
    required this.total,
    required this.rate,
  });

  factory AttendanceStatsModel.fromJson(Map<String, dynamic> json) {
    return AttendanceStatsModel(
      present: json['present'] ?? 0,
      absent: json['absent'] ?? 0,
      late: json['late'] ?? 0,
      excused: json['excused'] ?? 0,
      holiday: json['holiday'] ?? 0,
      total: json['total'] ?? 0,
      rate: json['rate'] ?? 0,
    );
  }
}

class AttendanceResponse {
  final List<AttendanceModel> history;
  final AttendanceStatsModel stats;
  final int totalCount;
  final int totalPages;

  AttendanceResponse({
    required this.history,
    required this.stats,
    required this.totalCount,
    required this.totalPages,
  });

  factory AttendanceResponse.fromJson(Map<String, dynamic> json) {
    return AttendanceResponse(
      history: (json['history'] as List<dynamic>?)
              ?.map((e) => AttendanceModel.fromJson(e))
              .toList() ??
          [],
      stats: AttendanceStatsModel.fromJson(json['stats'] ?? {}),
      totalCount: json['pagination']?['totalCount'] ?? 0,
      totalPages: json['pagination']?['totalPages'] ?? 1,
    );
  }
}
