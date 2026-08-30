import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/core/constants/api_endpoints.dart';

class AppUpdateService {
  static final AppUpdateService instance = AppUpdateService._internal();
  AppUpdateService._internal();

  static const String _lastSeenBuildKey = 'last_seen_app_build_mtime';
  static const String _lastSeenVersionCodeKey = 'last_seen_app_version_code';
  static const int currentVersionCode = 2;
  static bool _hasCheckedThisSession = false;

  Future<void> checkForUpdates(BuildContext context, {bool forceCheck = false}) async {
    if (_hasCheckedThisSession && !forceCheck) return;
    _hasCheckedThisSession = true;

    try {
      final response = await ApiClient().dio.get(ApiEndpoints.appVersion);
      if (response.statusCode != 200 || response.data == null) return;

      final data = Map<String, dynamic>.from(response.data);
      final int serverVersionCode = data['versionCode'] ?? 1;
      final int serverLastModified = data['lastModified'] ?? 0;
      final String releaseNotes = data['releaseNotes'] ?? 'A new version of the app is available.';
      final String downloadUrl = data['downloadUrl'] ?? ApiEndpoints.appDownload;
      final bool forceUpdate = data['forceUpdate'] ?? false;

      const storage = FlutterSecureStorage();
      final storedTimeVal = await storage.read(key: _lastSeenBuildKey);
      final storedVersionVal = await storage.read(key: _lastSeenVersionCodeKey);

      final int localLastModified = storedTimeVal != null ? (int.tryParse(storedTimeVal) ?? 0) : 0;
      final int localVersionCode = storedVersionVal != null ? (int.tryParse(storedVersionVal) ?? 0) : currentVersionCode;

      // If user has already acknowledged this server build, do not prompt again!
      if (localVersionCode >= serverVersionCode && localLastModified > 0 && localLastModified >= serverLastModified) {
        return;
      }

      // Check if server version is higher than installed version code AND higher than previously acknowledged code
      final bool isNewerVersion = serverVersionCode > currentVersionCode && serverVersionCode > localVersionCode;
      final bool isNewerFile = localLastModified > 0 && serverLastModified > localLastModified;

      if (isNewerVersion || isNewerFile) {
        if (!context.mounted) return;
        _showUpdateModal(
          context: context,
          releaseNotes: releaseNotes,
          downloadUrl: downloadUrl,
          serverVersionCode: serverVersionCode,
          serverMtime: serverLastModified,
          forceUpdate: forceUpdate,
        );
      }
    } catch (e) {
      debugPrint('[AppUpdateService] Version check error: $e');
    }
  }

  void _showUpdateModal({
    required BuildContext context,
    required String releaseNotes,
    required String downloadUrl,
    required int serverVersionCode,
    required int serverMtime,
    required bool forceUpdate,
  }) {
    showDialog(
      context: context,
      barrierDismissible: !forceUpdate,
      builder: (ctx) {
        final fullDownloadUrl = downloadUrl.startsWith('http')
            ? downloadUrl
            : '${ApiEndpoints.host}$downloadUrl';

        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          elevation: 8,
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Icon Header
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: const Color(0xFF002045).withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.system_update_rounded,
                    color: Color(0xFF002045),
                    size: 28,
                  ),
                ),
                const SizedBox(height: 16),

                // Title
                Text(
                  'Update Available!',
                  style: GoogleFonts.hankenGrotesk(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0D1C2E),
                  ),
                ),
                const SizedBox(height: 8),

                // Subtitle / Notes
                Text(
                  releaseNotes,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: const Color(0xFF64748B),
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 24),

                // Buttons
                Column(
                  children: [
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF002045),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        onPressed: () async {
                          const storage = FlutterSecureStorage();
                          await storage.write(key: _lastSeenBuildKey, value: serverMtime.toString());
                          await storage.write(key: _lastSeenVersionCodeKey, value: serverVersionCode.toString());
                          
                          final uri = Uri.parse(fullDownloadUrl);
                          if (await canLaunchUrl(uri)) {
                            await launchUrl(uri, mode: LaunchMode.externalApplication);
                          }
                          if (!forceUpdate && ctx.mounted) {
                            Navigator.of(ctx).pop();
                          }
                        },
                        child: Text(
                          'DOWNLOAD UPDATE',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ),
                    if (!forceUpdate) ...[
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () async {
                          // Remember this acknowledged version so user isn't spammed
                          const storage = FlutterSecureStorage();
                          await storage.write(key: _lastSeenBuildKey, value: serverMtime.toString());
                          await storage.write(key: _lastSeenVersionCodeKey, value: serverVersionCode.toString());
                          if (ctx.mounted) Navigator.of(ctx).pop();
                        },
                        child: Text(
                          'Later',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF94A3B8),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
