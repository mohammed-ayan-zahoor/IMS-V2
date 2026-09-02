import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/features/attendance/presentation/providers/attendance_provider.dart';
import 'package:student_app/features/profile/presentation/screens/academic_history_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  void _openFullScreenImageViewer(BuildContext context, String imageUrl, String studentName) {
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
        final user = authProvider.user;
        final String name = user?['name'] ?? user?['displayName'] ?? 'Student';
        final String email = user?['email'] ?? '';
        final String image = user?['image'] ?? user?['profile']?['avatar'] ?? '';
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
                      // Interactive Tappable Avatar
                      GestureDetector(
                        onTap: () => _openFullScreenImageViewer(context, image, name),
                        child: Hero(
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
                        _buildStatCard(Icons.school, 'TYPE', instituteType, const Color(0xFFD5E0F7), const Color(0xFF002045), valueFontSize: 15),
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
                            _buildInfoRow(Icons.badge_outlined, 'Enrollment Number', enrollment),
                            if (grNumber.isNotEmpty)
                              _buildInfoRow(Icons.assignment_ind_outlined, 'General Register (GR) No.', grNumber),
                            _buildInfoRow(Icons.apartment_outlined, 'Institute Name', '$instituteName ($instituteCode)', isLast: true),
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

                      // Group 5: System Actions
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
                              'Sign Out',
                              isLast: true,
                              isDestructive: true,
                              onTap: () async {
                                final confirm = await showDialog<bool>(
                                  context: context,
                                  builder: (context) => AlertDialog(
                                    title: Text('Sign Out', style: GoogleFonts.hankenGrotesk(fontWeight: FontWeight.bold)),
                                    content: Text('Are you sure you want to sign out of your account?', style: GoogleFonts.inter()),
                                    actions: [
                                      TextButton(
                                        onPressed: () => Navigator.pop(context, false),
                                        child: Text('Cancel', style: GoogleFonts.inter(color: const Color(0xFF545F72))),
                                      ),
                                      ElevatedButton(
                                        onPressed: () => Navigator.pop(context, true),
                                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFBA1A1A)),
                                        child: Text('Sign Out', style: GoogleFonts.inter(color: Colors.white)),
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
                Text(
                  title,
                  style: GoogleFonts.inter(
                    color: mainColor,
                    fontSize: 14,
                    fontWeight: isDestructive ? FontWeight.bold : FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
