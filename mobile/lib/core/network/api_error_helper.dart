import 'package:dio/dio.dart';

class ApiErrorHelper {
  /// Extracts a human-friendly, actionable error message from an API response or exception.
  static String extractMessage(
    dynamic error, {
    Response? response,
    String fallback = 'An unexpected error occurred',
  }) {
    // 1. If response is directly provided or extracted from DioException
    final res = response ?? (error is DioException ? error.response : null);

    if (res != null) {
      final statusCode = res.statusCode;
      final data = res.data;
      String? serverMsg;

      if (data is Map) {
        serverMsg = data['error']?.toString() ?? data['message']?.toString();
      } else if (data is String && data.isNotEmpty && !data.startsWith('<!DOCTYPE')) {
        serverMsg = data;
      }

      // If server returned a meaningful non-generic message, use it
      if (serverMsg != null &&
          serverMsg.isNotEmpty &&
          serverMsg.toLowerCase() != 'unauthorized' &&
          serverMsg.toLowerCase() != 'forbidden' &&
          serverMsg.toLowerCase() != 'internal server error') {
        return serverMsg;
      }

      // Handle specific HTTP Status Codes with intuitive text
      if (statusCode == 401) {
        return 'Session expired or not authorized. Please log in again.';
      } else if (statusCode == 403 || (statusCode == 401 && serverMsg?.toLowerCase() == 'unauthorized')) {
        return 'Permission Denied: You do not have permission for this action. Please ask your school administrator to grant access in User Management.';
      } else if (statusCode == 404) {
        return 'The requested resource was not found.';
      } else if (statusCode == 422 || statusCode == 400) {
        return serverMsg ?? 'Invalid data submitted. Please check the form fields.';
      } else if (statusCode != null && statusCode >= 500) {
        return serverMsg ?? 'Server encountered an error ($statusCode). Please try again later.';
      }
    }

    // 2. Dio network-specific errors
    if (error is DioException) {
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return 'Request timed out. Please check your internet connection.';
        case DioExceptionType.connectionError:
          return 'Cannot reach the school server. Please verify your internet connection.';
        case DioExceptionType.badCertificate:
          return 'Security certificate error connecting to server.';
        case DioExceptionType.cancel:
          return 'Request was cancelled.';
        default:
          break;
      }
    }

    // 3. Fallback to string representations
    if (error != null) {
      final str = error.toString().replaceFirst('Exception: ', '');
      if (str.isNotEmpty && !str.contains('Instance of')) {
        return str;
      }
    }

    return fallback;
  }
}
