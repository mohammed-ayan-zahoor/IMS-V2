import 'package:flutter/material.dart';
import 'package:student_app/core/services/translation_service.dart';
import 'package:student_app/features/notices/data/models/notice_model.dart';
import 'package:student_app/features/notices/data/repositories/notices_repository.dart';

class NoticesProvider extends ChangeNotifier {
  final NoticesRepository _repository = NoticesRepository();

  bool _isLoading = false;
  bool _isTranslating = false;
  String? _translatingLanguage;
  String? _errorMessage;
  List<NoticeModel> _notices = [];
  final Set<String> _readNoticeIds = {};
  String _selectedCategory = 'All';
  String _searchQuery = '';

  bool get isLoading => _isLoading;
  bool get isTranslating => _isTranslating;
  String? get translatingLanguage => _translatingLanguage;
  String? get errorMessage => _errorMessage;
  List<NoticeModel> get notices => _notices;
  Set<String> get readNoticeIds => _readNoticeIds;
  String get selectedCategory => _selectedCategory;
  String get searchQuery => _searchQuery;

  NoticesProvider() {
    loadNotices();
  }

  void setSelectedCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void markAsRead(String id) {
    _readNoticeIds.add(id);
    notifyListeners();
  }

  bool isRead(String id) => _readNoticeIds.contains(id);

  List<NoticeModel> get filteredNotices {
    return _notices.where((n) {
      final matchesCat = _selectedCategory == 'All' || n.categoryDisplay.toLowerCase() == _selectedCategory.toLowerCase();
      final matchesSearch = _searchQuery.isEmpty ||
          n.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          n.content.toLowerCase().contains(_searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    }).toList();
  }

  Future<void> loadNotices({bool refresh = false, String? targetLang}) async {
    if (_notices.isNotEmpty && !refresh) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _repository.fetchNotices();
      if (res != null) {
        _notices = res.notices;
        if (targetLang != null && targetLang != 'en') {
          ensureTranslations(targetLang);
        }
      } else {
        _errorMessage = 'Failed to load notices.';
      }
    } catch (e) {
      _errorMessage = 'Network connection error.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Automatically translates notices into the given language code if not already available
  Future<void> ensureTranslations(String langCode) async {
    if (langCode == 'en' || _notices.isEmpty) return;

    final untranslated = _notices.where((n) => !n.hasTranslationFor(langCode)).toList();
    if (untranslated.isEmpty) return;

    _isTranslating = true;
    _translatingLanguage = langCode;
    notifyListeners();

    try {
      for (final notice in untranslated) {
        final transTitle = await TranslationService.translate(notice.title, langCode);
        final transContent = await TranslationService.translate(notice.content, langCode);

        notice.addTranslation(
          langCode,
          title: transTitle.isNotEmpty ? transTitle : notice.title,
          content: transContent.isNotEmpty ? transContent : notice.content,
        );
        // Progressively update UI so the student sees translations appear immediately
        notifyListeners();
      }
    } catch (_) {
      // Gracefully continue with available translations
    } finally {
      _isTranslating = false;
      _translatingLanguage = null;
      notifyListeners();
    }
  }
}
