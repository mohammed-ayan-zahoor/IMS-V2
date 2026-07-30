import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/timetable/data/models/timetable_model.dart';

class TimetableRepository {
  final ApiClient _apiClient = ApiClient();

  Future<TimetableResponse?> fetchTimetable({String? sessionId}) async {
    try {
      final url = sessionId != null 
          ? '${ApiEndpoints.timetable}?sessionId=$sessionId' 
          : ApiEndpoints.timetable;
      final response = await _apiClient.get(url);
      if (response.statusCode == 200 && response.data != null) {
        return TimetableResponse.fromJson(response.data);
      }
    } catch (e) {
      print('TimetableRepository error: $e');
    }
    return null;
  }
}
