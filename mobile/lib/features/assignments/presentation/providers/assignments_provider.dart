import 'package:flutter/material.dart';
import 'package:student_app/features/assignments/data/models/assignment_model.dart';
import 'package:student_app/features/assignments/data/repositories/assignments_repository.dart';

class AssignmentsProvider extends ChangeNotifier {
  final AssignmentsRepository _repository = AssignmentsRepository();

  bool _isLoading = false;
  String? _errorMessage;
  List<AssignmentModel> _assignments = [];
  Map<String, AssignmentSubmissionModel?> _submissions = {};

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<AssignmentModel> get assignments => _assignments;
  Map<String, AssignmentSubmissionModel?> get submissions => _submissions;

  AssignmentsProvider() {
    loadAssignments();
  }

  Future<void> loadAssignments({bool refresh = false}) async {
    if (_assignments.isNotEmpty && !refresh) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _assignments = await _repository.fetchAssignments();
      for (final assignment in _assignments) {
        loadSubmission(assignment.id);
      }
    } catch (e) {
      _errorMessage = 'Failed to load assignments.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadSubmission(String assignmentId) async {
    try {
      final sub = await _repository.fetchSubmission(assignmentId);
      _submissions[assignmentId] = sub;
      notifyListeners();
    } catch (e) {
      print('AssignmentsProvider loadSubmission error: $e');
    }
  }

  Future<bool> submitAssignment({
    required String assignmentId,
    required String fileUrl,
    required String fileName,
  }) async {
    final success = await _repository.submitAssignment(
      assignmentId: assignmentId,
      fileUrl: fileUrl,
      fileName: fileName,
    );

    if (success) {
      await loadSubmission(assignmentId);
      return true;
    }
    return false;
  }
}
