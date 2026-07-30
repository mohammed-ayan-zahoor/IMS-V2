class TimetableSlotModel {
  final String batchId;
  final String batchName;
  final String courseName;
  final String courseCode;
  final String instructor;
  final String startTime;
  final String endTime;
  final String slotName;
  final String type;
  final bool isBreak;

  TimetableSlotModel({
    required this.batchId,
    required this.batchName,
    required this.courseName,
    required this.courseCode,
    required this.instructor,
    required this.startTime,
    required this.endTime,
    required this.slotName,
    required this.type,
    required this.isBreak,
  });

  factory TimetableSlotModel.fromJson(Map<String, dynamic> json) {
    return TimetableSlotModel(
      batchId: json['batchId'] ?? '',
      batchName: json['batchName'] ?? '',
      courseName: json['courseName'] ?? 'Course',
      courseCode: json['courseCode'] ?? '',
      instructor: json['instructor'] ?? 'N/A',
      startTime: json['startTime'] ?? '00:00',
      endTime: json['endTime'] ?? '00:00',
      slotName: json['slotName'] ?? '',
      type: json['type'] ?? 'Lec',
      isBreak: json['isBreak'] ?? false,
    );
  }
}

class TimetableResponse {
  final Map<int, List<TimetableSlotModel>> weeklySchedule;
  final String studentName;

  TimetableResponse({
    required this.weeklySchedule,
    required this.studentName,
  });

  factory TimetableResponse.fromJson(Map<String, dynamic> json) {
    final Map<int, List<TimetableSlotModel>> scheduleMap = {};
    final rawTt = json['timetable'];
    if (rawTt is Map) {
      rawTt.forEach((key, val) {
        final dayInt = int.tryParse(key.toString()) ?? 0;
        if (val is List) {
          scheduleMap[dayInt] = val.map((e) => TimetableSlotModel.fromJson(e)).toList();
        }
      });
    }
    return TimetableResponse(
      weeklySchedule: scheduleMap,
      studentName: json['studentName'] ?? '',
    );
  }
}
