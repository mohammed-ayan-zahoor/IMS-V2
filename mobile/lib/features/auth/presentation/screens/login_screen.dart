import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_app/features/dashboard/presentation/screens/dashboard_screen.dart';

import 'package:provider/provider.dart';
import 'package:student_app/core/auth/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  
  bool _obscurePassword = true;
  bool _isAuthenticating = false;
  bool _accessGranted = false;

  bool _emailHasError = false;
  bool _passwordHasError = false;

  final FocusNode _emailFocus = FocusNode();
  final FocusNode _passwordFocus = FocusNode();

  Color _emailIconColor = const Color(0xFF545F72);
  Color _passwordIconColor = const Color(0xFF545F72);

  // Shake Animation
  late final AnimationController _shakeController;
  late final Animation<double> _shakeAnimation;

  @override
  void initState() {
    super.initState();
    
    _emailFocus.addListener(() {
      setState(() {
        _emailIconColor = _emailFocus.hasFocus ? const Color(0xFF002045) : const Color(0xFF545F72);
        if (_emailFocus.hasFocus) {
          _emailHasError = false;
        }
      });
    });
    
    _passwordFocus.addListener(() {
      setState(() {
        _passwordIconColor = _passwordFocus.hasFocus ? const Color(0xFF002045) : const Color(0xFF545F72);
        if (_passwordFocus.hasFocus) {
          _passwordHasError = false;
        }
      });
    });

    _shakeController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );

    _shakeAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 12.0), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 12.0, end: -12.0), weight: 1),
      TweenSequenceItem(tween: Tween(begin: -12.0, end: 8.0), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 8.0, end: -8.0), weight: 1),
      TweenSequenceItem(tween: Tween(begin: -8.0, end: 5.0), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 5.0, end: -5.0), weight: 1),
      TweenSequenceItem(tween: Tween(begin: -5.0, end: 0.0), weight: 1),
    ]).animate(CurvedAnimation(parent: _shakeController, curve: Curves.easeIn));
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    _shakeController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    setState(() {
      _emailHasError = email.isEmpty || !email.contains('@');
      _passwordHasError = password.isEmpty || password.length < 4;
    });

    if (_emailHasError || _passwordHasError) {
      _shakeController.forward(from: 0.0);
      return;
    }

    setState(() {
      _isAuthenticating = true;
    });

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await authProvider.login(
      email: email,
      password: password,
    );

    if (mounted) {
      if (success) {
        setState(() {
          _isAuthenticating = false;
          _accessGranted = true;
        });

        Future.delayed(const Duration(milliseconds: 400), () {
          if (mounted) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (context) => const DashboardScreen()),
            );
          }
        });
      } else {
        setState(() {
          _isAuthenticating = false;
        });
        _shakeController.forward(from: 0.0);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProvider.errorMessage ?? 'Login failed. Check Institute Code & Credentials.'),
            backgroundColor: const Color(0xFFBA1A1A),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent, // transparent status background
        statusBarIconBrightness: Brightness.light, // white status icons on Android
        statusBarBrightness: Brightness.dark, // white status icons on iOS
      ),
      child: Scaffold(
        backgroundColor: const Color(0xFFF8F9FF),
        body: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              physics: const ClampingScrollPhysics(),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: constraints.maxHeight,
                ),
                child: IntrinsicHeight(
                  child: Column(
                    children: [
                      // Top 60% Brand Panel (Asymmetric Split)
                      Expanded(
                        flex: 6,
                        child: Stack(
                          children: [
                            // Background Gradient
                            Container(
                              decoration: const BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                  colors: [
                                    Color(0xFF001125), // Midnight navy
                                    Color(0xFF002045), // Brand primary
                                    Color(0xFF0A366C), // Glowing indigo-blue
                                  ],
                                  stops: [0.0, 0.45, 1.0],
                                ),
                              ),
                            ),
                            
                            // Brand Ambient Grid Pattern
                            Positioned.fill(
                              child: CustomPaint(
                                painter: DotGridPainter(),
                              ),
                            ),
      
                            // Abstract geometric lines
                            Positioned(
                              top: -mediaQuery.size.height * 0.1,
                              right: -mediaQuery.size.width * 0.15,
                              child: Transform.rotate(
                                angle: 45 * 3.14159 / 180,
                                child: Container(
                                  width: 240,
                                  height: 240,
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: const Color(0xFF86A0CD).withValues(alpha: 0.12),
                                      width: 1,
                                    ),
                                  ),
                                ),
                              ),
                            ),
      
                            Positioned(
                              top: mediaQuery.size.height * 0.08,
                              left: -48,
                              child: Container(
                                width: 180,
                                height: 180,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: const Color(0xFF86A0CD).withValues(alpha: 0.08),
                                    width: 1,
                                  ),
                                ),
                              ),
                            ),
      
                            // Identity Content
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.end,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(
                                        Icons.school,
                                        color: Colors.white,
                                        size: 28,
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Quantech',
                                        style: GoogleFonts.hankenGrotesk(
                                          color: Colors.white,
                                          fontSize: 22,
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: -0.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    'Welcome Back.',
                                    style: GoogleFonts.hankenGrotesk(
                                      color: Colors.white,
                                      fontSize: 28,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Padding(
                                    padding: const EdgeInsets.only(right: 32.0),
                                    child: Text(
                                      'Securely access your academic resources and institutional management portal.',
                                      style: GoogleFonts.inter(
                                        color: const Color(0xFF86A0CD), // on-primary-container
                                        fontSize: 14,
                                        fontWeight: FontWeight.w400,
                                        height: 1.45,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
      
                      // Bottom 40% Login Form
                      Expanded(
                        flex: 4,
                        child: Container(
                          color: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              // Input Group: Email
                              Text(
                                'EMAIL ADDRESS',
                                style: GoogleFonts.inter(
                                  color: const Color(0xFF545F72),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  letterSpacing: 1.5,
                                ),
                              ),
                              const SizedBox(height: 4),
                              AnimatedBuilder(
                                animation: _shakeAnimation,
                                builder: (context, child) {
                                  return Transform.translate(
                                    offset: Offset(_emailHasError ? _shakeAnimation.value : 0.0, 0.0),
                                    child: Container(
                                      height: 48,
                                      decoration: BoxDecoration(
                                        color: _emailHasError ? const Color(0xFFFFDAD6) : const Color(0xFFEFF4FF),
                                        border: Border.all(
                                          color: _emailHasError ? const Color(0xFFBA1A1A) : Colors.transparent,
                                          width: _emailHasError ? 1.5 : 0,
                                        ),
                                      ),
                                      child: TextFormField(
                                        controller: _emailController,
                                        focusNode: _emailFocus,
                                        keyboardType: TextInputType.emailAddress,
                                        cursorColor: const Color(0xFF002045),
                                        style: GoogleFonts.inter(
                                          color: const Color(0xFF0D1C2E),
                                          fontSize: 15,
                                        ),
                                        decoration: InputDecoration(
                                          prefixIcon: Icon(
                                            Icons.mail_outline,
                                            color: _emailHasError ? const Color(0xFFBA1A1A) : _emailIconColor,
                                            size: 18,
                                          ),
                                          hintText: 'name@quantech.edu',
                                          hintStyle: GoogleFonts.inter(
                                            color: const Color(0xFF545F72).withValues(alpha: 0.5),
                                            fontSize: 15,
                                          ),
                                          border: InputBorder.none,
                                          contentPadding: const EdgeInsets.symmetric(vertical: 12),
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              ),
                              const SizedBox(height: 12),
      
                              // Input Group: Password
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'PASSWORD',
                                    style: GoogleFonts.inter(
                                      color: const Color(0xFF545F72),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w500,
                                      letterSpacing: 1.5,
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: () {},
                                    child: Text(
                                      'Forgot?',
                                      style: GoogleFonts.inter(
                                        color: const Color(0xFF002045),
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              AnimatedBuilder(
                                animation: _shakeAnimation,
                                builder: (context, child) {
                                  return Transform.translate(
                                    offset: Offset(_passwordHasError ? _shakeAnimation.value : 0.0, 0.0),
                                    child: Container(
                                      height: 48,
                                      decoration: BoxDecoration(
                                        color: _passwordHasError ? const Color(0xFFFFDAD6) : const Color(0xFFEFF4FF),
                                        border: Border.all(
                                          color: _passwordHasError ? const Color(0xFFBA1A1A) : Colors.transparent,
                                          width: _passwordHasError ? 1.5 : 0,
                                        ),
                                      ),
                                      child: TextFormField(
                                        controller: _passwordController,
                                        focusNode: _passwordFocus,
                                        obscureText: _obscurePassword,
                                        cursorColor: const Color(0xFF002045),
                                        style: GoogleFonts.inter(
                                          color: const Color(0xFF0D1C2E),
                                          fontSize: 15,
                                        ),
                                        decoration: InputDecoration(
                                          prefixIcon: Icon(
                                            Icons.lock_outline,
                                            color: _passwordHasError ? const Color(0xFFBA1A1A) : _passwordIconColor,
                                            size: 18,
                                          ),
                                          suffixIcon: IconButton(
                                            icon: Icon(
                                              _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                              color: const Color(0xFF545F72),
                                              size: 18,
                                            ),
                                            onPressed: () {
                                              setState(() {
                                                _obscurePassword = !_obscurePassword;
                                              });
                                            },
                                          ),
                                          hintText: '••••••••',
                                          hintStyle: GoogleFonts.inter(
                                            color: const Color(0xFF545F72).withValues(alpha: 0.5),
                                            fontSize: 15,
                                          ),
                                          border: InputBorder.none,
                                          contentPadding: const EdgeInsets.symmetric(vertical: 12),
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              ),
                              const SizedBox(height: 16),
      
                              // Submit Action Button
                              SizedBox(
                                width: double.infinity,
                                height: 48,
                                child: ElevatedButton(
                                  onPressed: (_isAuthenticating || _accessGranted) ? null : _handleLogin,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: _accessGranted 
                                        ? const Color(0xFF003765)
                                        : const Color(0xFF002045),
                                    foregroundColor: Colors.white,
                                    disabledBackgroundColor: _accessGranted 
                                        ? const Color(0xFF003765) 
                                        : const Color(0xFF002045).withValues(alpha: 0.6),
                                    disabledForegroundColor: Colors.white70,
                                    shape: const RoundedRectangleBorder(
                                      borderRadius: BorderRadius.zero,
                                    ),
                                    elevation: 0,
                                  ),
                                  child: Text(
                                    _accessGranted 
                                        ? 'ACCESS GRANTED' 
                                        : (_isAuthenticating ? 'AUTHENTICATING...' : 'LOGIN'),
                                    style: GoogleFonts.hankenGrotesk(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                      letterSpacing: 1.5,
                                    ),
                                  ),
                                ),
                              ),
                              
                              const SizedBox(height: 14),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    "Don't have an account?",
                                    style: GoogleFonts.inter(
                                      color: const Color(0xFF545F72),
                                      fontSize: 13,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  GestureDetector(
                                    onTap: () {},
                                    child: Text(
                                      'Sign Up',
                                      style: GoogleFonts.hankenGrotesk(
                                        color: const Color(0xFF002045),
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

// Dot grid painter simulating brand-pattern
class DotGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.03)
      ..style = PaintingStyle.fill;

    const double spacing = 24.0;
    for (double x = 0; x < size.width; x += spacing) {
      for (double y = 0; y < size.height; y += spacing) {
        canvas.drawCircle(Offset(x, y), 0.8, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant DotGridPainter oldDelegate) => false;
}
