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
        final activeSessions = _sessions.where((s) => s.isActive).toList();
        final activeSession = activeSessions.isNotEmpty ? activeSessions.first : null;

        // If a previously saved session is still valid AND is active, keep it.
        // If the saved session was deactivated or the admin activated a new session, follow the server's active session!
        if (savedSessionId != null && _sessions.any((s) => s.id == savedSessionId)) {
          final savedSession = _sessions.firstWhere((s) => s.id == savedSessionId);
          if (savedSession.isActive || activeSession == null) {
            _selectedSessionId = savedSessionId;
          } else {
            _selectedSessionId = activeSession.id;
          }
        } else if (activeSession != null) {
          _selectedSessionId = activeSession.id;
        } else {
          _selectedSessionId = _sessions.first.id;
        }

        // Persist session ID to secure storage so ApiClient headers pick it up immediately
        if (_selectedSessionId != null) {
          try {
            await _storage.write(key: _sessionStorageKey, value: _selectedSessionId);
          } catch (_) {}
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
