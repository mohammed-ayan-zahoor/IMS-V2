import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/core/constants/api_endpoints.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        final instituteName = auth.instituteName?.trim() ?? '';
        final logoUrl = ApiEndpoints.resolveUrl(auth.instituteLogo);
        final hasInstitute = instituteName.isNotEmpty;

        return Scaffold(
          backgroundColor: const Color(0xFF002045), // Matches native splash #002045 perfectly
          body: Container(
            width: double.infinity,
            height: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF001125), // Midnight navy
                  Color(0xFF002045), // Brand primary navy
                  Color(0xFF072B56), // Deep sapphire
                ],
              ),
            ),
            child: SafeArea(
              child: Column(
                children: [
                  const Spacer(flex: 3),

                  // Hero: Institute Logo or Educational Crest
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 350),
                    curve: Curves.easeOutCubic,
                    width: 130,
                    height: 130,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(28),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.25),
                          blurRadius: 28,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: (logoUrl != null && logoUrl.isNotEmpty)
                        ? Image.network(
                            logoUrl,
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => _buildFallbackCrest(instituteName),
                            loadingBuilder: (context, child, loadingProgress) {
                              if (loadingProgress == null) return child;
                              return const Center(
                                child: SizedBox(
                                  width: 28,
                                  height: 28,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF002045)),
                                  ),
                                ),
                              );
                            },
                          )
                        : _buildFallbackCrest(instituteName),
                  ),

                  const SizedBox(height: 32),

                  // Institute Title
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Text(
                      hasInstitute ? instituteName : 'Quantech Campus',
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.hankenGrotesk(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                      ),
                    ),
                  ),

                  const SizedBox(height: 10),

                  // Subtitle & Status
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 40),
                    child: Text(
                      hasInstitute
                          ? (auth.isAuthenticated && auth.userName.isNotEmpty
                              ? 'Welcome back, ${auth.userFirstName}'
                              : 'Connecting to your campus portal...')
                          : 'Setting things up for you...',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        color: const Color(0xFF86A0CD), // Soft on-primary accent
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        height: 1.4,
                      ),
                    ),
                  ),

                  const SizedBox(height: 28),

                  // Smooth Branded Loader
                  const SizedBox(
                    width: 26,
                    height: 26,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFBFF0E4)), // Soft Teal
                    ),
                  ),

                  const Spacer(flex: 4),

                  // Bottom Attribution
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.school_rounded,
                          size: 14,
                          color: Color(0xFF86A0CD),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'POWERED BY QUANTECH',
                          style: GoogleFonts.inter(
                            color: const Color(0xFF86A0CD),
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildFallbackCrest(String instituteName) {
    final initial = instituteName.trim().isNotEmpty
        ? instituteName.trim().substring(0, 1).toUpperCase()
        : 'Q';

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFEFF4FF),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Center(
        child: Text(
          initial,
          style: GoogleFonts.hankenGrotesk(
            color: const Color(0xFF002045),
            fontSize: 42,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}
