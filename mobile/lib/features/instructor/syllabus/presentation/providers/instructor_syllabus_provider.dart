import 'package:flutter/material.dart';
import 'package:student_app/features/instructor/syllabus/data/models/syllabus_model.dart';
import 'package:student_app/features/instructor/syllabus/data/models/syllabus_progress_model.dart';
import 'package:student_app/features/instructor/syllabus/data/repositories/instructor_syllabus_repository.dart';

class InstructorSyllabusProvider extends ChangeNotifier {
  final InstructorSyllabusRepository _repository = InstructorSyllabusRepository();

  bool _isLoading = false;
  String? _errorMessage;

  List<SyllabusSubject> _subjects = [];
  SyllabusSubject? _selectedSubject;
  List<SyllabusChapter> _syllabus = [];
  BatchSyllabusProgress? _currentProgress;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<SyllabusSubject> get subjects => _subjects;
  SyllabusSubject? get selectedSubject => _selectedSubject;
  List<SyllabusChapter> get syllabus => _syllabus;
  BatchSyllabusProgress? get currentProgress => _currentProgress;

  int get totalTopicsCount {
    int count = 0;
    for (final ch in _syllabus) {
      count += ch.topics.length;
    }
    return count;
  }

  int get completedTopicsCount {
    if (_currentProgress == null) return 0;
    int count = 0;
    for (final ch in _syllabus) {
      for (final tp in ch.topics) {
        if (tp.id != null && _currentProgress!.isItemCompleted(tp.id!)) {
          count++;
        }
      }
    }
    return count;
  }

  Future<void> loadSubjects({String? courseId}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _subjects = await _repository.fetchSubjects(courseId: courseId);
      if (_subjects.isNotEmpty && _selectedSubject == null) {
        _selectedSubject = _subjects.first;
      }
    } catch (e) {
      _errorMessage = 'Failed to load subjects';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void setSelectedSubject(SyllabusSubject? sub, {String? batchId}) {
    _selectedSubject = sub;
    notifyListeners();
    if (sub != null) {
      loadSyllabus(sub.id);
      if (batchId != null) {
        loadProgress(batchId: batchId, subjectId: sub.id);
      }
    }
  }

  Future<void> loadSyllabus(String subjectId) async {
    _isLoading = true;
    notifyListeners();
    try {
      _syllabus = await _repository.fetchSyllabus(subjectId);
    } catch (_) {
      _syllabus = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadProgress({required String batchId, required String subjectId}) async {
    _isLoading = true;
    notifyListeners();
    try {
      _currentProgress = await _repository.getOrCreateProgress(
        batchId: batchId,
        subjectId: subjectId,
      );
    } catch (_) {
      _currentProgress = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> saveSyllabus({
    required String subjectId,
    required List<SyllabusChapter> chapters,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await _repository.updateSyllabus(subjectId: subjectId, chapters: chapters);
      if (res['success'] == true) {
        _syllabus = await _repository.fetchSyllabus(subjectId);
      }
      return res;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> toggleTopicCompletion({
    required String itemId,
    required String itemType,
    required String chapterId,
    String? topicId,
    String? notes,
  }) async {
    if (_currentProgress == null) return false;

    final currentlyCompleted = _currentProgress!.isItemCompleted(itemId);
    final targetState = !currentlyCompleted;

    // Call API
    final updated = await _repository.markItem(
      progressId: _currentProgress!.id,
      itemId: itemId,
      itemType: itemType,
      chapterId: chapterId,
      topicId: topicId,
      isCompleted: targetState,
      notes: notes,
    );

    if (updated != null) {
      _currentProgress = updated;
      notifyListeners();
      return true;
    }
    return false;
  }
}
