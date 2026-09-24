import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class LanguageOption {
  final String code;
  final String englishName;
  final String nativeName;

  const LanguageOption({
    required this.code,
    required this.englishName,
    required this.nativeName,
  });
}

class LocaleProvider extends ChangeNotifier {
  static const String _storageKey = 'app_locale_code';
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Locale _currentLocale = const Locale('en');

  Locale get currentLocale => _currentLocale;

  static const List<LanguageOption> supportedLanguages = [
    LanguageOption(code: 'en', englishName: 'English', nativeName: 'English'),
    LanguageOption(code: 'mr', englishName: 'Marathi', nativeName: 'मराठी'),
    LanguageOption(code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी'),
    LanguageOption(code: 'kn', englishName: 'Kannada', nativeName: 'ಕನ್ನಡ'),
    LanguageOption(code: 'te', englishName: 'Telugu', nativeName: 'తెలుగు'),
    LanguageOption(code: 'ta', englishName: 'Tamil', nativeName: 'தமிழ்'),
  ];

  LocaleProvider() {
    _loadSavedLocale();
  }

  Future<void> _loadSavedLocale() async {
    try {
      final savedCode = await _storage.read(key: _storageKey);
      if (savedCode != null && savedCode.isNotEmpty) {
        if (supportedLanguages.any((lang) => lang.code == savedCode)) {
          _currentLocale = Locale(savedCode);
          notifyListeners();
        }
      }
    } catch (_) {}
  }

  Future<void> setLocale(String languageCode) async {
    if (!supportedLanguages.any((lang) => lang.code == languageCode)) return;
    if (_currentLocale.languageCode == languageCode) return;

    _currentLocale = Locale(languageCode);
    notifyListeners();

    try {
      await _storage.write(key: _storageKey, value: languageCode);
    } catch (_) {}
  }
}
