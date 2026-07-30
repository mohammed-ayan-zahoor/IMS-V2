import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:student_app/core/constants/api_endpoints.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late Dio _dio;
  final _cookieJar = CookieJar(); // In-memory — avoids Android filesystem permission issues
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  ApiClient._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiEndpoints.baseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 20),
      followRedirects: false, // We handle redirects manually for auth
      validateStatus: (status) => status != null && status < 500,
    ));
    _dio.interceptors.add(CookieManager(_cookieJar));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        await _restoreSession();
        return handler.next(options);
      },
    ));
    _dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
      error: true,
      logPrint: (obj) => print('[DIO] $obj'),
    ));
  }

  Dio get dio => _dio;

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    return await _dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data, Map<String, dynamic>? queryParameters, Options? options}) async {
    return await _dio.post(path, data: data, queryParameters: queryParameters, options: options);
  }

  Future<Response> put(String path, {dynamic data}) async {
    return await _dio.put(path, data: data);
  }

  Future<Response> patch(String path, {dynamic data}) async {
    return await _dio.patch(path, data: data);
  }

  Future<Response> delete(String path) async {
    return await _dio.delete(path);
  }

  Future<void> clearCookies() async {
    await _cookieJar.deleteAll();
    await _storage.deleteAll();
  }

  // Next-Auth 3-Step Login
  Future<bool> login(String email, String password) async {
    try {
      print('[Auth] Step 1: Fetching CSRF token from ${ApiEndpoints.csrf}');

      // Step 1: Get CSRF token
      final csrfRes = await _dio.get(
        ApiEndpoints.csrf,
        options: Options(
          headers: {'Accept': 'application/json'},
          validateStatus: (s) => s != null && s < 600,
        ),
      );

      print('[Auth] CSRF status: ${csrfRes.statusCode}, data: ${csrfRes.data}');

      String? csrfToken;
      if (csrfRes.data is Map) {
        csrfToken = csrfRes.data['csrfToken'];
      } else if (csrfRes.data is String) {
        try {
          final decoded = jsonDecode(csrfRes.data);
          csrfToken = decoded['csrfToken'];
        } catch (_) {}
      }

      if (csrfToken == null || csrfToken.isEmpty) {
        print('[Auth] ERROR: No CSRF token received');
        return false;
      }

      print('[Auth] Step 2: Posting credentials, csrfToken length=${csrfToken.length}');

      // Step 2: POST credentials
      final loginRes = await _dio.post(
        ApiEndpoints.login,
        data: {
          'csrfToken': csrfToken,
          'email': email,
          'password': password,
          'redirect': 'false',
          'json': 'true',
          'callbackUrl': ApiEndpoints.host,
        },
        options: Options(
          contentType: Headers.formUrlEncodedContentType,
          headers: {'Accept': 'application/json'},
          followRedirects: false,
          validateStatus: (s) => s != null && s < 600,
        ),
      );

      print('[Auth] Login response status: ${loginRes.statusCode}');
      print('[Auth] Login response data: ${loginRes.data}');
      print('[Auth] Login response headers: ${loginRes.headers}');

      // NextAuth returns 200 with {url} on success/failure
      // Check if the url is an error url
      if (loginRes.data is Map && loginRes.data['url'] != null) {
        final url = loginRes.data['url'] as String;
        if (url.contains('error=')) {
          print('[Auth] Login failed: server returned error URL: $url');
          return false;
        }
      }

      if (loginRes.statusCode != 200 && loginRes.statusCode != 302) {
        print('[Auth] Login failed with status: ${loginRes.statusCode}');
        return false;
      }

      // Step 3: Verify session was created
      print('[Auth] Step 3: Verifying session');
      final sessionRes = await _dio.get(
        ApiEndpoints.session,
        options: Options(
          headers: {'Accept': 'application/json'},
          validateStatus: (s) => s != null && s < 600,
        ),
      );

      print('[Auth] Session status: ${sessionRes.statusCode}');
      print('[Auth] Session data: ${sessionRes.data}');

      if (sessionRes.statusCode == 200 && sessionRes.data != null) {
        Map<String, dynamic>? sessionData;
        if (sessionRes.data is Map) {
          sessionData = Map<String, dynamic>.from(sessionRes.data);
        } else if (sessionRes.data is String && (sessionRes.data as String).isNotEmpty) {
          try {
            sessionData = Map<String, dynamic>.from(jsonDecode(sessionRes.data));
          } catch (_) {}
        }

        if (sessionData != null && sessionData['user'] != null) {
          await _storage.write(key: 'userEmail', value: email);
          await _saveSession();
          print('[Auth] Login SUCCESS — user: ${sessionData['user']['email']}');
          return true;
        }
      }

      print('[Auth] Session check failed — no user in session data');
      return false;

    } on DioException catch (e) {
      print('[Auth] DioException: ${e.type} — ${e.message}');
      print('[Auth] DioException response: ${e.response?.statusCode} ${e.response?.data}');
      return false;
    } catch (e, stack) {
      print('[Auth] Unexpected error: $e\n$stack');
      return false;
    }
  }

  Future<Map<String, dynamic>?> checkSession() async {
    try {
      final sessionRes = await _dio.get(
        ApiEndpoints.session,
        options: Options(
          headers: {'Accept': 'application/json'},
          validateStatus: (s) => s != null && s < 600,
        ),
      );
      if (sessionRes.statusCode == 200 && sessionRes.data != null) {
        Map<String, dynamic>? data;
        if (sessionRes.data is Map) {
          data = Map<String, dynamic>.from(sessionRes.data);
        } else if (sessionRes.data is String && (sessionRes.data as String).isNotEmpty) {
          try {
            data = Map<String, dynamic>.from(jsonDecode(sessionRes.data));
          } catch (_) {}
        }
        if (data != null && data['user'] != null) {
          await _saveSession();
          return data;
        }
      }
    } catch (e) {
      print('[Auth] checkSession exception: $e');
    }
    return null;
  }

  Future<void> _restoreSession() async {
    try {
      String? token = await _storage.read(key: 'session_token');
      String? name = await _storage.read(key: 'session_token_name');

      // Fallback read with encryptedSharedPreferences if standard storage returns null
      if (token == null || token.isEmpty) {
        try {
          const encryptedStorage = FlutterSecureStorage(
            aOptions: AndroidOptions(encryptedSharedPreferences: true),
          );
          token = await encryptedStorage.read(key: 'session_token');
          name ??= await encryptedStorage.read(key: 'session_token_name');
        } catch (_) {}
      }

      name ??= 'next-auth.session-token';

      if (token != null && token.isNotEmpty) {
        final hostUri = Uri.parse(ApiEndpoints.host);
        final existingCookies = await _cookieJar.loadForRequest(hostUri);
        final hasSession = existingCookies.any((c) => c.name == name);
        if (!hasSession) {
          print('[Auth] Restoring session token cookie in-memory for ${hostUri.host}');
          final sessionCookie = Cookie(name, token)
            ..path = '/'
            ..httpOnly = true;
          await _cookieJar.saveFromResponse(hostUri, [sessionCookie]);
        }
      }
    } catch (e) {
      print('[Auth] Error restoring session: $e');
    }
  }

  Future<void> _saveSession() async {
    try {
      final hostUri = Uri.parse(ApiEndpoints.host);
      final cookies = await _cookieJar.loadForRequest(hostUri);
      for (final cookie in cookies) {
        if (cookie.name == 'next-auth.session-token' || cookie.name.contains('session-token')) {
          print('[Auth] Storing session token securely: ${cookie.name}');
          await _storage.write(key: 'session_token', value: cookie.value);
          await _storage.write(key: 'session_token_name', value: cookie.name);
          // Also save in encryptedSharedPreferences for background isolate compatibility
          try {
            const encryptedStorage = FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );
            await encryptedStorage.write(key: 'session_token', value: cookie.value);
            await encryptedStorage.write(key: 'session_token_name', value: cookie.name);
          } catch (_) {}
          break;
        }
      }
    } catch (e) {
      print('[Auth] Error saving session: $e');
    }
  }
}
