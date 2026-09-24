import 'package:flutter/material.dart';
import 'package:student_app/features/instructor/notices/data/models/instructor_notice_model.dart';
import 'package:student_app/features/instructor/notices/data/repositories/instructor_notices_repository.dart';

class InstructorNoticesProvider extends ChangeNotifier {
  final InstructorNoticesRepository _repository = InstructorNoticesRepository();

  bool _isLoading = false;
  String? _errorMessage;
  List<InstructorNoticeItem> _notices = [];

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<InstructorNoticeItem> get notices => _notices;

  InstructorNoticesProvider() {
    loadNotices();
  }

  Future<void> loadNotices({bool refresh = false}) async {
    if (_notices.isNotEmpty && !refresh) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _notices = await _repository.fetchNotices();
    } catch (e) {
      _errorMessage = 'Failed to load notices.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> postNotice({
    required String title,
    required String content,
    required String category,
  }) async {
    final success = await _repository.postNotice(
      title: title,
      content: content,
      category: category,
    );
    if (success) {
      loadNotices(refresh: true);
    }
    return success;
  }
}
