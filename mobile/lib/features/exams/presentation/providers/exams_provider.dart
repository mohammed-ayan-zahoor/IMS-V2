import 'package:flutter/material.dart';
import 'package:student_app/features/exams/data/models/exam_model.dart';
import 'package:student_app/features/exams/data/repositories/exams_repository.dart';

class ExamsProvider extends ChangeNotifier {
  final ExamsRepository _repository = ExamsRepository();

  bool _isLoading = false;
  String? _errorMessage;
  List<ExamModel> _exams = [];

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<ExamModel> get exams => _exams;

  List<ExamModel> get availableExams =>
      _exams.where((e) => e.submissionStatus == 'available' || e.submissionStatus == 'in_progress').toList();

  List<ExamModel> get completedExams =>
      _exams.where((e) => e.submissionStatus == 'submitted').toList();

  List<ExamModel> get upcomingOrMissedExams =>
      _exams.where((e) => e.submissionStatus == 'upcoming' || e.submissionStatus == 'missed').toList();

  int get totalExamsPassed {
    return completedExams.where((e) {
      if (e.bestScore != null) {
        return e.bestScore! >= e.passingMarks;
      }
      return false;
    }).length;
  }

  double get averagePercentage {
    final scored = completedExams.where((e) => e.bestPercentage != null).toList();
    if (scored.isEmpty) return 0.0;
    final sum = scored.fold<double>(0, (prev, element) => prev + (element.bestPercentage ?? 0));
    return (sum / scored.length).roundToDouble();
  }

  ExamsProvider() {
    loadExams();
  }

  Future<void> loadExams({bool refresh = false}) async {
    if (_exams.isNotEmpty && !refresh) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _exams = await _repository.fetchStudentExams();
    } catch (e) {
      _errorMessage = 'Failed to load exams.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>?> startExam(String examId) async {
    _isLoading = true;
    notifyListeners();

    final result = await _repository.startExam(examId);

    _isLoading = false;
    notifyListeners();
    return result;
  }

  Future<bool> submitExam({
    required String submissionId,
    required List<Map<String, dynamic>> answers,
  }) async {
    final res = await _repository.submitExam(submissionId: submissionId, answers: answers);
    if (res != null) {
      loadExams(refresh: true);
      return true;
    }
    return false;
  }

  Future<ExamSubmissionResultModel?> fetchResult(String id) async {
    return await _repository.fetchResult(id);
  }
}
