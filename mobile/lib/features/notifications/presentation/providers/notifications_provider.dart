import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:student_app/features/notifications/data/models/app_notification_model.dart';

class NotificationsProvider extends ChangeNotifier {
  static const String _boxName = 'app_notifications_box';
  static const String _notificationsKey = 'notifications_list';

  List<AppNotificationModel> _notifications = [];
  bool _isLoading = false;
  String _selectedCategory = 'all';

  List<AppNotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;
  String get selectedCategory => _selectedCategory;

  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  List<AppNotificationModel> get filteredNotifications {
    if (_selectedCategory == 'all') return _notifications;
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

    try {
      if (!Hive.isBoxOpen(_boxName)) {
        await Hive.openBox(_boxName);
      }
      final box = Hive.box(_boxName);
      final rawList = box.get(_notificationsKey);

      if (rawList != null && rawList is List) {
        _notifications = rawList
            .map((item) => AppNotificationModel.fromMap(Map<String, dynamic>.from(item is String ? json.decode(item) : item)))
            .toList();
        // Sort newest first
        _notifications.sort((a, b) => b.timestamp.compareTo(a.timestamp));
      }
    } catch (e) {
      debugPrint('[NotificationsProvider] Error loading notifications: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
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
    }
  }

  Future<void> deleteNotification(String id) async {
    _notifications.removeWhere((n) => n.id == id);
    notifyListeners();
    await _saveToStorage();
  }

  Future<void> clearAll() async {
    _notifications.clear();
    notifyListeners();
    await _saveToStorage();
  }

  Future<void> _saveToStorage() async {
    try {
      if (!Hive.isBoxOpen(_boxName)) {
        await Hive.openBox(_boxName);
      }
      final box = Hive.box(_boxName);
      final serializedList = _notifications.map((n) => n.toMap()).toList();
      await box.put(_notificationsKey, serializedList);
    } catch (e) {
      debugPrint('[NotificationsProvider] Error saving notifications to storage: $e');
    }
  }
}
