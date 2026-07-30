import 'package:flutter/material.dart';
import 'package:student_app/features/practice/data/models/practice_model.dart';
import 'package:student_app/features/practice/data/repositories/practice_repository.dart';

class PracticeProvider extends ChangeNotifier {
  final PracticeRepository _repository = PracticeRepository();

  bool _isLoading = false;
  String? _errorMessage;
  List<PracticeSessionModel> _history = [];
  Map<String, String> _subjects = {};

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<PracticeSessionModel> get history => _history;
  Map<String, String> get subjects => _subjects;

  int get testsTakenCount => _history.length;
  
  int get averageScore {
    if (_history.isEmpty) return 0;
    final total = _history.fold<double>(0, (sum, item) => sum + item.score);
    return (total / _history.length).round();
  }

  PracticeProvider() {
    loadHistory();
  }

  Future<void> loadHistory({bool refresh = false}) async {
    if (_history.isNotEmpty && !refresh) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _history = await _repository.fetchHistory();
      _subjects = await _repository.fetchSubjects();
    } catch (e) {
      _errorMessage = 'Network connection error.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>?> generateSession({
    required String subjectId,
    required int count,
    required String difficulty,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _repository.generateSession(
        subjectId: subjectId,
        count: count,
        difficulty: difficulty,
      );
      _isLoading = false;
      notifyListeners();
      return res;
    } catch (e) {
      _errorMessage = 'Failed to generate practice session.';
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<bool> submitSession({
    required String sessionId,
    required List<Map<String, dynamic>> answers,
    required double score,
    required int correctCount,
  }) async {
    final success = await _repository.submitSession(
      sessionId: sessionId,
      answers: answers,
      score: score,
      correctCount: correctCount,
    );
    if (success) {
      loadHistory(refresh: true);
    }
    return success;
  }
}
