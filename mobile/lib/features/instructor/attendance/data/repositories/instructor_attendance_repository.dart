import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/instructor/attendance/data/models/batch_attendance_model.dart';
import 'package:student_app/features/instructor/dashboard/data/models/instructor_dashboard_model.dart';

class InstructorAttendanceRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<InstructorBatchSummary>> fetchAssignedBatches() async {
    try {
      final res = await _apiClient.get(ApiEndpoints.instructorBatches);
      if (res.statusCode == 200 && res.data != null) {
        List<dynamic> list = [];
        if (res.data is List) {
          list = res.data;
        } else if (res.data['batches'] is List) {
          list = res.data['batches'];
        }
        return list
            .whereType<Map<String, dynamic>>()
            .map((b) => InstructorBatchSummary.fromJson(b))
            .toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<List<StudentRosterItem>> fetchBatchStudents(String batchId) async {
    try {
      final res = await _apiClient.get('${ApiEndpoints.instructorBatches}/$batchId');
      if (res.statusCode == 200 && res.data != null) {
        final data = res.data is Map ? (res.data['batch'] ?? res.data) : res.data;
        if (data != null && data['enrolledStudents'] is List) {
          return (data['enrolledStudents'] as List)
              .whereType<Map<String, dynamic>>()
              .map((s) => StudentRosterItem.fromJson(s))
              .toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<Map<String, String>> fetchExistingAttendance(String batchId, String date) async {
    try {
      final res = await _apiClient.get(
        ApiEndpoints.batchAttendance,
        queryParameters: {
          'batchId': batchId,
          'date': date,
        },
      );
      final Map<String, String> statusMap = {};
      if (res.statusCode == 200 && res.data != null) {
        final records = res.data['records'];
        if (records is List) {
          for (var r in records) {
            if (r is Map) {
              final studentId = r['student'] is Map
                  ? r['student']['_id']?.toString()
                  : r['student']?.toString() ?? r['studentId']?.toString();
              final status = r['status']?.toString();
              if (studentId != null && status != null) {
                statusMap[studentId] = status.toLowerCase();
              }
            }
          }
        }
      }
      return statusMap;
    } catch (_) {
      return {};
    }
  }

  Future<bool> saveBatchAttendance({
    required String batchId,
    required String date,
    required List<BatchAttendanceRecord> records,
  }) async {
    try {
      final res = await _apiClient.post(
        ApiEndpoints.batchAttendance,
        data: {
          'batchId': batchId,
          'date': date,
          'records': records.map((r) => r.toJson()).toList(),
        },
      );
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }
}
