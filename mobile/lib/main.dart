import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/core/theme/app_theme.dart';
import 'package:student_app/features/auth/presentation/screens/login_screen.dart';
import 'package:student_app/features/dashboard/presentation/screens/app_shell.dart';

import 'package:student_app/features/dashboard/presentation/providers/dashboard_provider.dart';

import 'package:student_app/features/attendance/presentation/providers/attendance_provider.dart';
import 'package:student_app/features/timetable/presentation/providers/timetable_provider.dart';
import 'package:student_app/features/fees/presentation/providers/fees_provider.dart';
import 'package:student_app/features/notices/presentation/providers/notices_provider.dart';
import 'package:student_app/features/materials/presentation/providers/materials_provider.dart';
import 'package:student_app/features/practice/presentation/providers/practice_provider.dart';
import 'package:student_app/features/exams/presentation/providers/exams_provider.dart';
import 'package:student_app/features/vault/presentation/providers/vault_provider.dart';
import 'package:student_app/features/chat/presentation/providers/chat_provider.dart';
import 'package:student_app/features/assignments/presentation/providers/assignments_provider.dart';
import 'package:student_app/features/timeline/presentation/providers/timeline_provider.dart';
import 'package:student_app/features/batches/presentation/providers/batches_provider.dart';
import 'package:student_app/features/notifications/presentation/providers/notifications_provider.dart';

import 'package:student_app/core/providers/academic_session_provider.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:student_app/core/notifications/notification_service.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Called when FCM data-only message arrives in background / terminated state
  await NotificationService.instance.showDataNotification(message);
}

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  await NotificationService.instance.initialize();
  runApp(const MainApp());
}

class MainApp extends StatelessWidget {
  const MainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => AcademicSessionProvider()),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
        ChangeNotifierProvider(create: (_) => AttendanceProvider()),
        ChangeNotifierProvider(create: (_) => TimetableProvider()),
        ChangeNotifierProvider(create: (_) => FeesProvider()),
        ChangeNotifierProvider(create: (_) => NoticesProvider()),
        ChangeNotifierProvider(create: (_) => MaterialsProvider()),
        ChangeNotifierProvider(create: (_) => PracticeProvider()),
        ChangeNotifierProvider(create: (_) => ExamsProvider()),
        ChangeNotifierProvider(create: (_) => VaultProvider()),
        ChangeNotifierProvider(create: (_) => ChatProvider()),
        ChangeNotifierProvider(create: (_) => AssignmentsProvider()),
        ChangeNotifierProvider(create: (_) => TimelineProvider()),
        ChangeNotifierProvider(create: (_) => BatchesProvider()),
        ChangeNotifierProvider(create: (_) => NotificationsProvider()),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          return MaterialApp(
            navigatorKey: navigatorKey,
            title: 'Quantech Student App',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            home: auth.isLoading
                ? const Scaffold(
                    backgroundColor: Color(0xFF002045),
                    body: Center(
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    ),
                  )
                : auth.isAuthenticated
                    ? const AppShell()
                    : const LoginScreen(),
          );
        },
      ),
    );
  }
}
