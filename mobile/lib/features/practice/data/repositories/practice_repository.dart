import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/practice/data/models/practice_model.dart';

class PracticeRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<PracticeSessionModel>> fetchHistory() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.practice);
      if (response.statusCode == 200 && response.data != null && response.data['sessions'] is List) {
        return (response.data['sessions'] as List)
            .map((e) => PracticeSessionModel.fromJson(e))
            .toList();
      }
    } catch (e) {
      print('PracticeRepository fetchHistory error: $e');
    }
    return [];
  }

  Future<Map<String, dynamic>?> generateSession({
    required String subjectId,
    required int count,
    required String difficulty,
  }) async {
    try {
      final response = await _apiClient.post(
        ApiEndpoints.practice,
        data: {
          'subjectId': subjectId,
          'count': count,
          'difficulty': difficulty.toLowerCase(),
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final sessionId = response.data['sessionId']?.toString() ?? '';
        final rawQuestions = (response.data['questions'] as List<dynamic>?) ?? [];
        final questions = rawQuestions.map((q) => QuestionModel.fromJson(q)).toList();
        return {
          'sessionId': sessionId,
          'questions': questions,
        };
      }
    } catch (e) {
      print('PracticeRepository generateSession error: $e');
    }
    return null;
  }

  Future<bool> submitSession({
    required String sessionId,
    required List<Map<String, dynamic>> answers,
    required double score,
    required int correctCount,
  }) async {
    try {
      final url = '${ApiEndpoints.practice}/$sessionId/submit';
      final response = await _apiClient.patch(
        url,
        data: {
          'answers': answers,
          'score': score,
          'correctCount': correctCount,
        },
      );
      return response.statusCode == 200;
    } catch (e) {
      print('PracticeRepository submitSession error: $e');
    }
    return false;
  }

  Future<Map<String, String>> fetchSubjects() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.syllabus);
      if (response.statusCode == 200 && response.data != null && response.data['progress'] is List) {
        final Map<String, String> subjects = {};
        for (final item in response.data['progress']) {
          final id = item['subjectId']?.toString();
          final name = item['subjectName']?.toString();
          if (id != null && name != null) {
            subjects[name] = id;
          }
        }
        return subjects;
      }
    } catch (e) {
      print('PracticeRepository fetchSubjects error: $e');
    }
    return {};
  }
}
