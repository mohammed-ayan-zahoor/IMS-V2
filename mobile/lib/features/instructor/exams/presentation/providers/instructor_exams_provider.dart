import 'package:flutter/material.dart';
import 'package:student_app/features/instructor/exams/data/models/instructor_exam_model.dart';
import 'package:student_app/features/instructor/exams/data/models/offline_exam_model.dart';
import 'package:student_app/features/instructor/exams/data/repositories/instructor_exams_repository.dart';

class InstructorExamsProvider extends ChangeNotifier {
  final InstructorExamsRepository _repository = InstructorExamsRepository();

  bool _isLoading = false;
  String? _errorMessage;
  List<InstructorExamItem> _exams = [];
  List<OfflineExamItem> _offlineExams = [];
  List<QuestionBankItem> _questions = [];

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<InstructorExamItem> get exams => _exams;
  List<OfflineExamItem> get offlineExams => _offlineExams;
  List<QuestionBankItem> get questions => _questions;

  InstructorExamsProvider() {
    loadExams();
    loadOfflineExams();
  }

  Future<void> loadExams({bool refresh = false}) async {
    if (_exams.isNotEmpty && !refresh) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _exams = await _repository.fetchExams();
    } catch (e) {
      _errorMessage = 'Failed to load exams.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadOfflineExams({bool refresh = false}) async {
    if (_offlineExams.isNotEmpty && !refresh) return;

    _isLoading = true;
    notifyListeners();

    try {
      _offlineExams = await _repository.fetchOfflineExams();
    } catch (_) {
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<List<OfflineStudentResultEntry>> fetchOfflineResults({
    required String examId,
    required String batchId,
    required List<OfflineExamSubject> subjects,
  }) {
    return _repository.fetchOfflineExamResults(
      examId: examId,
      batchId: batchId,
      subjects: subjects,
    );
  }

  Future<bool> saveOfflineResults({
    required String examId,
    required String batchId,
    required List<OfflineStudentResultEntry> results,
  }) {
    return _repository.saveOfflineExamResults(
      examId: examId,
      batchId: batchId,
      results: results,
    );
  }

  Future<void> loadQuestions({String? search}) async {
    _isLoading = true;
    notifyListeners();

    try {
      _questions = await _repository.fetchQuestions(search: search);
    } catch (_) {
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
