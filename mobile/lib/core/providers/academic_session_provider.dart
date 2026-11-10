import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:student_app/core/repositories/academic_session_repository.dart';
import 'package:student_app/l10n/app_localizations.dart';

class AcademicSessionModel {
  final String id;
  final String sessionName;
  final bool isActive;
  final DateTime? startDate;
  final DateTime? endDate;
  final int? attendanceRate;
  final int? attendanceTotal;
  final String? feeStatus;
  final double? feeDueAmount;
  final String? batchName;
  final int? semesterNumber;
  final String? academicYear;
  final String? displayName;
  final String? shortName;

  AcademicSessionModel({
    required this.id,
    required this.sessionName,
    this.isActive = false,
    this.startDate,
    this.endDate,
    this.attendanceRate,
    this.attendanceTotal,
    this.feeStatus,
    this.feeDueAmount,
    this.batchName,
    this.semesterNumber,
    this.academicYear,
    this.displayName,
    this.shortName,
  });

  factory AcademicSessionModel.fromJson(Map<String, dynamic> json) {
    return AcademicSessionModel(
      id: json['_id'] ?? '',
      sessionName: json['sessionName'] ?? '',
      isActive: json['isActive'] == true,
      startDate: json['startDate'] != null ? DateTime.tryParse(json['startDate']) : null,
      endDate: json['endDate'] != null ? DateTime.tryParse(json['endDate']) : null,
      attendanceRate: json['attendanceRate'] is num ? (json['attendanceRate'] as num).toInt() : null,
      attendanceTotal: json['attendanceTotal'] is num ? (json['attendanceTotal'] as num).toInt() : null,
      feeStatus: json['feeStatus'] as String?,
      feeDueAmount: json['feeDueAmount'] is num ? (json['feeDueAmount'] as num).toDouble() : null,
      batchName: json['batchName'] as String?,
      semesterNumber: json['semesterNumber'] is num ? (json['semesterNumber'] as num).toInt() : null,
      academicYear: json['academicYear'] as String?,
      displayName: json['displayName'] as String?,
      shortName: json['shortName'] as String?,
    );
  }

  AcademicSessionModel copyWith({
    String? id,
    String? sessionName,
    bool? isActive,
    DateTime? startDate,
    DateTime? endDate,
    int? attendanceRate,
    int? attendanceTotal,
    String? feeStatus,
    double? feeDueAmount,
    String? batchName,
    int? semesterNumber,
    String? academicYear,
    String? displayName,
    String? shortName,
  }) {
    return AcademicSessionModel(
      id: id ?? this.id,
      sessionName: sessionName ?? this.sessionName,
      isActive: isActive ?? this.isActive,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      attendanceRate: attendanceRate ?? this.attendanceRate,
      attendanceTotal: attendanceTotal ?? this.attendanceTotal,
      feeStatus: feeStatus ?? this.feeStatus,
      feeDueAmount: feeDueAmount ?? this.feeDueAmount,
      batchName: batchName ?? this.batchName,
      semesterNumber: semesterNumber ?? this.semesterNumber,
      academicYear: academicYear ?? this.academicYear,
      displayName: displayName ?? this.displayName,
      shortName: shortName ?? this.shortName,
    );
  }

  /// Resolves the integer semester number (e.g. 1, 2, 3) from server metadata,
  /// batch name, or session name patterns.
  int? get resolvedSemesterNumber {
    if (semesterNumber != null && semesterNumber! > 0) return semesterNumber;

    if (batchName != null) {
      final m = RegExp(r'(?:^|[^\d])(\d+)(?:st|nd|rd|th)?\s*sem', caseSensitive: false).firstMatch(batchName!);
      if (m != null) {
        final n = int.tryParse(m.group(1)!);
        if (n != null && n > 0 && n <= 12) return n;
      }
    }

    final raw = sessionName.toUpperCase();
    final directMatch = RegExp(r'SEM(?:ESTER)?\s*[-:]?\s*(\d+)', caseSensitive: false).firstMatch(raw);
    if (directMatch != null) {
      final n = int.tryParse(directMatch.group(1)!);
      if (n != null && n > 0 && n <= 12) return n;
    }

    // Pattern for "2025-26 ODD SEM", "2025-26 EVEN SEM", "2026-27 ODD SEM"
    final isOdd = raw.contains('ODD');
    final isEven = raw.contains('EVEN');
    final yearMatch = RegExp(r'20(\d{2})[-–/](\d{2})').firstMatch(raw);
    if (yearMatch != null && (isOdd || isEven)) {
      final startYr = int.tryParse(yearMatch.group(1)!);
      if (startYr != null) {
        final yearIndex = (startYr - 25).clamp(0, 5);
        return (yearIndex * 2) + (isOdd ? 1 : 2);
      }
    }

    return null;
  }

  /// Extracts the academic year string (e.g. "2025–26")
  String? get resolvedAcademicYear {
    if (academicYear != null && academicYear!.trim().isNotEmpty) return academicYear!.trim();
    final m = RegExp(r'(20\d{2}\s*[-–/]\s*\d{2,4})').firstMatch(sessionName);
    if (m != null) {
      return m.group(1)!.replaceAll('/', '–').replaceAll('-', '–');
    }
    if (startDate != null && endDate != null) {
      final sy = startDate!.year;
      final ey = endDate!.year;
      return sy == ey ? '$sy' : '$sy–${ey.toString().substring(2)}';
    }
    return null;
  }

  /// Returns user-friendly localized title like "ಸೆಮಿಸ್ಟರ್ 1 · 2025–26" or "Semester 1 · 2025–26"
  String getLocalizedTitle(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final semNum = resolvedSemesterNumber;
    final year = resolvedAcademicYear;

    if (semNum != null) {
      final semLabel = l10n?.semester ?? 'Semester';
      if (year != null && year.isNotEmpty) {
        return '$semLabel $semNum · $year';
      }
      return '$semLabel $semNum';
    }

    if (displayName != null && displayName!.isNotEmpty) {
      return displayName!;
    }

    return sessionName.replaceAll(RegExp(r'^Academic Session\s*', caseSensitive: false), '').trim();
  }

  /// Returns short localized title like "ಸೆಮ್ 1" or "Sem 1"
  String getLocalizedShortTitle(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final semNum = resolvedSemesterNumber;

    if (semNum != null) {
      final shortLabel = l10n?.sem ?? 'Sem';
      return '$shortLabel $semNum';
    }

    if (shortName != null && shortName!.isNotEmpty) {
      return shortName!;
    }

    return sessionName;
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

      // If any sessions lack semester numbers, calculate chronological semester index
      final sortedChronological = List<AcademicSessionModel>.from(list)
        ..sort((a, b) {
          final aDate = a.startDate ?? DateTime(2000);
          final bDate = b.startDate ?? DateTime(2000);
          return aDate.compareTo(bDate);
        });

      final Map<String, int> sessionToSemNum = {};
      for (int i = 0; i < sortedChronological.length; i++) {
        final item = sortedChronological[i];
        final num = item.resolvedSemesterNumber ?? (i + 1);
        sessionToSemNum[item.id] = num;
      }

      _sessions = list.map((s) {
        if (s.semesterNumber == null && sessionToSemNum.containsKey(s.id)) {
          return s.copyWith(semesterNumber: sessionToSemNum[s.id]);
        }
        return s;
      }).toList();

      String? savedSessionId;
      try {
        savedSessionId = await _storage.read(key: _sessionStorageKey);
      } catch (_) {}

      if (_sessions.isNotEmpty) {
        final activeSessions = _sessions.where((s) => s.isActive).toList();
        final activeSession = activeSessions.isNotEmpty ? activeSessions.first : null;

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
