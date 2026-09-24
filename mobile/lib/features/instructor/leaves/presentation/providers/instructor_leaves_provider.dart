import 'package:flutter/material.dart';
import 'package:student_app/features/instructor/leaves/data/models/instructor_leave_model.dart';
import 'package:student_app/features/instructor/leaves/data/repositories/instructor_leaves_repository.dart';

class InstructorLeavesProvider extends ChangeNotifier {
  final InstructorLeavesRepository _repository = InstructorLeavesRepository();

  bool _isLoading = false;
  String? _errorMessage;
  List<InstructorLeaveRequestItem> _leaveRequests = [];
  List<LeaveTypeItem> _leaveTypes = [];

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<InstructorLeaveRequestItem> get leaveRequests => _leaveRequests;
  List<LeaveTypeItem> get leaveTypes => _leaveTypes;

  InstructorLeavesProvider() {
    loadLeaves();
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
}
