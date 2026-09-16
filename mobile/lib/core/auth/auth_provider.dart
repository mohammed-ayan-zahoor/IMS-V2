import 'package:flutter/material.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/core/notifications/notification_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  bool _isLoading = true;
  bool _isAuthenticated = false;
  Map<String, dynamic>? _user;
  String? _errorMessage;

  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get user => _user;
  String? get errorMessage => _errorMessage;

  String get userName {
    final u = _user;
    if (u == null) return 'Student';
    // 1. Direct name / displayName / fullName
    final directName = (u['name'] ?? u['displayName'] ?? u['fullName'])?.toString().trim() ?? '';
    if (directName.isNotEmpty && directName.toLowerCase() != 'student') return directName;

    // 2. Profile firstName / lastName
    final profile = u['profile'];
    if (profile is Map) {
      final first = profile['firstName']?.toString().trim() ?? '';
      final last = profile['lastName']?.toString().trim() ?? '';
      final full = ('$first $last').trim();
      if (full.isNotEmpty && full.toLowerCase() != 'student') return full;
      if (first.isNotEmpty) return first;
    }

    // 3. Fallback to directName or email handle if available
    if (directName.isNotEmpty) return directName;
    final email = u['email']?.toString().trim() ?? '';
    if (email.isNotEmpty && email.contains('@')) {
      final handle = email.split('@')[0];
      return handle[0].toUpperCase() + handle.substring(1);
    }
    return 'Student';
  }

  String get userFirstName {
    final full = userName;
    if (full.contains(' ')) {
      return full.split(' ').first;
    }
    return full;
  }

  String get userAvatar {
    final u = _user;
    if (u == null) return '';
    return (u['image'] ?? u['avatar'] ?? u['profile']?['avatarUrl'] ?? u['profile']?['avatar'] ?? '').toString().trim();
  }

  String get instituteType => _user?['institute']?['type']?.toString().toUpperCase() ?? 'SCHOOL';
  bool get isCollege => instituteType == 'COLLEGE';
  bool get isSchool => instituteType == 'SCHOOL';
  bool get isVocational => instituteType == 'VOCATIONAL';

  AuthProvider() {
    checkAuthStatus();
  }

  Future<void> checkAuthStatus() async {
    _isLoading = true;
    notifyListeners();

    final stopwatch = Stopwatch()..start();

    try {
      final sessionData = await _apiClient.checkSession();
      if (sessionData != null && sessionData['user'] != null) {
        _user = sessionData['user'];
        _isAuthenticated = true;
        
        final userId = _user?['id'] ?? _user?['_id'];
        if (userId != null) {
          NotificationService.instance.initializePusherBeams(userId.toString());
        }
      } else {
        _user = null;
        _isAuthenticated = false;
      }
    } catch (e) {
      _isAuthenticated = false;
      _user = null;
    } finally {
      // Ensure splash screen remains visible for at least 5 seconds (5000ms)
      final elapsedMs = stopwatch.elapsedMilliseconds;
      const minSplashDurationMs = 5000;
      if (elapsedMs < minSplashDurationMs) {
        await Future.delayed(Duration(milliseconds: minSplashDurationMs - elapsedMs));
      }
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login({
    required String email,
    required String password,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final success = await _apiClient.login(email, password);
      if (success) {
        final sessionData = await _apiClient.checkSession();
        _user = sessionData?['user'];
        _isAuthenticated = true;
        
        final userId = _user?['id'] ?? _user?['_id'];
        if (userId != null) {
          NotificationService.instance.initializePusherBeams(userId.toString());
        }
        
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = 'Invalid credentials or institute code. Please try again.';
        _isAuthenticated = false;
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Network error. Please check your internet connection.';
      _isAuthenticated = false;
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    await _apiClient.clearCookies();
    await NotificationService.instance.clearPusherBeams();
    _user = null;
    _isAuthenticated = false;
    _isLoading = false;
    notifyListeners();
  }
}
