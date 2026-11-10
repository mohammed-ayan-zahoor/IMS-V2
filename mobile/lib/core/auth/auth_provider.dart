import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/core/notifications/notification_service.dart';
import 'package:student_app/l10n/app_localizations.dart';

class AuthProvider extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  bool _isLoading = true;
  bool _isAuthenticated = false;
  Map<String, dynamic>? _user;
  Map<String, dynamic>? _cachedInstitute;
  Map<String, dynamic>? _detectedInstitute;
  String? _errorMessage;

  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get user => _user;
  String? get errorMessage => _errorMessage;

  Map<String, dynamic>? get institute {
    if (_user?['institute'] is Map) {
      return Map<String, dynamic>.from(_user!['institute']);
    }
    return _detectedInstitute ?? _cachedInstitute;
  }

  String? get instituteName => institute?['name']?.toString();
  String? get instituteLogo => institute?['logo']?.toString();
  String? get instituteCode => institute?['code']?.toString();
  String? get institutePrimaryColor => institute?['primaryColor']?.toString();

  String get role => _user?['role']?.toString().toLowerCase() ?? '';
  bool get isInstructor => role == 'instructor';
  bool get isStudent => role == 'student';
  bool get needsSubscriptionPayment => _user?['needsSubscriptionPayment'] == true;
  Map<String, dynamic>? get accessSubscription =>
      _user?['accessSubscription'] is Map ? Map<String, dynamic>.from(_user!['accessSubscription']) : null;

  bool hasPermission(String permission) {
    final perms = _user?['permissions'];
    if (perms is List) {
      return perms.map((p) => p.toString()).contains(permission);
    }
    return false;
  }

  String get userName {
    final u = _user;
    final defaultRoleName = isInstructor ? 'Instructor' : 'Student';
    if (u == null) return defaultRoleName;
    // 1. Direct name / displayName / fullName
    final directName = (u['name'] ?? u['displayName'] ?? u['fullName'])?.toString().trim() ?? '';
    if (directName.isNotEmpty &&
        directName.toLowerCase() != 'student' &&
        directName.toLowerCase() != 'instructor') {
      return directName;
    }

    // 2. Profile firstName / lastName
    final profile = u['profile'];
    if (profile is Map) {
      final first = profile['firstName']?.toString().trim() ?? '';
      final last = profile['lastName']?.toString().trim() ?? '';
      final full = ('$first $last').trim();
      if (full.isNotEmpty &&
          full.toLowerCase() != 'student' &&
          full.toLowerCase() != 'instructor') {
        return full;
      }
      if (first.isNotEmpty) return first;
    }

    // 3. Fallback to directName or email handle if available
    if (directName.isNotEmpty) return directName;
    final email = u['email']?.toString().trim() ?? '';
    if (email.isNotEmpty && email.contains('@')) {
      final handle = email.split('@')[0];
      return handle[0].toUpperCase() + handle.substring(1);
    }
    return defaultRoleName;
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
    return (u['image'] ?? u['avatar'] ?? u['picture'] ?? u['profile']?['avatarUrl'] ?? u['profile']?['avatar'] ?? u['profile']?['image'] ?? '').toString().trim();
  }

  String get instituteType => institute?['type']?.toString().toUpperCase() ?? 'SCHOOL';

  String get instituteStructure {
    final s = institute?['structure'] ?? institute?['settings']?['structure'];
    return s?.toString().toUpperCase() ?? 'SEMESTER_BASED';
  }

  /// True for Higher Education institutions (Degree or PU College)
  bool get isCollege => instituteType == 'COLLEGE';

  /// True specifically for Degree Colleges (Semester-based college structure)
  bool get isDegreeCollege =>
      (isCollege && instituteStructure != 'CLASS_BASED') ||
      instituteType == 'DEGREE_COLLEGE' ||
      instituteType == 'COLLEGE_DEGREE';

  /// True specifically for PU Colleges (Pre-University 10+2 / Class-based college structure)
  bool get isPuCollege =>
      (isCollege && instituteStructure == 'CLASS_BASED') ||
      instituteType == 'PU_COLLEGE' ||
      instituteType == 'COLLEGE_PU';

  /// True for standard K-12 Schools
  bool get isSchool => instituteType == 'SCHOOL';

  /// True for Vocational & Training Institutes
  bool get isVocational => instituteType == 'VOCATIONAL';

  /// Whether the institute admin allows students to upload/change their own profile photo
  bool get allowStudentPhotoUpload {
    final s = institute?['settings'];
    if (s is Map) {
      final features = s['features'];
      if (features is Map && features['studentPhotoUpload'] == false) {
        return false;
      }
      if (s['studentPhotoUpload'] == false) {
        return false;
      }
    }
    return true;
  }


  /// Dynamic Portal Title (Header in Dashboard, Login, etc.)
  String get portalBadgeText {
    if (isDegreeCollege) return 'DEGREE PORTAL';
    if (isPuCollege) return 'PU COLLEGE PORTAL';
    if (isVocational) return 'VOCATIONAL PORTAL';
    return 'STUDENT PORTAL';
  }

  /// Level / Program label (e.g. Degree Program vs PU Class vs School Class)
  String get academicLevelLabel {
    if (isDegreeCollege) return 'Degree / Program';
    if (isPuCollege) return 'PU Class / Stream';
    if (isSchool) return 'Class / Standard';
    return 'Course';
  }

  /// Division / Semester label
  String get academicDivisionLabel {
    if (isDegreeCollege) return 'Semester / Section';
    if (isPuCollege) return 'Year / Section';
    if (isSchool) return 'Section';
    return 'Batch';
  }

  /// Label for primary ID (University Roll / USN vs PU Reg / SATS vs Enrollment No)
  String get primaryIdLabel {
    if (isDegreeCollege) return 'University Reg. / USN';
    if (isPuCollege) return 'PU Board / SATS No.';
    if (isSchool) return 'Enrollment Number';
    return 'Student ID';
  }

  /// Label for secondary ID (College Roll vs Admission No vs GR No)
  String get secondaryIdLabel {
    if (isDegreeCollege) return 'College Roll No.';
    if (isPuCollege) return 'Admission / Reg. No.';
    if (isSchool) return 'General Register (GR) No.';
    return 'Roll Number';
  }

  /// Label for Materials Screen / Tile
  String get materialsTitle {
    if (isDegreeCollege) return 'Semester Resources';
    if (isPuCollege) return 'Study Materials & Notes';
    return 'Learning Materials';
  }

  /// Subtitle description under Materials
  String get materialsSubtitle {
    if (isDegreeCollege) return 'Access semester lecture notes, lab manuals, and syllabus modules.';
    if (isPuCollege) return 'Access PU subject notes, model question papers, and study guides.';
    return 'Access notes, assignments, and reference videos for your courses.';
  }

  /// Label for Exams Screen / Tile
  String get examsTitle {
    if (isDegreeCollege) return 'Assessments & Sem Exams';
    if (isPuCollege) return 'Tests & Preparatory Exams';
    return 'Exams & Tests';
  }

  /// Label for Assignments Screen
  String get assignmentsTitle {
    if (isDegreeCollege) return 'Assignments & Submissions';
    if (isPuCollege) return 'Assignments & Worksheets';
    return 'Assignments & Homework';
  }

  /// Button label when uploading completed assignment
  String get submitButtonLabel {
    if (isDegreeCollege) return 'Submit Assignment';
    if (isPuCollege) return 'Submit Work';
    return 'Submit Homework';
  }

  /// Subtitle under Student Profile & Drawer
  String get userSubtitle {
    if (isDegreeCollege) return 'Degree Scholar • Higher Education';
    if (isPuCollege) return 'PU Scholar • Pre-University';
    return 'Active Student • Learning & Growing';
  }

  String getLocalizedMaterialsTitle(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (isDegreeCollege) return l10n?.semesterResources ?? materialsTitle;
    if (isPuCollege) return l10n?.studyMaterialsAndNotes ?? materialsTitle;
    return l10n?.studyMaterials ?? materialsTitle;
  }

  String getLocalizedExamsTitle(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (isDegreeCollege) return l10n?.assessmentsAndExams ?? examsTitle;
    if (isPuCollege) return l10n?.testsAndPreparatory ?? examsTitle;
    return l10n?.examsTitle ?? examsTitle;
  }

  String getLocalizedUserSubtitle(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (isDegreeCollege) return l10n?.degreeScholarSubtitle ?? userSubtitle;
    if (isPuCollege) return l10n?.puScholarSubtitle ?? userSubtitle;
    return l10n?.schoolScholarSubtitle ?? userSubtitle;
  }

  /// Attendance regulations / eligibility message
  String getAttendanceEligibilityMessage({required bool isEligible, required int classesNeeded, required int totalMarked}) {
    if (isDegreeCollege) {
      return isEligible
          ? 'Your attendance meets the university requirement to appear for semester-end examinations.'
          : totalMarked > 0
              ? 'University regulations mandate at least 75% attendance. Attend the next $classesNeeded consecutive classes to clear the shortage.'
              : 'No sessions recorded yet for this semester.';
    }
    if (isPuCollege) {
      return isEligible
          ? 'Your attendance meets the Pre-University Board requirement to appear for annual examinations.'
          : totalMarked > 0
              ? 'PU Board regulations mandate at least 75% attendance. Attend the next $classesNeeded consecutive classes to clear the shortage.'
              : 'No sessions recorded yet for this academic year.';
    }
    return isEligible
        ? 'Your attendance is in good standing.'
        : totalMarked > 0
            ? 'Attendance is below 75%. Please attend upcoming classes regularly.'
            : 'No attendance records found.';
  }

  AuthProvider() {
    _loadCachedInstitute();
    _apiClient.onPaymentRequired = () {
      if (_user != null && _user!['needsSubscriptionPayment'] != true) {
        _user!['needsSubscriptionPayment'] = true;
        notifyListeners();
      }
    };
    checkAuthStatus(isInitial: true);
  }

  Future<void> _loadCachedInstitute() async {
    try {
      final cached = await _storage.read(key: 'cached_institute');
      if (cached != null && cached.isNotEmpty) {
        _cachedInstitute = Map<String, dynamic>.from(jsonDecode(cached));
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> _saveCachedInstitute(Map<String, dynamic> inst) async {
    try {
      _cachedInstitute = inst;
      await _storage.write(key: 'cached_institute', value: jsonEncode(inst));
    } catch (_) {}
  }

  Future<Map<String, dynamic>?> lookupInstitute(String query) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) {
      _detectedInstitute = null;
      notifyListeners();
      return null;
    }
    Map<String, dynamic>? result;
    if (trimmed.contains('@')) {
      result = await _apiClient.lookupInstitute(email: trimmed);
    } else {
      result = await _apiClient.lookupInstitute(code: trimmed);
    }
    if (result != null) {
      _detectedInstitute = result;
      _saveCachedInstitute(result);
      notifyListeners();
    }
    return result;
  }

  void clearDetectedInstitute() {
    if (_detectedInstitute != null) {
      _detectedInstitute = null;
      notifyListeners();
    }
  }

  Future<void> checkAuthStatus({bool isInitial = false}) async {
    if (isInitial) {
      _isLoading = true;
      notifyListeners();
    }

    final stopwatch = Stopwatch()..start();

    try {
      final sessionData = await _apiClient.checkSession();
      if (sessionData != null && sessionData['user'] != null) {
        _user = sessionData['user'];
        _isAuthenticated = true;

        if (_user?['institute'] != null && _user!['institute'] is Map) {
          _saveCachedInstitute(Map<String, dynamic>.from(_user!['institute']));
        }
        
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
      if (isInitial) {
        final elapsedMs = stopwatch.elapsedMilliseconds;
        // Snappy, polished branded transition (1.2s minimum)
        const minSplashDurationMs = 1200;
        if (elapsedMs < minSplashDurationMs) {
          await Future.delayed(Duration(milliseconds: minSplashDurationMs - elapsedMs));
        }
        _isLoading = false;
      }
      notifyListeners();
    }
  }

  Future<bool> login({
    required String email,
    required String password,
    String? instituteCode,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final success = await _apiClient.login(email, password, instituteCode: instituteCode ?? this.instituteCode);
      if (success) {
        final sessionData = await _apiClient.checkSession();
        _user = sessionData?['user'];
        _isAuthenticated = true;

        if (_user?['institute'] != null && _user!['institute'] is Map) {
          _saveCachedInstitute(Map<String, dynamic>.from(_user!['institute']));
        }
        
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
    _detectedInstitute = null;
    _isAuthenticated = false;
    _isLoading = false;
    notifyListeners();
  }

  Future<bool> updateAvatar(String newAvatarUrl) async {
    try {
      final res = await _apiClient.post('/student/profile', data: {'avatarUrl': newAvatarUrl});
      if (res.statusCode == 200) {
        if (_user != null) {
          final updatedUser = Map<String, dynamic>.from(_user!);
          final profile = updatedUser['profile'] is Map 
              ? Map<String, dynamic>.from(updatedUser['profile']) 
              : <String, dynamic>{};
          profile['avatar'] = newAvatarUrl;
          updatedUser['profile'] = profile;
          updatedUser['avatar'] = newAvatarUrl;
          updatedUser['image'] = newAvatarUrl;
          _user = updatedUser;
          notifyListeners();
        }
        return true;
      }
    } catch (e) {
      if (kDebugMode) print('Update avatar error: $e');
    }
    return false;
  }
}
