import 'package:flutter/material.dart';
import 'package:student_app/features/timeline/data/models/timeline_model.dart';
import 'package:student_app/features/timeline/data/repositories/timeline_repository.dart';

class TimelineProvider extends ChangeNotifier {
  final TimelineRepository _repository = TimelineRepository();

  bool _isLoading = false;
  String? _errorMessage;
  List<TimelineEventModel> _events = [];
  String? _currentStudentId;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<TimelineEventModel> get events => _events;

  Future<void> loadTimeline({bool refresh = false, String? studentId}) async {
    if (_currentStudentId != studentId) {
      _events = [];
      _currentStudentId = studentId;
      refresh = true;
    }

    if (_events.isNotEmpty && !refresh) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _events = await _repository.fetchTimeline(studentId: studentId);
    } catch (e) {
      _errorMessage = 'Failed to load timeline events.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> logEvent({
    required String studentId,
    required String title,
    required String description,
    required String category,
    required DateTime date,
    String? photoUrl,
  }) async {
    final success = await _repository.postTimelineEvent(
      studentId: studentId,
      title: title,
      description: description,
      category: category,
      date: date,
      photoUrl: photoUrl,
    );
    if (success) {
      await loadTimeline(refresh: true, studentId: studentId);
    }
    return success;
  }

  Future<bool> approveEvent({
    required String studentId,
    required String eventId,
  }) async {
    final success = await _repository.approveTimelineEvent(
      studentId: studentId,
      eventId: eventId,
    );
    if (success) {
      await loadTimeline(refresh: true, studentId: studentId);
    }
    return success;
  }
}
