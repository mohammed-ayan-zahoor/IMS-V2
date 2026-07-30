import 'package:flutter/material.dart';
import 'package:student_app/features/materials/data/models/materials_model.dart';
import 'package:student_app/features/materials/data/repositories/materials_repository.dart';

class MaterialsProvider extends ChangeNotifier {
  final MaterialsRepository _repository = MaterialsRepository();

  bool _isLoading = false;
  String? _errorMessage;
  List<MaterialModel> _materials = [];
  String _activeSegment = 'All'; // All, PDFs, Videos
  String _selectedSubject = 'All';
  String _searchQuery = '';

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<MaterialModel> get materials => _materials;
  String get activeSegment => _activeSegment;
  String get selectedSubject => _selectedSubject;
  String get searchQuery => _searchQuery;

  MaterialsProvider() {
    loadMaterials();
  }

  void setActiveSegment(String segment) {
    _activeSegment = segment;
    notifyListeners();
  }

  void setSelectedSubject(String subject) {
    _selectedSubject = subject;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  List<String> get availableSubjects {
    final set = <String>{'All'};
    for (final m in _materials) {
      if (m.courseName.isNotEmpty) {
        set.add(m.courseName);
      }
    }
    return set.toList();
  }

  List<MaterialModel> get filteredMaterials {
    return _materials.where((m) {
      // Type Segment
      if (_activeSegment == 'PDFs' && !m.isPdf) return false;
      if (_activeSegment == 'Videos' && !m.isVideo) return false;

      // Subject Filter
      if (_selectedSubject != 'All' && m.courseName.toLowerCase() != _selectedSubject.toLowerCase()) return false;

      // Search Query
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final matchesTitle = m.title.toLowerCase().contains(query);
        final matchesDesc = m.description.toLowerCase().contains(query);
        final matchesSubject = m.courseName.toLowerCase().contains(query);
        if (!matchesTitle && !matchesDesc && !matchesSubject) return false;
      }

      return true;
    }).toList();
  }

  String? _currentSessionId;

  Future<void> loadMaterials({bool refresh = false, String? sessionId}) async {
    if (sessionId != null) _currentSessionId = sessionId;
    if (_materials.isNotEmpty && !refresh && sessionId == null) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _repository.fetchMaterials(sessionId: _currentSessionId);
      if (res != null) {
        _materials = res.materials;
      } else {
        _errorMessage = 'Failed to load materials.';
      }
    } catch (e) {
      _errorMessage = 'Network connection error.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
