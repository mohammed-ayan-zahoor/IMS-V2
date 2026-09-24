import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/instructor/leaves/data/models/instructor_leave_model.dart';

class InstructorLeavesRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<InstructorLeaveRequestItem>> fetchLeaveRequests() async {
    try {
      final res = await _apiClient.get(ApiEndpoints.leaveRequests);
      if (res.statusCode == 200 && res.data != null) {
        final list = res.data['leaveRequests'] ?? res.data;
        if (list is List) {
          return list
              .whereType<Map<String, dynamic>>()
              .map((l) => InstructorLeaveRequestItem.fromJson(l))
              .toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<List<LeaveTypeItem>> fetchLeaveTypes() async {
    try {
      final res = await _apiClient.get(ApiEndpoints.leaveTypes);
      if (res.statusCode == 200 && res.data != null) {
        final list = res.data['leaveTypes'] ?? res.data;
        if (list is List) {
          return list
              .whereType<Map<String, dynamic>>()
              .map((t) => LeaveTypeItem.fromJson(t))
              .toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<bool> applyLeave({
    required String leaveTypeId,
    required String startDate,
    required String endDate,
    required String reason,
  }) async {
    try {
      final res = await _apiClient.post(
        ApiEndpoints.leaveRequests,
        data: {
          'leaveTypeId': leaveTypeId,
          'startDate': startDate,
          'endDate': endDate,
          'reason': reason,
        },
      );
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  Future<bool> cancelLeave(String leaveRequestId) async {
    try {
      final res = await _apiClient.patch(
        ApiEndpoints.cancelLeaveRequest(leaveRequestId),
        data: {'status': 'CANCELLED'},
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
