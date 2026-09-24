import 'package:flutter/material.dart';
import 'package:student_app/features/instructor/dashboard/data/models/instructor_dashboard_model.dart';
import 'package:student_app/features/instructor/dashboard/data/repositories/instructor_dashboard_repository.dart';

class InstructorDashboardProvider extends ChangeNotifier {
  final InstructorDashboardRepository _repository = InstructorDashboardRepository();

  bool _isLoading = false;
  String? _errorMessage;
  InstructorDashboardModel? _dashboardData;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  InstructorDashboardModel? get dashboardData => _dashboardData;

  InstructorDashboardProvider() {
    loadDashboard();
  }

  Future<void> loadDashboard({bool refresh = false}) async {
    if (_dashboardData != null && !refresh) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final data = await _repository.fetchDashboardData();
      if (data != null) {
        _dashboardData = data;
        _errorMessage = null;
      } else {
        _errorMessage = 'Unable to load dashboard data. Please pull down to refresh.';
      }
    } catch (e) {
      _errorMessage = 'Network error. Please check your connection.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> publishNotice({
    required String title,
    required String content,
    required String category,
  }) async {
    final success = await _repository.publishNotice(
      title: title,
      content: content,
      category: category,
    );
    if (success) {
      // Reload dashboard to update notice count
      loadDashboard(refresh: true);
    }
    return success;
  }
}
