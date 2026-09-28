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

  String? _offlineSessionId;
  String? get offlineSessionId => _offlineSessionId;

  Future<void> loadOfflineExams({bool refresh = false, String? sessionId}) async {
    final bool sessionChanged = sessionId != null && sessionId != _offlineSessionId;
    if (sessionId != null) {
      _offlineSessionId = sessionId;
    }
    if (_offlineExams.isNotEmpty && !refresh && !sessionChanged) return;

    _isLoading = true;
    notifyListeners();

    try {
      _offlineExams = await _repository.fetchOfflineExams(sessionId: _offlineSessionId);
    } catch (_) {
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<List<OnlineExamSubmissionItem>> fetchOnlineSubmissions(String examId) {
    return _repository.fetchExamSubmissions(examId);
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

  String _searchQuery = '';
  String _selectedDifficulty = 'ALL';
  String _selectedType = 'ALL';
  String? _selectedCourseId;

  String get searchQuery => _searchQuery;
  String get selectedDifficulty => _selectedDifficulty;
  String get selectedType => _selectedType;
  String? get selectedCourseId => _selectedCourseId;

  Future<void> loadQuestions({
    String? search,
    String? courseId,
    String? batchId,
    String? difficulty,
    String? type,
  }) async {
    if (search != null) _searchQuery = search;
    if (difficulty != null) _selectedDifficulty = difficulty;
    if (type != null) _selectedType = type;
    if (courseId != null) _selectedCourseId = courseId.isEmpty ? null : courseId;

    _isLoading = true;
    notifyListeners();

    try {
      _questions = await _repository.fetchQuestions(
        search: _searchQuery,
        courseId: _selectedCourseId,
        batchId: batchId,
        difficulty: _selectedDifficulty,
        type: _selectedType,
      );
    } catch (_) {
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createQuestion(Map<String, dynamic> data) async {
    final success = await _repository.createQuestion(data);
    if (success) {
      await loadQuestions();
    }
    return success;
  }

  Future<Map<String, dynamic>> bulkImportQuestions({
    required List<Map<String, dynamic>> questions,
    required String courseId,
    String? batchId,
    String? subjectId,
  }) async {
    final result = await _repository.bulkImportQuestions(
      questions: questions,
      courseId: courseId,
      batchId: batchId,
      subjectId: subjectId,
    );
    if (result['success'] == true) {
      await loadQuestions();
    }
    return result;
  }
}
