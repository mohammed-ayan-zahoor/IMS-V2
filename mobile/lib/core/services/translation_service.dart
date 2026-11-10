import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

/// Client-side resilient translation service.
/// Automatically translates notice text into regional Indian languages:
/// - kn: Kannada (ಕನ್ನಡ)
/// - hi: Hindi (हिन्दी)
/// - te: Telugu (తెలుగు)
/// - ta: Tamil (தமிழ்)
/// - mr: Marathi (मराठी)
class TranslationService {
  static final Dio _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 8),
    receiveTimeout: const Duration(seconds: 8),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
    },
  ));

  // In-memory cache: "sourceLang|targetLang|text" -> translatedText
  static final Map<String, String> _cache = {};

  /// Translates text into targetLang. Returns original text on any failure.
  static Future<String> translate(
    String text,
    String targetLang, {
    String sourceLang = 'en',
  }) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return text;
    if (targetLang == sourceLang) return text;

    final cacheKey = '$sourceLang|$targetLang|$trimmed';
    if (_cache.containsKey(cacheKey)) {
      return _cache[cacheKey]!;
    }

    try {
      // For longer text (> 350 chars), translate paragraph by paragraph
      if (trimmed.length > 350) {
        final paragraphs = trimmed.split(RegExp(r'\n+'));
        final translatedParagraphs = <String>[];

        for (final p in paragraphs) {
          if (p.trim().isEmpty) {
            translatedParagraphs.add('');
            continue;
          }
          final translated = await _translateChunk(p.trim(), targetLang, sourceLang);
          translatedParagraphs.add(translated);
        }

        final result = translatedParagraphs.join('\n\n');
        _cache[cacheKey] = result;
        return result;
      } else {
        final result = await _translateChunk(trimmed, targetLang, sourceLang);
        _cache[cacheKey] = result;
        return result;
      }
    } catch (e) {
      if (kDebugMode) {
        print('Translation error ($targetLang): $e');
      }
      return text;
    }
  }

  /// Internal single-chunk translation with fallback providers
  static Future<String> _translateChunk(String chunk, String targetLang, String sourceLang) async {
    // 1. Try MyMemory API (Fast, reliable, doesn't block regional Indian languages)
    try {
      final url = 'https://api.mymemory.translated.net/get?q=${Uri.encodeComponent(chunk)}&langpair=$sourceLang|$targetLang';
      final res = await _dio.get(url);
      if (res.statusCode == 200 && res.data != null) {
        final data = res.data is Map ? res.data : jsonDecode(res.data.toString());
        final rawText = data['responseData']?['translatedText']?.toString();
        if (rawText != null &&
            rawText.trim().isNotEmpty &&
            !rawText.toUpperCase().contains('MYMEMORY WARNING') &&
            !rawText.toUpperCase().contains('YOU HAVE USED ALL')) {
          return _decodeHtmlEntities(rawText.trim());
        }
      }
    } catch (_) {}

    // 2. Fallback to Google GTX single endpoint
    try {
      final gUrl = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=$sourceLang&tl=$targetLang&dt=t&q=${Uri.encodeComponent(chunk)}';
      final res = await _dio.get(gUrl);
      if (res.statusCode == 200 && res.data != null) {
        final data = res.data;
        if (data is List && data.isNotEmpty && data[0] is List) {
          final buffer = StringBuffer();
          for (final item in data[0] as List) {
            if (item is List && item.isNotEmpty && item[0] != null) {
              buffer.write(item[0].toString());
            }
          }
          final translated = buffer.toString().trim();
          if (translated.isNotEmpty) {
            return translated;
          }
        }
      }
    } catch (_) {}

    // Return original chunk if all providers fail
    return chunk;
  }

  /// Decodes HTML entities returned by translation APIs
  static String _decodeHtmlEntities(String text) {
    return text
        .replaceAll('&quot;', '"')
        .replaceAll('&apos;', "'")
        .replaceAll('&#39;', "'")
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&nbsp;', ' ');
  }
}
