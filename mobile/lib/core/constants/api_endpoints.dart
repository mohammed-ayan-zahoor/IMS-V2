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
}
