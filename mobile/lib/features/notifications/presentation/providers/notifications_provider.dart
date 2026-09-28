import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/notifications/data/models/app_notification_model.dart';

class NotificationsProvider extends ChangeNotifier {
  static const String _boxName = 'app_notifications_box';
  static const String _notificationsKey = 'notifications_list';
  static const String _dismissedKey = 'dismissed_notification_ids';

  List<AppNotificationModel> _notifications = [];
  Set<String> _dismissedIds = {};
  bool _isLoading = false;
  String _selectedCategory = 'all';

  List<AppNotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;
  String get selectedCategory => _selectedCategory;

  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  List<AppNotificationModel> get filteredNotifications {
    if (_selectedCategory == 'all') return _notifications;
    if (_selectedCategory == 'fees' || _selectedCategory == 'fee_due') {
      return _notifications.where((n) {
        final t = n.type.toLowerCase();
        return t == 'fee' || t == 'fee_due' || t == 'fee_payment';
      }).toList();
    }
    return _notifications.where((n) => n.type.toLowerCase() == _selectedCategory.toLowerCase()).toList();
  }

  NotificationsProvider() {
    loadNotifications();
  }

  void setCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  Future<void> loadNotifications() async {
    _isLoading = true;
    notifyListeners();

    // 1. Load cached local notifications and dismissed IDs from Hive storage immediately
    try {
      if (!Hive.isBoxOpen(_boxName)) {
        await Hive.openBox(_boxName);
      }
      final box = Hive.box(_boxName);

      final rawDismissed = box.get(_dismissedKey);
      if (rawDismissed != null && rawDismissed is List) {
        _dismissedIds = Set<String>.from(rawDismissed.map((e) => e.toString()));
      }

      final rawList = box.get(_notificationsKey);
      if (rawList != null && rawList is List) {
        _notifications = rawList
            .map((item) => AppNotificationModel.fromMap(Map<String, dynamic>.from(item is String ? json.decode(item) : item)))
            .where((item) => !_dismissedIds.contains(item.id))
            .toList();
        _notifications.sort((a, b) => b.timestamp.compareTo(a.timestamp));
      }
    } catch (e) {
      debugPrint('[NotificationsProvider] Error loading local notifications: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }

    // 2. Non-blocking background sync with MongoDB backend API (/notifications)
    try {
      final response = await ApiClient().dio.get('/notifications');
      if (response.statusCode == 200 && response.data != null && response.data['notifications'] is List) {
        final serverList = (response.data['notifications'] as List)
            .map((item) => AppNotificationModel.fromMap(Map<String, dynamic>.from(item)))
            .toList();

        final existingIds = _notifications.map((n) => n.id).toSet();
        bool hasNew = false;
        for (final serverNotif in serverList) {
          // Do not repopulate if previously dismissed or cleared by the user
          if (!_dismissedIds.contains(serverNotif.id) && !existingIds.contains(serverNotif.id)) {
            _notifications.add(serverNotif);
            existingIds.add(serverNotif.id);
            hasNew = true;
          }
        }
        if (hasNew) {
          _notifications.sort((a, b) => b.timestamp.compareTo(a.timestamp));
          await _saveToStorage();
          notifyListeners();
        }
      }
    } catch (e) {
      debugPrint('[NotificationsProvider] API notification sync error: $e');
    }
  }

  Future<void> addNotification({
    required String title,
    required String body,
    required String type,
    Map<String, dynamic> data = const {},
  }) async {
    final newNotif = AppNotificationModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: title,
      body: body,
      type: type,
      timestamp: DateTime.now(),
      isRead: false,
      data: data,
    );

    _notifications.insert(0, newNotif);
    notifyListeners();
    await _saveToStorage();
  }

  Future<void> markAsRead(String id) async {
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index != -1 && !_notifications[index].isRead) {
      _notifications[index] = _notifications[index].copyWith(isRead: true);
      notifyListeners();
      await _saveToStorage();
      try {
        await ApiClient().dio.patch('/notifications', data: {'notificationId': id});
      } catch (e) {
        debugPrint('[NotificationsProvider] API mark read error: $e');
      }
    }
  }

  Future<void> markAllAsRead() async {
    bool hasChanges = false;
    for (int i = 0; i < _notifications.length; i++) {
      if (!_notifications[i].isRead) {
        _notifications[i] = _notifications[i].copyWith(isRead: true);
        hasChanges = true;
      }
    }
    if (hasChanges) {
      notifyListeners();
      await _saveToStorage();
      try {
        await ApiClient().dio.post('/notifications/read-all');
      } catch (e) {
        debugPrint('[NotificationsProvider] API mark all read error: $e');
      }
    }
  }

  Future<void> deleteNotification(String id) async {
    _dismissedIds.add(id);
    _notifications.removeWhere((n) => n.id == id);
    notifyListeners();
    await _saveToStorage();
    try {
      await ApiClient().dio.delete('/notifications', queryParameters: {'id': id});
    } catch (e) {
      debugPrint('[NotificationsProvider] API notification delete error: $e');
    }
  }

  Future<void> clearAll() async {
    for (final notif in _notifications) {
      _dismissedIds.add(notif.id);
    }
    _notifications.clear();
    notifyListeners();
    await _saveToStorage();
    try {
      await ApiClient().dio.delete('/notifications');
    } catch (e) {
      debugPrint('[NotificationsProvider] API notification clearAll error: $e');
    }
  }

  Future<void> _saveToStorage() async {
    try {
      if (!Hive.isBoxOpen(_boxName)) {
        await Hive.openBox(_boxName);
      }
      final box = Hive.box(_boxName);
      final serializedList = _notifications.map((n) => n.toMap()).toList();
      await box.put(_notificationsKey, serializedList);
      final dismissedList = _dismissedIds.length > 500
          ? _dismissedIds.toList().sublist(_dismissedIds.length - 500)
          : _dismissedIds.toList();
      await box.put(_dismissedKey, dismissedList);
    } catch (e) {
      debugPrint('[NotificationsProvider] Error saving notifications to storage: $e');
    }
  }
}
