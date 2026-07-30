import 'package:flutter/material.dart';
import 'package:student_app/features/timetable/data/models/timetable_model.dart';
import 'package:student_app/features/timetable/data/repositories/timetable_repository.dart';

class TimetableProvider extends ChangeNotifier {
  final TimetableRepository _repository = TimetableRepository();

  bool _isLoading = false;
  String? _errorMessage;
  Map<int, List<TimetableSlotModel>> _weeklySchedule = {};
  int _selectedDayIndex = DateTime.now().weekday % 7; // Sunday=0, Mon=1...Sat=6

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  Map<int, List<TimetableSlotModel>> get weeklySchedule => _weeklySchedule;
  int get selectedDayIndex => _selectedDayIndex;

  List<TimetableSlotModel> get currentDaySlots {
    return _weeklySchedule[_selectedDayIndex] ?? [];
  }

  TimetableProvider() {
    loadTimetable();
  }

  void setSelectedDayIndex(int index) {
    _selectedDayIndex = index;
    notifyListeners();
  }

  Future<void> loadTimetable({bool refresh = false, String? sessionId}) async {
    if (_weeklySchedule.isNotEmpty && !refresh && sessionId == null) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _repository.fetchTimetable(sessionId: sessionId);
      if (res != null) {
        _weeklySchedule = res.weeklySchedule;
      } else {
        _errorMessage = 'Failed to load timetable.';
      }
    } catch (e) {
      _errorMessage = 'Network connection error.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
