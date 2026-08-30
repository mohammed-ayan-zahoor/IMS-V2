import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:pusher_beams/pusher_beams.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/features/chat/presentation/screens/chat_screen.dart';
import 'package:student_app/features/attendance/presentation/screens/attendance_screen.dart';
import 'package:student_app/features/fees/presentation/screens/fees_screen.dart';
import 'package:student_app/features/notices/presentation/screens/notices_screen.dart';
import 'package:student_app/features/timeline/presentation/screens/timeline_screen.dart';
import 'package:student_app/features/notifications/presentation/screens/notifications_screen.dart';
import 'package:student_app/features/dashboard/presentation/screens/app_shell.dart';
import 'package:student_app/main.dart';

@pragma('vm:entry-point')
void notificationTapBackground(NotificationResponse response) async {
  // Background isolate: plugins need binding initialised before secure storage access
  WidgetsFlutterBinding.ensureInitialized();

  final conversationId = response.payload;
  print('[NotificationService] backgroundAction: ${response.actionId}, conversationId: $conversationId, input: ${response.input}');

  if (response.actionId == 'reply_action' && response.input != null && response.input!.isNotEmpty) {
    final replyText = response.input!;
    print('[NotificationService] Background Inline Reply: "$replyText" for conversation $conversationId');
    if (conversationId != null && conversationId.isNotEmpty) {
      try {
        final res = await ApiClient().post(ApiEndpoints.messages, data: {
          'conversationId': conversationId,
          'text': replyText,
        });
        print('[NotificationService] Inline Reply response status: ${res.statusCode}');
        if (res.statusCode == 200 || res.statusCode == 201) {
          print('[NotificationService] Inline Reply sent successfully!');
          // Dismiss notification shade item to give clear visual feedback
          final plugin = FlutterLocalNotificationsPlugin();
          await plugin.cancel(conversationId.hashCode);
        } else {
          print('[NotificationService] Inline Reply server rejected: ${res.statusCode} — ${res.data}');
        }
      } catch (e, st) {
        print('[NotificationService] Inline Reply exception: $e\n$st');
      }
    }
  } else if (response.actionId == 'mark_read_action') {
    print('[NotificationService] Background Mark as Read for conversation $conversationId');
    if (conversationId != null && conversationId.isNotEmpty) {
      try {
        final res = await ApiClient().post('${ApiEndpoints.conversations}/$conversationId/read');
        print('[NotificationService] Mark as Read response status: ${res.statusCode}');
        if (res.statusCode == 200) {
          final plugin = FlutterLocalNotificationsPlugin();
          await plugin.cancel(conversationId.hashCode);
        }
      } catch (e) {
        print('[NotificationService] Mark as Read failed: $e');
      }
    }
  }
}

class NotificationService {
  static final NotificationService instance = NotificationService._internal();
  NotificationService._internal();

  bool _initialized = false;
  String? _beamsInstanceId;

  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

  static const AndroidNotificationChannel _channel = AndroidNotificationChannel(
    'high_importance_channel',
    'High Importance Notifications',
    description: 'This channel is used for important chat & system notifications.',
    importance: Importance.max,
    playSound: true,
  );

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      print('[NotificationService] Initializing Firebase...');
      await Firebase.initializeApp();

      // Request notification permissions
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
      print('[NotificationService] Permissions status: ${settings.authorizationStatus}');

      // Configure foreground notification presentation options
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      // Initialize Local Notifications plugin
      const androidInit = AndroidInitializationSettings('@drawable/ic_notification');
      const initSettings = InitializationSettings(android: androidInit);

      await _localNotifications.initialize(
        initSettings,
        onDidReceiveNotificationResponse: (response) {
          if (response.actionId == 'reply_action') {
            notificationTapBackground(response);
          } else {
            _handleNotificationResponse(response.payload);
          }
        },
        onDidReceiveBackgroundNotificationResponse: notificationTapBackground,
      );

      // Create high importance channel on Android
      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_channel);

      // Listen to FCM foreground messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        final title = message.data['title'] ?? message.notification?.title ?? 'New Notification';
        print('[NotificationService] Foreground notification received: $title');
        _showLocalNotification(message);
      });

      // Listen to notification tap events (app in background, tapped notification)
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        final type = message.data['type']?.toString().toLowerCase() ?? 'general';
        print('[NotificationService] Notification tapped! type=$type, data=${message.data}');
        _navigateToScreen(type, message.data);
      });

      // Fetch dynamic Pusher configuration from backend
      print('[NotificationService] Fetching dynamic Pusher Beams config...');
      final response = await ApiClient().dio.get(ApiEndpoints.pusherConfig);
      if (response.statusCode == 200 && response.data != null) {
        _beamsInstanceId = response.data['beamsInstanceId']?.toString();
        if (_beamsInstanceId != null && _beamsInstanceId!.isNotEmpty) {
          print('[NotificationService] Initializing Pusher Beams with instanceId: $_beamsInstanceId');
          await PusherBeams.instance.start(_beamsInstanceId!);
        } else {
          print('[NotificationService] Pusher Beams instanceId is empty on server config');
        }
      } else {
        print('[NotificationService] Failed to load Pusher config: status=${response.statusCode}');
      }

      _initialized = true;
    } catch (e) {
      print('[NotificationService] Initialization error: $e');
    }
  }

  void _handleNotificationResponse(String? rawPayload) {
    if (rawPayload == null || rawPayload.isEmpty) {
      navigatorKey.currentState?.push(MaterialPageRoute(builder: (_) => const NotificationsScreen()));
      return;
    }

    try {
      final decoded = json.decode(rawPayload);
      if (decoded is Map<String, dynamic>) {
        final type = decoded['type']?.toString().toLowerCase() ?? 'general';
        final data = decoded['data'] is Map ? Map<String, dynamic>.from(decoded['data']) : <String, dynamic>{};
        _navigateToScreen(type, data);
        return;
      }
    } catch (_) {
      // Fallback for legacy plain conversationId payload
      if (rawPayload.length > 5) {
        navigatorKey.currentState?.push(MaterialPageRoute(builder: (_) => ChatScreen(initialConversationId: rawPayload)));
        return;
      }
    }

    navigatorKey.currentState?.push(MaterialPageRoute(builder: (_) => const NotificationsScreen()));
  }

  void _navigateToScreen(String type, Map<String, dynamic> data) {
    switch (type.toLowerCase()) {
      case 'chat':
        final conversationId = data['conversationId']?.toString();
        if (conversationId != null && conversationId.isNotEmpty) {
          navigatorKey.currentState?.push(MaterialPageRoute(builder: (_) => ChatScreen(initialConversationId: conversationId)));
        } else {
          navigatorKey.currentState?.push(MaterialPageRoute(builder: (_) => const ChatScreen()));
        }
        break;
      case 'attendance':
        navigatorKey.currentState?.push(MaterialPageRoute(builder: (_) => const AttendanceScreen()));
        break;
      case 'fee_due':
      case 'fee':
      case 'fee_payment':
        navigatorKey.currentState?.push(MaterialPageRoute(builder: (_) => const FeesScreen()));
        break;
      case 'notice':
        navigatorKey.currentState?.push(MaterialPageRoute(builder: (_) => const NoticesScreen()));
        break;
      case 'timeline':
        navigatorKey.currentState?.push(MaterialPageRoute(builder: (_) => const TimelineScreen()));
        break;
      case 'birthday':
      default:
        navigatorKey.currentState?.push(MaterialPageRoute(builder: (_) => const NotificationsScreen()));
        break;
    }
  }

  Future<void> _recordNotificationLocally(String title, String body, String type, Map<String, dynamic> data) async {
    try {
      const boxName = 'app_notifications_box';
      const notificationsKey = 'notifications_list';

      if (!Hive.isBoxOpen(boxName)) {
        await Hive.openBox(boxName);
      }
      final box = Hive.box(boxName);
      final rawList = box.get(notificationsKey) ?? [];
      final list = List<dynamic>.from(rawList is List ? rawList : []);

      final newNotif = {
        'id': DateTime.now().millisecondsSinceEpoch.toString(),
        'title': title,
        'body': body,
        'type': type,
        'timestamp': DateTime.now().toIso8601String(),
        'isRead': false,
        'data': data,
      };

      list.insert(0, newNotif);
      await box.put(notificationsKey, list);
    } catch (e) {
      print('[NotificationService] Error recording notification to Hive: $e');
    }
  }

  void _showLocalNotification(RemoteMessage message) {
    try {
      final title = message.notification?.title ?? message.data['title'] ?? 'New Notification';
      final body = message.notification?.body ?? message.data['body'] ?? '';
      final conversationId = message.data['conversationId'] ?? '';
      final type = message.data['type'] ?? 'general';

      // Save notification to history
      _recordNotificationLocally(title, body, type.toString(), message.data);

      List<AndroidNotificationAction>? actions;
      if (type == 'chat' && conversationId.isNotEmpty) {
        actions = <AndroidNotificationAction>[
          const AndroidNotificationAction(
            'reply_action',
            'Reply',
            icon: DrawableResourceAndroidBitmap('@mipmap/ic_launcher'),
            inputs: <AndroidNotificationActionInput>[
              AndroidNotificationActionInput(
                label: 'Type a reply...',
              ),
            ],
            showsUserInterface: false,
          ),
          const AndroidNotificationAction(
            'mark_read_action',
            'Mark as Read',
            showsUserInterface: false,
            cancelNotification: true,
          ),
        ];
      }

      final androidDetails = AndroidNotificationDetails(
        _channel.id,
        _channel.name,
        channelDescription: _channel.description,
        importance: Importance.max,
        priority: Priority.high,
        showWhen: true,
        styleInformation: BigTextStyleInformation(body),
        actions: actions,
      );

      final payloadJson = json.encode({
        'type': type,
        'conversationId': conversationId,
        'data': message.data,
      });

      _localNotifications.show(
        message.hashCode,
        title,
        body,
        NotificationDetails(android: androidDetails),
        payload: payloadJson,
      );
    } catch (e) {
      print('[NotificationService] Error showing local notification: $e');
    }
  }

  /// Public method called by background FCM handler in main.dart
  Future<void> showDataNotification(RemoteMessage message) async {
    // Ensure plugin is initialised (background isolate has a separate engine)
    try {
      const androidInit = AndroidInitializationSettings('@drawable/ic_notification');
      await _localNotifications.initialize(
        const InitializationSettings(android: androidInit),
        onDidReceiveBackgroundNotificationResponse: notificationTapBackground,
      );
      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_channel);
    } catch (_) {}
    _showLocalNotification(message);
  }

  Future<void> initializePusherBeams(String userId) async {
    try {
      print('[NotificationService] Fetching authenticated Pusher Beams config...');
      final response = await ApiClient().dio.get(ApiEndpoints.pusherConfig);
      if (response.statusCode == 200 && response.data != null) {
        final schoolBeamsId = response.data['beamsInstanceId']?.toString();
        if (schoolBeamsId != null && schoolBeamsId.isNotEmpty) {
          if (schoolBeamsId != _beamsInstanceId) {
            print('[NotificationService] Starting Pusher Beams with school-specific instanceId: $schoolBeamsId');
            _beamsInstanceId = schoolBeamsId;
            await PusherBeams.instance.start(_beamsInstanceId!);
          }
        }
      }

      if (_beamsInstanceId == null || _beamsInstanceId!.isEmpty) {
        print('[NotificationService] Cannot set Pusher Beams user ID: Beams is not initialized');
        return;
      }

      print('[NotificationService] Fetching secure session token for Beams token authentication...');
      const storage = FlutterSecureStorage();
      String? token = await storage.read(key: 'session_token');
      String? tokenName = await storage.read(key: 'session_token_name');

      if (token == null || token.isEmpty) {
        try {
          const encryptedStorage = FlutterSecureStorage(
            aOptions: AndroidOptions(encryptedSharedPreferences: true),
          );
          token = await encryptedStorage.read(key: 'session_token');
          tokenName ??= await encryptedStorage.read(key: 'session_token_name');
        } catch (_) {}
      }

      tokenName ??= 'next-auth.session-token';

      if (token == null || token.isEmpty) {
        print('[NotificationService] Session token not found. Skipping Beams authentication.');
        return;
      }

      final BeamsAuthProvider authProvider = BeamsAuthProvider()
        ..authUrl = '${ApiEndpoints.host}/api/v1/chat/beams-auth'
        ..headers = {
          'Cookie': '$tokenName=$token',
        }
        ..queryParams = {'user_id': userId};

      print('[NotificationService] Registering student user ID $userId in Pusher Beams...');
      await PusherBeams.instance.setUserId(
        userId,
        authProvider,
        (error) {
          if (error != null) {
            print('[NotificationService] Pusher Beams setUserId error: $error');
          } else {
            print('[NotificationService] Pusher Beams setUserId SUCCESS for student $userId');
          }
        },
      );
    } catch (e) {
      print('[NotificationService] error setting Pusher Beams User ID: $e');
    }
  }

  Future<void> clearPusherBeams() async {
    try {
      if (_beamsInstanceId == null || _beamsInstanceId!.isEmpty) return;
      print('[NotificationService] Clearing Pusher Beams user registration...');
      await PusherBeams.instance.clearAllState();
    } catch (e) {
      print('[NotificationService] error clearing Pusher Beams state: $e');
    }
  }
}
