import 'package:flutter/material.dart';
import 'package:student_app/features/library/data/models/library_model.dart';
import 'package:student_app/features/library/data/repositories/library_repository.dart';

class LibraryProvider extends ChangeNotifier {
  final LibraryRepository _repository = LibraryRepository();

  bool _isLoading = false;
  String? _errorMessage;
  LibraryDataModel? _libraryData;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  LibraryDataModel? get libraryData => _libraryData;

  List<LibraryLoanModel> get loans => _libraryData?.loans ?? [];
  List<LibraryHoldModel> get holds => _libraryData?.holds ?? [];
  LibraryStatsModel? get stats => _libraryData?.stats;

  LibraryProvider() {
    loadLibrary();
  }

  Future<void> loadLibrary({bool refresh = false}) async {
    if (_isLoading) return;

    _isLoading = true;
    _errorMessage = null;
    if (!refresh) notifyListeners();

    try {
      final data = await _repository.fetchLibraryData();
      if (data != null) {
        _libraryData = data;
        _errorMessage = null;
      } else {
        _errorMessage = 'Could not load library details.';
      }
    } catch (e) {
      _errorMessage = 'Network error while loading library records.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
