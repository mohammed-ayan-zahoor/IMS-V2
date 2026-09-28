import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/core/localization/language_picker_sheet.dart';
import 'package:student_app/core/localization/locale_provider.dart';
import 'package:student_app/features/instructor/dashboard/presentation/providers/instructor_dashboard_provider.dart';
import 'package:student_app/features/instructor/batches/presentation/providers/instructor_batches_provider.dart';
import 'package:student_app/l10n/app_localizations.dart';

class InstructorProfileScreen extends StatefulWidget {
  const InstructorProfileScreen({super.key});

  @override
  State<InstructorProfileScreen> createState() => _InstructorProfileScreenState();
}

class _InstructorProfileScreenState extends State<InstructorProfileScreen> {
  bool _notificationsEnabled = true;

  void _openFullScreenImageViewer(BuildContext context, String imageUrl, String instructorName) {
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
                instructorName,
                style: GoogleFonts.hankenGrotesk(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            body: Center(
              child: InteractiveViewer(
                minScale: 0.5,
                maxScale: 4.0,
                child: Hero(
                  tag: 'instructor_profile_avatar_hero',
                  child: imageUrl.isNotEmpty
                      ? Image.network(
                          imageUrl,
                          fit: BoxFit.contain,
                          width: double.infinity,
                          height: double.infinity,
                          errorBuilder: (context, error, stackTrace) => _buildLargeInitialsAvatar(instructorName),
                        )
                      : _buildLargeInitialsAvatar(instructorName),
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
        : 'TR';
    return Container(
      width: 200,
      height: 200,
      decoration: const BoxDecoration(
        color: Color(0xFF002045),
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
    final auth = context.watch<AuthProvider>();
    final localeProvider = context.watch<LocaleProvider>();
    final dashProvider = context.watch<InstructorDashboardProvider>();
    final batchesProvider = context.watch<InstructorBatchesProvider>();
    final l10n = AppLocalizations.of(context);

    final user = auth.user;
    final String name = auth.userName;
    final String email = user?['email']?.toString() ?? '';
    final String image = auth.userAvatar;

    // Profile details
    final profile = (user?['profile'] as Map?) ?? {};
    final String phone = profile['phone']?.toString() ?? 'N/A';
    final String gender = profile['gender']?.toString() ?? 'N/A';
    final String bloodGroup = profile['bloodGroup']?.toString() ?? 'N/A';

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

    // HR & Institutional details
    final hr = (user?['hrDetails'] as Map?) ?? {};
    final String designation = hr['designation'] is Map
        ? (hr['designation']['name']?.toString() ?? 'Instructor')
        : (user?['designation']?.toString() ?? 'Instructor');
    final String qualification = hr['qualification']?.toString() ?? '';

    String joiningDateStr = '';
    if (hr['joiningDate'] != null) {
      try {
        final dt = DateTime.parse(hr['joiningDate'].toString());
        joiningDateStr = DateFormat('dd MMM yyyy').format(dt);
      } catch (_) {}
    }

    final rawId = (user?['employeeId'] ?? user?['id'] ?? user?['_id'] ?? '').toString();
    final String displayId = rawId.length > 8 ? rawId.substring(0, 8).toUpperCase() : rawId.toUpperCase();

    final institute = user?['institute'] is Map ? user!['institute'] : null;
    final instituteName = institute?['name']?.toString() ?? 'Quantech Academy';
    final instituteCode = institute?['code']?.toString() ?? '';
    final instituteType = institute?['type']?.toString().toUpperCase() ?? auth.instituteType;

    final dashData = dashProvider.dashboardData;
    final totalBatches = dashData?.totalBatches ?? batchesProvider.batches.length;
    final totalStudents = dashData?.totalStudents ?? 0;

    final currentLang = LocaleProvider.supportedLanguages.firstWhere(
      (l) => l.code == localeProvider.currentLocale.languageCode,
      orElse: () => LocaleProvider.supportedLanguages.first,
    );

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
                  // Interactive Tappable Avatar
                  GestureDetector(
                    onTap: () => _openFullScreenImageViewer(context, image, name),
                    child: Hero(
                      tag: 'instructor_profile_avatar_hero',
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
                            ),
                          ],
                        ),
                        child: ClipOval(
                          child: image.isNotEmpty
                              ? Image.network(
                                  image,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) => _buildInitialsAvatar(name),
                                )
                              : _buildInitialsAvatar(name),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Instructor Name
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
                  // Employee ID & Institute info (Professional typography, no blue pill)
                  Text(
                    'ID: $displayId • $designation\n$instituteName ${instituteCode.isNotEmpty ? "($instituteCode)" : ""}',
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

            // Bento Stats Row (Overlapping Header)
            Transform.translate(
              offset: const Offset(0, -20),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Row(
                  children: [
                    _buildStatCard(
                      Icons.meeting_room_outlined,
                      'CLASSES',
                      '$totalBatches',
                      const Color(0xFFE6F4EA),
                      const Color(0xFF137333),
                      valueFontSize: 18,
                    ),
                    const SizedBox(width: 8),
                    _buildStatCard(
                      Icons.people_outline,
                      'STUDENTS',
                      '$totalStudents',
                      const Color(0xFFD5E0F7),
                      const Color(0xFF002045),
                      valueFontSize: 18,
                    ),
                    const SizedBox(width: 8),
                    _buildStatCard(
                      Icons.badge_outlined,
                      'ROLE',
                      'Faculty',
                      const Color(0xFFEFF6FF),
                      const Color(0xFF1D4ED8),
                      valueFontSize: 15,
                    ),
                  ],
                ),
              ),
            ),

            // Profile Sections List
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
                        if (bloodGroup != 'N/A' && bloodGroup.isNotEmpty)
                          _buildInfoRow(Icons.bloodtype_outlined, 'Blood Group', bloodGroup),
                        _buildInfoRow(Icons.home_outlined, 'Residential Address', fullAddress, isLast: true),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Group 2: Institutional & Employment Information
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
                        _buildInfoRow(Icons.badge_outlined, 'Staff / Employee ID', displayId),
                        _buildInfoRow(Icons.work_outline, 'Designation', designation),
                        if (qualification.isNotEmpty)
                          _buildInfoRow(Icons.school_outlined, 'Qualification', qualification),
                        if (joiningDateStr.isNotEmpty)
                          _buildInfoRow(Icons.calendar_today_outlined, 'Joining Date', joiningDateStr),
                        _buildInfoRow(Icons.apartment_outlined, 'Institute Name', '$instituteName ($instituteCode)'),
                        _buildInfoRow(Icons.domain_outlined, 'Institute Type', instituteType, isLast: true),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Group 3: Preferences & Settings
                  _buildSectionHeader('SETTINGS & PREFERENCES'),
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
                          onTap: () => LanguagePickerSheet.show(context),
                        ),
                        _buildSwitchRow(
                          Icons.notifications_outlined,
                          'Push Notifications',
                          _notificationsEnabled,
                          (val) => setState(() => _notificationsEnabled = val),
                        ),
                        _buildInfoRow(
                          Icons.devices_outlined,
                          'App Display',
                          'System Default',
                          isLast: true,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Group 4: Account
                  _buildSectionHeader('ACCOUNT'),
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
                                title: Text(
                                  l10n?.signOut ?? 'Sign Out',
                                  style: GoogleFonts.hankenGrotesk(fontWeight: FontWeight.bold),
                                ),
                                content: Text(
                                  'Are you sure you want to sign out of your account?',
                                  style: GoogleFonts.inter(),
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.pop(context, false),
                                    child: Text(
                                      'Cancel',
                                      style: GoogleFonts.inter(color: const Color(0xFF545F72)),
                                    ),
                                  ),
                                  ElevatedButton(
                                    onPressed: () => Navigator.pop(context, true),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFFBA1A1A),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                    ),
                                    child: Text(
                                      l10n?.signOut ?? 'Sign Out',
                                      style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                            );
                            if (confirm == true) {
                              await auth.logout();
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Version Label
                  Text(
                    'Quantech IMS v1.2.0 • Instructor Portal',
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
  }

  Widget _buildInitialsAvatar(String name) {
    final initials = name.trim().isNotEmpty
        ? name.trim().split(' ').map((e) => e[0]).take(2).join('').toUpperCase()
        : 'TR';
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
            ),
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
                  const SizedBox(width: 4),
                ],
                Icon(
                  Icons.chevron_right_rounded,
                  color: isDestructive ? const Color(0xFFBA1A1A) : const Color(0xFF545F72),
                  size: 18,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSwitchRow(
    IconData icon,
    String title,
    bool value,
    ValueChanged<bool> onChanged, {
    bool isLast = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
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
            child: Text(
              title,
              style: GoogleFonts.inter(
                color: const Color(0xFF0D1C2E),
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Switch.adaptive(
            value: value,
            activeTrackColor: const Color(0xFF002045),
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}
