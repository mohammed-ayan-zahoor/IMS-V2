import 'package:flutter/material.dart';
import 'package:student_app/features/instructor/leaves/data/models/instructor_leave_model.dart';
import 'package:student_app/features/instructor/leaves/data/models/instructor_permission_model.dart';
import 'package:student_app/features/instructor/leaves/data/repositories/instructor_leaves_repository.dart';

class InstructorLeavesProvider extends ChangeNotifier {
  final InstructorLeavesRepository _repository = InstructorLeavesRepository();

  bool _isLoading = false;
  String? _errorMessage;
  List<InstructorLeaveRequestItem> _leaveRequests = [];
  List<LeaveTypeItem> _leaveTypes = [];

  List<InstructorPermissionItem> _permissions = [];
  bool _isLoadingPermissions = false;

  bool get isLoading => _isLoading;
  bool get isLoadingPermissions => _isLoadingPermissions;
  String? get errorMessage => _errorMessage;
  List<InstructorLeaveRequestItem> get leaveRequests => _leaveRequests;
  List<LeaveTypeItem> get leaveTypes => _leaveTypes;
  List<InstructorPermissionItem> get permissions => _permissions;

  InstructorLeavesProvider() {
    loadLeaves();
    loadPermissions();
  }

  Future<void> loadLeaves({bool refresh = false}) async {
    if (_leaveRequests.isNotEmpty && !refresh) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final reqsFuture = _repository.fetchLeaveRequests();
      final typesFuture = _repository.fetchLeaveTypes();

      final results = await Future.wait([reqsFuture, typesFuture]);
      _leaveRequests = results[0] as List<InstructorLeaveRequestItem>;
      _leaveTypes = results[1] as List<LeaveTypeItem>;
    } catch (e) {
      _errorMessage = 'Failed to load leave requests.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadPermissions({bool refresh = false}) async {
    if (_permissions.isNotEmpty && !refresh) return;

    _isLoadingPermissions = true;
    notifyListeners();

    try {
      _permissions = await _repository.fetchPermissions();
    } catch (_) {
    } finally {
      _isLoadingPermissions = false;
      notifyListeners();
    }
  }

  Future<bool> applyLeave({
    required String leaveTypeId,
    required String startDate,
    required String endDate,
    required String reason,
  }) async {
    final success = await _repository.applyLeave(
      leaveTypeId: leaveTypeId,
      startDate: startDate,
      endDate: endDate,
      reason: reason,
    );
    if (success) {
      loadLeaves(refresh: true);
    }
    return success;
  }

  Future<bool> cancelLeave(String leaveRequestId) async {
    final success = await _repository.cancelLeave(leaveRequestId);
    if (success) {
      loadLeaves(refresh: true);
    }
    return success;
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
    final success = await _repository.createPermission(
      recipientName: recipientName,
      departureTime: departureTime,
      expectedReturnTime: expectedReturnTime,
      durationHours: durationHours,
      category: category,
      reason: reason,
      requestDate: requestDate,
    );
    if (success) {
      loadPermissions(refresh: true);
    }
    return success;
  }

  Future<bool> cancelPermission(String id) async {
    final success = await _repository.cancelPermission(id);
    if (success) {
      loadPermissions(refresh: true);
    }
    return success;
  }
}
