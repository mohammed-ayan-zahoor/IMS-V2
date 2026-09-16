import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/library/data/models/library_model.dart';

class LibraryRepository {
  final ApiClient _apiClient = ApiClient();

  Future<LibraryDataModel?> fetchLibraryData() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.studentLibrary);
      if (response.statusCode == 200 && response.data != null) {
        final Map<String, dynamic> data = (response.data is Map)
            ? Map<String, dynamic>.from(response.data)
            : {};
        return LibraryDataModel.fromJson(data);
      }
    } catch (e) {
      // Return null on failure
    }
    return null;
  }
}
