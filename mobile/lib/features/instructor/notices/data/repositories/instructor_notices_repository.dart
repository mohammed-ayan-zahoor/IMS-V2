import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/instructor/notices/data/models/instructor_notice_model.dart';

class InstructorNoticesRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<InstructorNoticeItem>> fetchNotices() async {
    try {
      final res = await _apiClient.get(ApiEndpoints.instructorNotices);
      if (res.statusCode == 200 && res.data != null) {
        List<dynamic> list = [];
        if (res.data is List) {
          list = res.data;
        } else if (res.data['notices'] is List) {
          list = res.data['notices'];
        }
        return list
            .whereType<Map<String, dynamic>>()
            .map((n) => InstructorNoticeItem.fromJson(n))
            .toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<bool> postNotice({
    required String title,
    required String content,
    required String category,
  }) async {
    try {
      final res = await _apiClient.post(
        ApiEndpoints.instructorNotices,
        data: {
          'title': title,
          'content': content,
          'category': category.toUpperCase(),
          'target': 'all',
          'targetRole': 'ALL',
        },
      );
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }
}
