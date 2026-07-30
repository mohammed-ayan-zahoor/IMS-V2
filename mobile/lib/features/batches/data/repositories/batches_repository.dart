import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/batches/data/models/batch_model.dart';

class BatchesRepository {
  final ApiClient _apiClient = ApiClient();

  Future<List<BatchModel>> fetchBatches() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.batches);
      if (response.statusCode == 200 && response.data != null && response.data['batches'] is List) {
        return (response.data['batches'] as List)
            .map((e) => BatchModel.fromJson(e))
            .toList();
      }
    } catch (e) {
      print('BatchesRepository fetchBatches error: $e');
    }
    return [];
  }
}
