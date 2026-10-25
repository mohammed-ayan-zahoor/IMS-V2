import 'package:flutter/material.dart';
import 'package:student_app/features/instructor/batches/data/models/instructor_batch_model.dart';
import 'package:student_app/features/instructor/batches/data/repositories/instructor_batches_repository.dart';

class InstructorBatchesProvider extends ChangeNotifier {
  final InstructorBatchesRepository _repository = InstructorBatchesRepository();

  bool _isLoading = false;
  String? _errorMessage;
  List<InstructorBatchDetail> _batches = [];
  String? _currentSessionId;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<InstructorBatchDetail> get batches => _batches;
  String? get currentSessionId => _currentSessionId;

  InstructorBatchesProvider() {
    loadBatches();
  }

  Future<void> loadBatches({bool refresh = false, String? sessionId}) async {
    if (_batches.isNotEmpty && !refresh && sessionId == _currentSessionId) return;

    _isLoading = true;
    _errorMessage = null;
    _currentSessionId = sessionId;
    notifyListeners();

    try {
      _batches = await _repository.fetchBatches(sessionId: sessionId);
    } catch (e) {
      _errorMessage = 'Unable to load batches.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
