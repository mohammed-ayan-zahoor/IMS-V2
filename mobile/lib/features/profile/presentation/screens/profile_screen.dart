import 'package:file_picker/file_picker.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/features/attendance/presentation/providers/attendance_provider.dart';
import 'package:student_app/features/profile/presentation/screens/academic_history_screen.dart';
import 'package:student_app/core/localization/language_picker_sheet.dart';
import 'package:student_app/core/localization/locale_provider.dart';
import 'package:student_app/l10n/app_localizations.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isUploadingPhoto = false;

  Future<void> _pickAndUploadPhoto(BuildContext context) async {
    final l10n = AppLocalizations.of(context);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
      );

      if (result == null || result.files.isEmpty || result.files.first.path == null) {
        return;
      }

      final file = result.files.first;
      setState(() => _isUploadingPhoto = true);

      final uploadRes = await ApiClient().uploadFile(
        filePath: file.path!,
        fileName: file.name,
        fileType: 'image',
      );

      if (uploadRes != null && uploadRes['url'] != null) {
        String uploadedUrl = uploadRes['url'].toString();
        if (uploadedUrl.startsWith('/')) {
          uploadedUrl = '${ApiEndpoints.host}$uploadedUrl';
        }

        final success = await authProvider.updateAvatar(uploadedUrl);
        if (mounted) {
          if (success) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  l10n?.photoUpdateSuccess ?? 'Profile photo updated successfully!',
                  style: GoogleFonts.inter(),
                ),
                backgroundColor: const Color(0xFF16A34A),
              ),
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  l10n?.photoUpdateFailed ?? 'Failed to update profile photo.',
                  style: GoogleFonts.inter(),
                ),
                backgroundColor: const Color(0xFFDC2626),
              ),
            );
          }
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                l10n?.photoUpdateFailed ?? 'Failed to upload photo to server.',
                style: GoogleFonts.inter(),
              ),
              backgroundColor: const Color(0xFFDC2626),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              l10n?.photoUpdateFailed ?? 'Error picking photo. Please try again.',
              style: GoogleFonts.inter(),
            ),
            backgroundColor: const Color(0xFFDC2626),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isUploadingPhoto = false);
      }
    }
  }

  Future<void> _confirmAndRemovePhoto(BuildContext context, {VoidCallback? onSuccess}) async {
    final l10n = AppLocalizations.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: Text(
          l10n?.removePhotoConfirmTitle ?? 'Remove Profile Photo?',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold),
        ),
        content: Text(
          l10n?.removePhotoConfirmMessage ?? 'Are you sure you want to remove your profile photo?',
          style: GoogleFonts.inter(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: Text(
              l10n?.cancel ?? 'Cancel',
              style: GoogleFonts.inter(color: const Color(0xFF64748B)),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            style: TextButton.styleFrom(foregroundColor: const Color(0xFFDC2626)),
            child: Text(
              l10n?.removePhoto ?? 'Remove',
              style: GoogleFonts.inter(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      setState(() => _isUploadingPhoto = true);
      try {
        final authProvider = Provider.of<AuthProvider>(context, listen: false);
        final success = await authProvider.updateAvatar('');
        if (mounted) {
          if (success) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  l10n?.photoRemovedSuccess ?? 'Profile photo removed successfully.',
                  style: GoogleFonts.inter(),
                ),
                backgroundColor: const Color(0xFF16A34A),
              ),
            );
            onSuccess?.call();
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  l10n?.photoUpdateFailed ?? 'Failed to remove profile photo.',
                  style: GoogleFonts.inter(),
                ),
                backgroundColor: const Color(0xFFDC2626),
              ),
            );
          }
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                l10n?.photoUpdateFailed ?? 'Failed to remove profile photo.',
                style: GoogleFonts.inter(),
              ),
              backgroundColor: const Color(0xFFDC2626),
            ),
          );
        }
      } finally {
        if (mounted) {
          setState(() => _isUploadingPhoto = false);
        }
      }
    }
  }

  void _showAvatarActionSheet(BuildContext context, String imageUrl, String studentName) {
    final l10n = AppLocalizations.of(context);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final allowUpload = authProvider.allowStudentPhotoUpload;

    if (!allowUpload) {
      if (imageUrl.isNotEmpty) {
        _openFullScreenImageViewer(context, imageUrl, studentName);
      }
      return;
    }

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      backgroundColor: Colors.white,
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                      color: Color(0xFFEFF6FF),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.add_a_photo_outlined, color: Color(0xFF1D4ED8), size: 20),
                  ),
                  title: Text(
                    l10n?.uploadNewPhoto ?? 'Upload New Photo',
                    style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  subtitle: Text(
                    'Choose a clear face photo from your gallery',
                    style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B)),
                  ),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickAndUploadPhoto(context);
                  },
                ),
                if (imageUrl.isNotEmpty) ...[
                  ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        color: Color(0xFFF1F5F9),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.fullscreen_rounded, color: Color(0xFF334155), size: 20),
                    ),
                    title: Text(
                      l10n?.viewFullPhoto ?? 'View Photo',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                    onTap: () {
                      Navigator.pop(ctx);
                      _openFullScreenImageViewer(context, imageUrl, studentName);
                    },
                  ),
                  ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        color: Color(0xFFFEF2F2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.delete_outline_rounded, color: Color(0xFFDC2626), size: 20),
                    ),
                    title: Text(
                      l10n?.removePhoto ?? 'Remove Photo',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14, color: const Color(0xFFDC2626)),
                    ),
                    onTap: () {
                      Navigator.pop(ctx);
                      _confirmAndRemovePhoto(context);
                    },
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  void _openFullScreenImageViewer(BuildContext context, String imageUrl, String studentName) {
    final l10n = AppLocalizations.of(context);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierColor: Colors.black,
        pageBuilder: (context, animation, secondaryAnimation) {
          return Scaffold(
            backgroundColor: Colors.black,
            appBar: AppBar(
              backgroundColor: Colors.black,
              elevation: 0,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: () => Navigator.of(context).pop(),
              ),
              title: Text(
                studentName,
                style: GoogleFonts.hankenGrotesk(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              actions: [
                if (authProvider.allowStudentPhotoUpload && imageUrl.isNotEmpty)
                  IconButton(
                    icon: const Icon(Icons.delete_outline_rounded, color: Colors.white),
                    tooltip: l10n?.removePhoto ?? 'Remove Photo',
                    onPressed: () {
                      _confirmAndRemovePhoto(context, onSuccess: () {
                        Navigator.of(context).pop();
                      });
                    },
                  ),
              ],
            ),
            body: Center(
              child: InteractiveViewer(
                minScale: 0.5,
                maxScale: 4.0,
                child: Hero(
                  tag: 'profile_avatar_hero',
                  child: imageUrl.isNotEmpty
                      ? Image.network(
                          imageUrl,
                          fit: BoxFit.contain,
                          width: double.infinity,
                          height: double.infinity,
                          errorBuilder: (_, __, ___) => _buildLargeInitialsAvatar(studentName),
                        )
                      : _buildLargeInitialsAvatar(studentName),
                ),
              ),
            ),
          );
        },
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(opacity: animation, child: child);
        },
      ),
    );
  }

    Widget _buildLargeInitialsAvatar(String name) {
    final initials = name.trim().isNotEmpty
        ? name.trim().split(' ').map((e) => e[0]).take(2).join('').toUpperCase()
        : 'ST';
    return Container(
      width: 200,
      height: 200,
      decoration: const BoxDecoration(
        color: Color(0xFF1E3A8A),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          initials,
          style: GoogleFonts.hankenGrotesk(
            color: Colors.white,
            fontSize: 72,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<AuthProvider, AttendanceProvider>(
      builder: (context, authProvider, attProvider, _) {
        final l10n = AppLocalizations.of(context);
        final localeProvider = context.watch<LocaleProvider>();
        final currentLang = LocaleProvider.supportedLanguages.firstWhere(
          (l) => l.code == localeProvider.currentLocale.languageCode,
          orElse: () => LocaleProvider.supportedLanguages.first,
        );
        final user = authProvider.user;
        final String name = authProvider.userName;
        final String email = user?['email'] ?? '';
        final String image = authProvider.userAvatar;
        final String enrollment = user?['enrollmentNumber'] ?? 'N/A';
        
        final profile = (user?['profile'] as Map?) ?? {};
        final String phone = profile['phone']?.toString() ?? 'N/A';
        final String gender = profile['gender']?.toString() ?? 'N/A';
        final String bloodGroup = profile['bloodGroup']?.toString() ?? 'N/A';
        final String fatherName = profile['fatherName']?.toString() ?? '';
        final String motherName = profile['motherName']?.toString() ?? '';
        final String grNumber = profile['grNumber']?.toString() ?? '';
        
        String dobStr = 'N/A';
        if (profile['dateOfBirth'] != null) {
          try {
            final dt = DateTime.parse(profile['dateOfBirth'].toString());
            dobStr = DateFormat('dd MMM yyyy').format(dt);
          } catch (_) {}
        }

        String fullAddress = 'N/A';
        final addr = profile['address'];
        if (addr is Map) {
          final street = addr['street'] ?? '';
          final city = addr['city'] ?? '';
          final state = addr['state'] ?? '';
          final pin = addr['pincode'] ?? '';
          final parts = [street, city, state, pin].where((p) => p.toString().isNotEmpty).join(', ');
          if (parts.isNotEmpty) fullAddress = parts;
        }

        final String instituteName = user?['institute']?['name'] ?? 'Quantech';
        final String instituteCode = user?['institute']?['code'] ?? 'DEFAULT';
        final String instituteType = user?['institute']?['type'] ?? 'SCHOOL';
        final int attendanceRate = attProvider.stats?.rate ?? 0;

        return Scaffold(
          backgroundColor: const Color(0xFFF8F9FF),
          body: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: Column(
              children: [
                // Dark Header Section
                Container(
                  width: double.infinity,
                  color: const Color(0xFF002045),
                  padding: const EdgeInsets.only(top: 56, bottom: 40),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Interactive Tappable Avatar with Camera Badge
                      GestureDetector(
                        onTap: () {
                          if (authProvider.allowStudentPhotoUpload || image.isNotEmpty) {
                            _showAvatarActionSheet(context, image, name);
                          }
                        },
                        child: Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Hero(
                              tag: 'profile_avatar_hero',
                              child: Container(
                                width: 96,
                                height: 96,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: const Color(0xFF1E3A8A),
                                  border: Border.all(
                                    color: const Color(0xFFEFF4FF),
                                    width: 4,
                                  ),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Colors.black26,
                                      blurRadius: 8,
                                      offset: Offset(0, 3),
                                    )
                                  ],
                                ),
                                child: ClipOval(
                                  child: image.isNotEmpty
                                      ? Image.network(
                                          image,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, __, ___) => _buildInitialsAvatar(name),
                                        )
                                      : _buildInitialsAvatar(name),
                                ),
                              ),
                            ),
                            if (_isUploadingPhoto)
                              Positioned.fill(
                                child: Container(
                                  decoration: const BoxDecoration(
                                    color: Colors.black54,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Center(
                                    child: CircularProgressIndicator(
                                      strokeWidth: 3,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ),
                            if (authProvider.allowStudentPhotoUpload)
                              Positioned(
                                bottom: 0,
                                right: 0,
                                child: Container(
                                  width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF2563EB),
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 2.5),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Colors.black38,
                                      blurRadius: 4,
                                      offset: Offset(0, 2),
                                    )
                                  ],
                                ),
                                child: const Icon(
                                  Icons.camera_alt_rounded,
                                  size: 15,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Student Name
                      Text(
                        name,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.hankenGrotesk(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      // Enrollment & Institute tag
                      Text(
                        'ID: $enrollment ${grNumber.isNotEmpty ? '• GR: $grNumber' : ''}\n$instituteName ($instituteCode)',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          color: const Color(0xFF86A0CD),
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),

                // Bento Stats Row (Overlapping Header via translation)
                Transform.translate(
                  offset: const Offset(0, -20),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Row(
                      children: [
                        _buildStatCard(Icons.event_available, 'ATTENDANCE', '$attendanceRate%', const Color(0xFFE6F4EA), const Color(0xFF137333), valueFontSize: 18),
                        const SizedBox(width: 8),
                        _buildStatCard(Icons.school, 'TYPE', authProvider.isDegreeCollege ? 'DEGREE' : (authProvider.isPuCollege ? 'PU COLLEGE' : instituteType), const Color(0xFFD5E0F7), const Color(0xFF002045), valueFontSize: 15),
                        const SizedBox(width: 8),
                        _buildStatCard(Icons.bloodtype, 'BLOOD', bloodGroup, const Color(0xFFFCE8E6), const Color(0xFFA50E0E), valueFontSize: 16),
                      ],
                    ),
                  ),
                ),

                // Profile Info & Actions List
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Column(
                    children: [
                      // Group 1: Personal Details
                      _buildSectionHeader('PERSONAL DETAILS'),
                      const SizedBox(height: 8),
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: const Color(0xFFC4C6CF)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Column(
                          children: [
                            _buildInfoRow(Icons.mail_outline, 'Email Address', email),
                            _buildInfoRow(Icons.phone_outlined, 'Phone Number', phone),
                            _buildInfoRow(Icons.wc, 'Gender', gender),
                            _buildInfoRow(Icons.cake_outlined, 'Date of Birth', dobStr),
                            _buildInfoRow(Icons.home_outlined, 'Residential Address', fullAddress, isLast: true),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Group 2: Parent / Guardian Info
                      if (fatherName.isNotEmpty || motherName.isNotEmpty) ...[
                        _buildSectionHeader('FAMILY & GUARDIAN DETAILS'),
                        const SizedBox(height: 8),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            border: Border.all(color: const Color(0xFFC4C6CF)),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: Column(
                            children: [
                              if (fatherName.isNotEmpty)
                                _buildInfoRow(Icons.person_outline, 'Father\'s Name', fatherName, isLast: motherName.isEmpty),
                              if (motherName.isNotEmpty)
                                _buildInfoRow(Icons.face_3_outlined, 'Mother\'s Name', motherName, isLast: true),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],

                      // Group 3: Institutional Details
                      _buildSectionHeader('INSTITUTIONAL INFORMATION'),
                      const SizedBox(height: 8),
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: const Color(0xFFC4C6CF)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Column(
                          children: [
                            _buildInfoRow(
                              Icons.badge_outlined,
                              authProvider.primaryIdLabel,
                              enrollment,
                            ),
                            if (grNumber.isNotEmpty)
                              _buildInfoRow(
                                Icons.assignment_ind_outlined,
                                authProvider.secondaryIdLabel,
                                grNumber,
                              ),
                            _buildInfoRow(Icons.apartment_outlined, 'Institute Name', '$instituteName ($instituteCode)'),
                            _buildInfoRow(Icons.domain_outlined, 'Academic Type', authProvider.isDegreeCollege ? 'Degree College (Semester-Based)' : (authProvider.isPuCollege ? 'PU College (Pre-University 10+2)' : (authProvider.isSchool ? 'School (K-12 Education)' : 'Vocational Institute')), isLast: true),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Group 4: Academic Journey & Sessions History
                      _buildSectionHeader('ACADEMIC JOURNEY'),
                      const SizedBox(height: 8),
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: const Color(0xFFC4C6CF)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Column(
                          children: [
                            _buildActionRow(
                              Icons.history_edu_outlined,
                              'Academic Sessions & History',
                              isLast: true,
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => const AcademicHistoryScreen(),
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Group: Settings & Preferences
                      _buildSectionHeader(l10n?.settingsAndPreferences.toUpperCase() ?? 'SETTINGS & PREFERENCES'),
                      const SizedBox(height: 8),
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: const Color(0xFFC4C6CF)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Column(
                          children: [
                            _buildActionRow(
                              Icons.language_rounded,
                              l10n?.changeLanguage ?? 'Change Language',
                              trailingText: '${currentLang.nativeName} (${currentLang.englishName})',
                              isLast: true,
                              onTap: () => LanguagePickerSheet.show(context),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Group 5: System Actions
                      _buildSectionHeader(l10n?.profileSection ?? 'Profile'),
                      const SizedBox(height: 8),
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: const Color(0xFFC4C6CF)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Column(
                          children: [
                            _buildActionRow(
                              Icons.logout,
                              l10n?.signOut ?? 'Sign Out',
                              isLast: true,
                              isDestructive: true,
                              onTap: () async {
                                final confirm = await showDialog<bool>(
                                  context: context,
                                  builder: (context) => AlertDialog(
                                    title: Text(l10n?.signOutConfirmTitle ?? 'Sign Out', style: GoogleFonts.hankenGrotesk(fontWeight: FontWeight.bold)),
                                    content: Text(l10n?.signOutConfirmMessage ?? 'Are you sure you want to sign out of your account?', style: GoogleFonts.inter()),
                                    actions: [
                                      TextButton(
                                        onPressed: () => Navigator.pop(context, false),
                                        child: Text(l10n?.cancel ?? 'Cancel', style: GoogleFonts.inter(color: const Color(0xFF545F72))),
                                      ),
                                      ElevatedButton(
                                        onPressed: () => Navigator.pop(context, true),
                                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFBA1A1A)),
                                        child: Text(l10n?.signOut ?? 'Sign Out', style: GoogleFonts.inter(color: Colors.white)),
                                      ),
                                    ],
                                  ),
                                );
                                if (confirm == true) {
                                  await authProvider.logout();
                                }
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Version Label
                      Text(
                        'Quantech Student Portal v1.2.0',
                        style: GoogleFonts.inter(
                          color: const Color(0xFF545F72),
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 80),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildInitialsAvatar(String name) {
    final initials = name.trim().isNotEmpty
        ? name.trim().split(' ').map((e) => e[0]).take(2).join('').toUpperCase()
        : 'ST';
    return Center(
      child: Text(
        initials,
        style: GoogleFonts.hankenGrotesk(
          color: Colors.white,
          fontSize: 32,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  // Helper builder for overlapping Bento Stat Cards
  Widget _buildStatCard(
    IconData icon,
    String label,
    String value,
    Color iconBgColor,
    Color textColor, {
    double valueFontSize = 16,
  }) {
    return Expanded(
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: const Color(0xFFC4C6CF)),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 4,
              offset: const Offset(0, 2),
            )
          ],
        ),
        padding: const EdgeInsets.symmetric(vertical: 14.0, horizontal: 4.0),
        child: Column(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: iconBgColor,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 18, color: textColor),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: GoogleFonts.inter(
                color: const Color(0xFF545F72),
                fontSize: 9,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.hankenGrotesk(
                color: const Color(0xFF002045),
                fontSize: valueFontSize,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Section Group Header Label Builder
  Widget _buildSectionHeader(String label) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.only(left: 4.0),
        child: Text(
          label,
          style: GoogleFonts.inter(
            color: const Color(0xFF545F72),
            fontSize: 10,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.0,
          ),
        ),
      ),
    );
  }

  // Info Display Row
  Widget _buildInfoRow(IconData icon, String label, String value, {bool isLast = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
      decoration: BoxDecoration(
        border: Border(
          bottom: isLast ? BorderSide.none : const BorderSide(color: Color(0xFFC4C6CF), width: 0.5),
        ),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF545F72), size: 20),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF545F72),
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: GoogleFonts.inter(
                    color: const Color(0xFF0D1C2E),
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Action Row Item Builder
  Widget _buildActionRow(
    IconData icon,
    String title, {
    String? trailingText,
    bool isLast = false,
    bool isDestructive = false,
    required VoidCallback onTap,
  }) {
    final Color mainColor = isDestructive ? const Color(0xFFBA1A1A) : const Color(0xFF0D1C2E);

    return Container(
      decoration: BoxDecoration(
        border: Border(
          bottom: isLast ? BorderSide.none : const BorderSide(color: Color(0xFFC4C6CF), width: 0.5),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
            child: Row(
              children: [
                Icon(
                  icon,
                  color: isDestructive ? const Color(0xFFBA1A1A) : const Color(0xFF545F72),
                  size: 20,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    title,
                    style: GoogleFonts.inter(
                      color: mainColor,
                      fontSize: 14,
                      fontWeight: isDestructive ? FontWeight.bold : FontWeight.w500,
                    ),
                  ),
                ),
                if (trailingText != null) ...[
                  Text(
                    trailingText,
                    style: GoogleFonts.inter(
                      color: const Color(0xFF545F72),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(width: 6),
                ],
                Icon(
                  Icons.chevron_right,
                  size: 18,
                  color: isDestructive ? const Color(0xFFBA1A1A) : const Color(0xFF8E9099),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
