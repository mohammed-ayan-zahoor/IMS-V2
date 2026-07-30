import 'package:flutter/material.dart';
import 'package:student_app/features/dashboard/data/models/dashboard_data_model.dart';
import 'package:student_app/features/dashboard/data/repositories/dashboard_repository.dart';

class DashboardProvider extends ChangeNotifier {
  final DashboardRepository _repository = DashboardRepository();

  bool _isLoading = false;
  String? _errorMessage;
  DashboardDataModel? _dashboardData;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  DashboardDataModel? get dashboardData => _dashboardData;

  DashboardProvider() {
    loadDashboard();
  }

  Future<void> loadDashboard({bool refresh = false, String? sessionId}) async {
    if (_dashboardData != null && !refresh && sessionId == null) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final data = await _repository.fetchDashboardData(sessionId: sessionId);
      if (data != null) {
        _dashboardData = data;
      } else {
        _errorMessage = 'Failed to load dashboard stats.';
      }
    } catch (e) {
      _errorMessage = 'Network connection error.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
