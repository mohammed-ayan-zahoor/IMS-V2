import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/materials/data/models/materials_model.dart';

class MaterialsRepository {
  final ApiClient _apiClient = ApiClient();

  Future<MaterialsResponse?> fetchMaterials({String? sessionId}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (sessionId != null) queryParams['sessionId'] = sessionId;

      final response = await _apiClient.get(
        ApiEndpoints.materials,
        queryParameters: queryParams,
      );
      if (response.statusCode == 200 && response.data != null) {
        return MaterialsResponse.fromJson(response.data);
      }
    } catch (e) {
      print('MaterialsRepository error: $e');
    }
    return null;
  }
}
