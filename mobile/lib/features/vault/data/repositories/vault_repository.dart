import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/vault/data/models/vault_model.dart';

class VaultRepository {
  final ApiClient _apiClient = ApiClient();

  Future<VaultDataModel?> fetchStudentDocuments() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.documents);
      if (response.statusCode == 200 && response.data != null) {
        return VaultDataModel.fromJson(response.data);
      }
    } catch (e) {
      print('VaultRepository fetchStudentDocuments error: $e');
    }
    return null;
  }
}
