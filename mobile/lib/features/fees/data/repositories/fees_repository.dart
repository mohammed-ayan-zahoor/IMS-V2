import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/fees/data/models/fees_model.dart';

class FeesRepository {
  final ApiClient _apiClient = ApiClient();

  Future<FeesResponse?> fetchFees({String? sessionId}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (sessionId != null) queryParams['sessionId'] = sessionId;

      final response = await _apiClient.get(
        ApiEndpoints.fees,
        queryParameters: queryParams,
      );
      if (response.statusCode == 200 && response.data != null) {
        return FeesResponse.fromJson(response.data);
      }
    } catch (e) {
      print('FeesRepository error: $e');
    }
    return null;
  }
}
