import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/attendance/data/models/attendance_model.dart';

class AttendanceRepository {
  final ApiClient _apiClient = ApiClient();

  Future<AttendanceResponse?> fetchAttendance({int? month, int? year, String? sessionId}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (month != null) queryParams['month'] = month;
      if (year != null) queryParams['year'] = year;
      if (sessionId != null) queryParams['sessionId'] = sessionId;

      final response = await _apiClient.get(
        ApiEndpoints.attendance,
        queryParameters: queryParams,
      );
      if (response.statusCode == 200 && response.data != null) {
        return AttendanceResponse.fromJson(response.data);
      }
    } catch (e) {
      print('AttendanceRepository error: $e');
    }
    return null;
  }
}
