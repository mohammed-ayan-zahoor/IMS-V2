import 'package:flutter/material.dart';
import 'package:student_app/features/timeline/data/models/timeline_model.dart';
import 'package:student_app/features/timeline/data/repositories/timeline_repository.dart';

class TimelineProvider extends ChangeNotifier {
  final TimelineRepository _repository = TimelineRepository();

  bool _isLoading = false;
  String? _errorMessage;
  List<TimelineEventModel> _events = [];

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<TimelineEventModel> get events => _events;

  TimelineProvider() {
    loadTimeline();
  }

  Future<void> loadTimeline({bool refresh = false}) async {
    if (_events.isNotEmpty && !refresh) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _events = await _repository.fetchTimeline();
    } catch (e) {
      _errorMessage = 'Failed to load timeline events.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
