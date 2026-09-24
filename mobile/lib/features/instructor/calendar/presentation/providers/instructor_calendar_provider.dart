import 'package:flutter/material.dart';
import 'package:student_app/features/instructor/calendar/data/models/instructor_event_model.dart';
import 'package:student_app/features/instructor/calendar/data/repositories/instructor_calendar_repository.dart';

class InstructorCalendarProvider extends ChangeNotifier {
  final InstructorCalendarRepository _repository = InstructorCalendarRepository();

  bool _isLoading = false;
  String? _errorMessage;
  List<InstructorEventItem> _events = [];

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<InstructorEventItem> get events => _events;

  InstructorCalendarProvider() {
    loadEvents();
  }

  Future<void> loadEvents({bool refresh = false}) async {
    if (_events.isNotEmpty && !refresh) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _events = await _repository.fetchEvents();
      // Sort chronologically
      _events.sort((a, b) {
        if (a.startDate == null) return 1;
        if (b.startDate == null) return -1;
        return a.startDate!.compareTo(b.startDate!);
      });
    } catch (e) {
      _errorMessage = 'Unable to load calendar events.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
