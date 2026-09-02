import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:student_app/core/repositories/academic_session_repository.dart';

class AcademicSessionModel {
  final String id;
  final String sessionName;
  final bool isActive;
  final DateTime? startDate;
  final DateTime? endDate;

  AcademicSessionModel({
    required this.id,
    required this.sessionName,
    this.isActive = false,
    this.startDate,
    this.endDate,
  });

  factory AcademicSessionModel.fromJson(Map<String, dynamic> json) {
    return AcademicSessionModel(
      id: json['_id'] ?? '',
      sessionName: json['sessionName'] ?? '',
      isActive: json['isActive'] == true,
      startDate: json['startDate'] != null ? DateTime.tryParse(json['startDate']) : null,
      endDate: json['endDate'] != null ? DateTime.tryParse(json['endDate']) : null,
    );
  }
}

class AcademicSessionProvider extends ChangeNotifier {
  final AcademicSessionRepository _repository = AcademicSessionRepository();
  static const FlutterSecureStorage _storage = FlutterSecureStorage();
  static const String _sessionStorageKey = 'selected_academic_session_id';

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

      String? savedSessionId;
      try {
        savedSessionId = await _storage.read(key: _sessionStorageKey);
      } catch (_) {}

      if (_sessions.isNotEmpty) {
        // Priority 1: Previously chosen & persisted session ID (if still in list)
        if (savedSessionId != null && _sessions.any((s) => s.id == savedSessionId)) {
          _selectedSessionId = savedSessionId;
        } else {
          // Priority 2: Active session as configured on server
          final active = _sessions.where((s) => s.isActive).toList();
          if (active.isNotEmpty) {
            _selectedSessionId = active.first.id;
          } else {
            // Priority 3: Fall back to first session in list
            _selectedSessionId = _sessions.first.id;
          }
        }
      }
    } catch (e) {
      print('AcademicSessionProvider loadSessions error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> selectSession(String sessionId) async {
    if (_selectedSessionId != sessionId) {
      _selectedSessionId = sessionId;
      try {
        await _storage.write(key: _sessionStorageKey, value: sessionId);
      } catch (_) {}
      notifyListeners();
    }
  }
}
