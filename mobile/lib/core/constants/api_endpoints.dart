class ApiEndpoints {
  static const String host = 'https://imsportal.3ftech.in';
  static const String baseUrl = '$host/api/v1';

  // Next-Auth Endpoints
  static const String login = '$host/api/auth/callback/credentials';
  static const String session = '$host/api/auth/session';
  static const String csrf = '$host/api/auth/csrf';

  // Student details
  static const String dashboard = '/student/dashboard';
  static const String timetable = '/student/timetable';
  static const String attendance = '/student/attendance';
  static const String batches = '/student/batches';
  static const String fees = '/student/fees';
  static const String materials = '/student/materials';
  static const String notices = '/student/notices';
  static const String practice = '/student/practice';
  static const String profile = '/student/profile';
  static const String syllabus = '/student/syllabus';
  static const String documents = '/student/documents';
  static const String timeline = '/student/timeline';
  static const String sessions = '/student/sessions';
  static const String studentLibrary = '/student/library';

  // Exams
  static const String exams = '/exams';
  static const String examsStudent = '/exams/student';
  static const String examsList = '/exams/student';
  static String examInstructions(String examId) => '/exams/$examId/instructions';
  static String startExam(String examId) => '/exams/$examId/start';
  static String saveExamProgress(String subId) => '/exams/submissions/$subId/autosave';
  static String submitExam(String subId) => '/exams/submissions/$subId/submit';
  static String examResult(String examId) => '/exams/$examId/result';

  // Chat / Messages
  static const String pusherConfig = '/pusher/config';
  static const String pusherAuth = '/chat/pusher-auth';
  static const String conversations = '/chat/conversations';
  static const String messages = '/chat/messages';

  // Instructor Endpoints (shared /api/v1 routes)
  static const String dashboardStats = '/dashboard/stats';
  static const String instructorBatches = '/batches';
  static const String instructorCourses = '/courses';
  static const String instructorSubjects = '/subjects';
  static const String batchAttendance = '/attendance/batch';
  static const String batchAttendanceSingle = '/attendance/batch/single';
  static const String instructorMaterials = '/materials';
  static const String instructorNotices = '/notices';
  static const String instructorEvents = '/events';
  static const String leaveTypes = '/hr/leave-types';
  static const String leaveRequests = '/hr/leave-requests';
  static String cancelLeaveRequest(String id) => '/hr/leave-requests/$id';
  static const String instructorExams = '/exams';
  static String examGrading(String examId) => '/exams/$examId/grade';
  static String assignmentSubmissions(String materialId) => '/assignments/$materialId/submissions';
  static const String offlineExams = '/offline-exams';
  static String offlineExamResults(String id) => '/offline-exams/$id/results';
  static const String questions = '/questions';
  static const String syllabusProgress = '/syllabus-progress';

  // App Auto-Update
  static const String appVersion = '/app/version';
  static const String appDownload = '$host/api/v1/app/download';
}
