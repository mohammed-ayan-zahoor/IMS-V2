import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:student_app/features/instructor/attendance/data/models/batch_attendance_model.dart';
import 'package:student_app/features/instructor/attendance/data/repositories/instructor_attendance_repository.dart';
import 'package:student_app/features/instructor/dashboard/data/models/instructor_dashboard_model.dart';

class InstructorAttendanceProvider extends ChangeNotifier {
  final InstructorAttendanceRepository _repository = InstructorAttendanceRepository();

  bool _isLoading = false;
  bool _isSaving = false;
  String? _errorMessage;

  List<InstructorBatchSummary> _batches = [];
  String? _selectedBatchId;
  DateTime _selectedDate = DateTime.now();

  List<StudentRosterItem> _students = [];
  Map<String, String> _attendanceMap = {};

  bool get isLoading => _isLoading;
  bool get isSaving => _isSaving;
  String? get errorMessage => _errorMessage;

  List<InstructorBatchSummary> get batches => _batches;
  String? get selectedBatchId => _selectedBatchId;
  DateTime get selectedDate => _selectedDate;

  List<StudentRosterItem> get students => _students;
  Map<String, String> get attendanceMap => _attendanceMap;

  int get totalCount => _students.length;
  int get presentCount => _attendanceMap.values.where((s) => s == 'present').length;
  int get absentCount => _attendanceMap.values.where((s) => s == 'absent').length;
  int get lateCount => _attendanceMap.values.where((s) => s == 'late').length;

  InstructorAttendanceProvider({String? initialBatchId}) {
    loadInitialData(initialBatchId: initialBatchId);
  }

  Future<void> loadInitialData({String? initialBatchId}) async {
    _isLoading = true;
    notifyListeners();

    try {
      _batches = await _repository.fetchAssignedBatches();
      if (_batches.isNotEmpty) {
        if (initialBatchId != null && _batches.any((b) => b.id == initialBatchId)) {
          _selectedBatchId = initialBatchId;
        } else {
          _selectedBatchId = _batches.first.id;
        }
        await _loadBatchRosterAndAttendance();
      }
    } catch (e) {
      _errorMessage = 'Failed to load batches.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> selectBatch(String batchId) async {
    if (_selectedBatchId == batchId) return;
    _selectedBatchId = batchId;
    _isLoading = true;
    notifyListeners();

    await _loadBatchRosterAndAttendance();
    _isLoading = false;
    notifyListeners();
  }

  Future<void> selectDate(DateTime date) async {
    _selectedDate = date;
    if (_selectedBatchId != null) {
      _isLoading = true;
      notifyListeners();
      await _loadBatchRosterAndAttendance();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _loadBatchRosterAndAttendance() async {
    if (_selectedBatchId == null) return;

    final batchId = _selectedBatchId!;
    final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);

    final rosterFuture = _repository.fetchBatchStudents(batchId);
    final recordsFuture = _repository.fetchExistingAttendance(batchId, dateStr);

    final results = await Future.wait([rosterFuture, recordsFuture]);
    _students = results[0] as List<StudentRosterItem>;
    final existingRecords = results[1] as Map<String, String>;

    _attendanceMap = {};
    for (var student in _students) {
      if (existingRecords.containsKey(student.id)) {
        _attendanceMap[student.id] = existingRecords[student.id]!;
      } else {
        // Default to present for quick marking
        _attendanceMap[student.id] = 'present';
      }
    }
  }

  void setStatus(String studentId, String status) {
    _attendanceMap[studentId] = status;
    notifyListeners();
  }

  void markAllPresent() {
    for (var student in _students) {
      _attendanceMap[student.id] = 'present';
    }
    notifyListeners();
  }

  Future<bool> saveAttendance() async {
    if (_selectedBatchId == null || _students.isEmpty) return false;

    _isSaving = true;
    notifyListeners();

    final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);
    final records = _attendanceMap.entries.map((e) {
      return BatchAttendanceRecord(
        studentId: e.key,
        status: e.value,
      );
    }).toList();

    final success = await _repository.saveBatchAttendance(
      batchId: _selectedBatchId!,
      date: dateStr,
      records: records,
    );

    _isSaving = false;
    notifyListeners();
    return success;
  }
}
