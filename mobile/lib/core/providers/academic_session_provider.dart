import 'package:flutter/material.dart';
import 'package:student_app/core/repositories/academic_session_repository.dart';

class AcademicSessionModel {
  final String id;
  final String sessionName;

  AcademicSessionModel({required this.id, required this.sessionName});

  factory AcademicSessionModel.fromJson(Map<String, dynamic> json) {
    return AcademicSessionModel(
      id: json['_id'] ?? '',
      sessionName: json['sessionName'] ?? '',
    );
  }
}

class AcademicSessionProvider extends ChangeNotifier {
  final AcademicSessionRepository _repository = AcademicSessionRepository();

  List<AcademicSessionModel> _sessions = [];
  String? _selectedSessionId;
  bool _isLoading = false;

  List<AcademicSessionModel> get sessions => _sessions;
  String? get selectedSessionId => _selectedSessionId;
  bool get isLoading => _isLoading;

  AcademicSessionModel? get selectedSession {
    if (_selectedSessionId == null || _sessions.isEmpty) return null;
    try {
      return _sessions.firstWhere(
        (s) => s.id == _selectedSessionId,
      );
    } catch (_) {
      return _sessions.first;
    }
  }

  Future<void> loadSessions() async {
    _isLoading = true;
    notifyListeners();

    try {
      final list = await _repository.fetchSessions();
      _sessions = list;
      if (_sessions.isNotEmpty && _selectedSessionId == null) {
        _selectedSessionId = _sessions.first.id;
      }
    } catch (e) {
      print('AcademicSessionProvider loadSessions error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void selectSession(String sessionId) {
    if (_selectedSessionId != sessionId) {
      _selectedSessionId = sessionId;
      notifyListeners();
    }
  }
}
