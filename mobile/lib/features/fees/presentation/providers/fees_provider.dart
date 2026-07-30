import 'package:flutter/material.dart';
import 'package:student_app/features/fees/data/models/fees_model.dart';
import 'package:student_app/features/fees/data/repositories/fees_repository.dart';

class FeesProvider extends ChangeNotifier {
  final FeesRepository _repository = FeesRepository();

  bool _isLoading = false;
  String? _errorMessage;
  List<FeeCategoryModel> _categories = [];
  final Map<String, bool> _autopayStates = {};

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<FeeCategoryModel> get categories => _categories;

  FeesProvider() {
    loadFees();
  }

  bool isAutopayEnabled(String categoryId) {
    return _autopayStates[categoryId] ?? false;
  }

  void toggleAutopay(String categoryId) {
    _autopayStates[categoryId] = !(_autopayStates[categoryId] ?? false);
    notifyListeners();
  }

  String? _currentSessionId;

  Future<void> loadFees({bool refresh = false, String? sessionId}) async {
    if (sessionId != null) _currentSessionId = sessionId;
    if (_categories.isNotEmpty && !refresh && sessionId == null) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _repository.fetchFees(sessionId: _currentSessionId);
      if (res != null) {
        _categories = res.categories;
      } else {
        _errorMessage = 'Failed to load fee information.';
      }
    } catch (e) {
      _errorMessage = 'Network connection error.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
