import 'package:flutter/material.dart';
import 'package:student_app/features/instructor/materials/data/models/instructor_material_model.dart';
import 'package:student_app/features/instructor/materials/data/repositories/instructor_materials_repository.dart';

class InstructorMaterialsProvider extends ChangeNotifier {
  final InstructorMaterialsRepository _repository = InstructorMaterialsRepository();

  bool _isLoading = false;
  String? _errorMessage;
  List<InstructorMaterialItem> _materials = [];
  List<Map<String, String>> _courses = [];

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<InstructorMaterialItem> get materials => _materials;
  List<Map<String, String>> get courses => _courses;

  InstructorMaterialsProvider() {
    loadMaterials();
  }

  Future<void> loadMaterials({bool refresh = false}) async {
    if (_materials.isNotEmpty && !refresh) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final materialsFuture = _repository.fetchMaterials();
      final coursesFuture = _repository.fetchCourses();

      final results = await Future.wait([materialsFuture, coursesFuture]);
      _materials = results[0] as List<InstructorMaterialItem>;
      _courses = results[1] as List<Map<String, String>>;
    } catch (e) {
      _errorMessage = 'Failed to load materials.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>?> uploadFile({
    required String filePath,
    required String fileName,
    String fileType = 'document',
  }) async {
    return _repository.uploadFile(
      filePath: filePath,
      fileName: fileName,
      fileType: fileType,
    );
  }

  Future<bool> uploadMaterial({
    required String title,
    required String courseId,
    String? batchId,
    required String fileUrl,
    String? description,
    String type = 'document',
    String category = 'lecture',
    bool allowSubmissions = false,
    int? totalMarks,
    DateTime? dueDate,
    int? fileSize,
  }) async {
    final success = await _repository.uploadMaterial(
      title: title,
      courseId: courseId,
      batchId: batchId,
      fileUrl: fileUrl,
      description: description,
      type: type,
      category: category,
      allowSubmissions: allowSubmissions,
      totalMarks: totalMarks,
      dueDate: dueDate,
      fileSize: fileSize,
    );
    if (success) {
      loadMaterials(refresh: true);
    }
    return success;
  }
}
