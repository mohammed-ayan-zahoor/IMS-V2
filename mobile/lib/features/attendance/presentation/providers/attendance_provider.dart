import 'package:flutter/material.dart';
import 'package:student_app/features/attendance/data/models/attendance_model.dart';
import 'package:student_app/features/attendance/data/repositories/attendance_repository.dart';

class AttendanceProvider extends ChangeNotifier {
  final AttendanceRepository _repository = AttendanceRepository();

  bool _isLoading = false;
  String? _errorMessage;
  DateTime _selectedDate = DateTime.now();
  List<AttendanceModel> _history = [];
  AttendanceStatsModel? _stats;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  DateTime get selectedDate => _selectedDate;
  List<AttendanceModel> get history => _history;
  AttendanceStatsModel? get stats => _stats;

  String? _currentSessionId;

  AttendanceProvider() {
    loadAttendance();
  }

  void changeMonth(int monthOffset, {String? sessionId}) {
    _selectedDate = DateTime(_selectedDate.year, _selectedDate.month + monthOffset, 1);
    if (sessionId != null) _currentSessionId = sessionId;
    loadAttendance(sessionId: _currentSessionId);
  }

  Future<void> loadAttendance({bool refresh = false, String? sessionId}) async {
    if (sessionId != null) _currentSessionId = sessionId;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _repository.fetchAttendance(
        month: _selectedDate.month,
        year: _selectedDate.year,
        sessionId: _currentSessionId,
      );
      if (res != null) {
        _history = res.history;
        _stats = res.stats;
      } else {
        _errorMessage = 'Failed to load attendance records.';
      }
    } catch (e) {
      _errorMessage = 'Network connection error.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
