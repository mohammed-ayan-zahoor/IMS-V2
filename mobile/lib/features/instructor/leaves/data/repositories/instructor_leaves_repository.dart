import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/instructor/leaves/data/models/instructor_leave_model.dart';
import 'package:student_app/features/instructor/leaves/data/models/instructor_permission_model.dart';

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

  Future<List<InstructorPermissionItem>> fetchPermissions() async {
    try {
      final res = await _apiClient.get(ApiEndpoints.hrPermissions);
      if (res.statusCode == 200 && res.data != null) {
        final list = res.data['permissions'] ?? res.data;
        if (list is List) {
          return list
              .whereType<Map<String, dynamic>>()
              .map((p) => InstructorPermissionItem.fromJson(p))
              .toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<bool> createPermission({
    required String recipientName,
    required String departureTime,
    required String expectedReturnTime,
    required String durationHours,
    required String category,
    required String reason,
    String? requestDate,
  }) async {
    try {
      final res = await _apiClient.post(
        ApiEndpoints.hrPermissions,
        data: {
          'recipientType': 'staff',
          'recipientName': recipientName,
          'departureTime': departureTime,
          'expectedReturnTime': expectedReturnTime,
          'durationHours': durationHours,
          'category': category,
          'reason': reason,
          'requestDate': ?requestDate,
        },
      );
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  Future<bool> cancelPermission(String id) async {
    try {
      final res = await _apiClient.patch(
        ApiEndpoints.cancelPermission(id),
        data: {'status': 'CANCELLED'},
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
