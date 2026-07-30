import 'package:flutter/material.dart';
import 'package:student_app/features/batches/data/models/batch_model.dart';
import 'package:student_app/features/batches/data/repositories/batches_repository.dart';

class BatchesProvider extends ChangeNotifier {
  final BatchesRepository _repository = BatchesRepository();

  bool _isLoading = false;
  String? _errorMessage;
  List<BatchModel> _batches = [];

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<BatchModel> get batches => _batches;

  BatchesProvider() {
    loadBatches();
  }

  Future<void> loadBatches({bool refresh = false}) async {
    if (_batches.isNotEmpty && !refresh) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _batches = await _repository.fetchBatches();
    } catch (e) {
      _errorMessage = 'Failed to load batches.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
