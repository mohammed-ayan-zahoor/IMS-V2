import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/instructor/batches/data/models/instructor_batch_model.dart';

class InstructorBatchesRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<InstructorBatchDetail>> fetchBatches() async {
    try {
      final res = await _apiClient.get(ApiEndpoints.instructorBatches);
      if (res.statusCode == 200 && res.data != null) {
        List<dynamic> list = [];
        if (res.data is List) {
          list = res.data;
        } else if (res.data['batches'] is List) {
          list = res.data['batches'];
        }
        return list
            .whereType<Map<String, dynamic>>()
            .map((b) => InstructorBatchDetail.fromJson(b))
            .toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }
}
