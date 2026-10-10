import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/core/constants/api_endpoints.dart';

class StudentPaywallScreen extends StatefulWidget {
  const StudentPaywallScreen({super.key});

  @override
  State<StudentPaywallScreen> createState() => _StudentPaywallScreenState();
}

class _StudentPaywallScreenState extends State<StudentPaywallScreen> {
  bool _isLoading = true;
  bool _isCheckingStatus = false;
  Map<String, dynamic>? _statusData;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchStatus();
  }

  Future<void> _fetchStatus() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await ApiClient().dio.get(ApiEndpoints.studentSubscriptionStatus);
      if (response.statusCode == 200 && response.data != null && response.data['success'] == true) {
        if (mounted) {
          setState(() {
            _statusData = Map<String, dynamic>.from(response.data);
            _isLoading = false;
          });

          // If payment was already completed, refresh session and proceed
          if (_statusData?['needsPayment'] == false) {
            final auth = Provider.of<AuthProvider>(context, listen: false);
            await auth.checkAuthStatus();
          }
        }
      } else {
        if (mounted) {
          setState(() {
            _errorMessage = response.data?['error']?.toString() ?? 'Failed to load subscription details';
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Network error. Please check your internet connection.';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _openPaymentPortal() async {
    final paywallUri = Uri.parse(ApiEndpoints.studentPaywallWeb);

    try {
      final canLaunch = await canLaunchUrl(paywallUri);
      if (canLaunch) {
        await launchUrl(paywallUri, mode: LaunchMode.externalApplication);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Payment gateway opened. Return here once completed.',
                style: GoogleFonts.inter(fontSize: 13),
              ),
              backgroundColor: const Color(0xFF002045),
              duration: const Duration(seconds: 4),
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Could not open payment link. Please try again.', style: GoogleFonts.inter()),
              backgroundColor: Colors.redAccent,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error launching payment: $e', style: GoogleFonts.inter()),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  Future<void> _verifyAndEnter() async {
    setState(() => _isCheckingStatus = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await auth.checkAuthStatus();

    if (mounted) {
      setState(() => _isCheckingStatus = false);
      if (!auth.needsSubscriptionPayment) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Access activated! Welcome to your student portal.', style: GoogleFonts.inter()),
            backgroundColor: const Color(0xFF059669),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Payment not completed yet. Please complete checkout.', style: GoogleFonts.inter()),
            backgroundColor: const Color(0xFFD97706),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;

    final instituteName = user?['institute']?['name']?.toString() ?? 'Student Portal';
    final studentName = auth.userName;
    final enrollmentNumber = user?['enrollmentNumber']?.toString() ?? '';

    final pricing = _statusData?['pricing'];
    final basePrice = (pricing?['basePrice'] ?? 25).toDouble();
    final gstAmount = (pricing?['gstAmount'] ?? 4.5).toDouble();
    final gatewayFee = (pricing?['gatewayFee'] ?? 0.5).toDouble();
    final totalAmount = (pricing?['totalAmount'] ?? 30).toInt();

    String formattedCycleEnd = 'End of Academic Year';
    if (_statusData?['instituteCycleEnd'] != null) {
      try {
        final parsed = DateTime.parse(_statusData!['instituteCycleEnd'].toString());
        formattedCycleEnd = DateFormat('d MMMM yyyy').format(parsed);
      } catch (_) {}
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Text(
          instituteName,
          style: GoogleFonts.hankenGrotesk(
            color: const Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          TextButton.icon(
            onPressed: () => auth.logout(),
            icon: const Icon(Icons.logout_rounded, size: 16, color: Color(0xFF64748B)),
            label: Text(
              'Sign Out',
              style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B), fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF002045)),
            )
          : RefreshIndicator(
              onRefresh: _fetchStatus,
              color: const Color(0xFF002045),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Student Card Header
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: const Color(0xFF002045),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              studentName.isNotEmpty ? studentName[0].toUpperCase() : 'S',
                              style: GoogleFonts.hankenGrotesk(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 20,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  studentName,
                                  style: GoogleFonts.hankenGrotesk(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: const Color(0xFF0F172A),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  enrollmentNumber.isNotEmpty ? 'Roll No: $enrollmentNumber' : 'Student Account',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: const Color(0xFF64748B),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),

                    // Academic Cycle Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFBFDBFE)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.event_available_rounded, size: 16, color: Color(0xFF2563EB)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Academic Session Access • Valid until $formattedCycleEnd',
                              style: GoogleFonts.inter(
                                fontSize: 11.5,
                                color: const Color(0xFF1D4ED8),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Title & Description
                    Text(
                      'Activate Digital Portal & Smart ID',
                      style: GoogleFonts.hankenGrotesk(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Your school has onboarded your student records. Complete the 1-time annual digital fee to unlock your portal.',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: const Color(0xFF475569),
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Benefits List
                    _buildFeatureItem(
                      icon: Icons.badge_outlined,
                      color: const Color(0xFF059669),
                      title: 'Smart Digital ID Card',
                      subtitle: 'QR-verified identity pass for campus entry & library',
                    ),
                    const SizedBox(height: 10),
                    _buildFeatureItem(
                      icon: Icons.calendar_today_outlined,
                      color: const Color(0xFF2563EB),
                      title: 'Daily Attendance & Instant Alerts',
                      subtitle: 'Track check-ins, holiday alerts, and bus tracking',
                    ),
                    const SizedBox(height: 10),
                    _buildFeatureItem(
                      icon: Icons.assignment_outlined,
                      color: const Color(0xFF7C3AED),
                      title: 'Exams, Results & Syllabus',
                      subtitle: 'Instant report cards, unit test marks, and study files',
                    ),
                    const SizedBox(height: 10),
                    _buildFeatureItem(
                      icon: Icons.chat_bubble_outline_rounded,
                      color: const Color(0xFFD97706),
                      title: 'School Notices & Teacher Chat',
                      subtitle: 'Direct communication with your subject instructors',
                    ),
                    const SizedBox(height: 24),

                    // Itemized Pricing Card
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Fee Breakdown',
                                style: GoogleFonts.hankenGrotesk(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF0F172A),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFECFDF5),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  'Annual Fee',
                                  style: GoogleFonts.inter(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF059669),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const Divider(height: 20, color: Color(0xFFF1F5F9)),
                          _buildPriceRow('ERP Portal & Smart ID Card', '₹${basePrice.toStringAsFixed(2)}'),
                          const SizedBox(height: 8),
                          _buildPriceRow('GST (18%)', '₹${gstAmount.toStringAsFixed(2)}'),
                          const SizedBox(height: 8),
                          _buildPriceRow('Gateway & Platform Processing (2%)', '₹${gatewayFee.toStringAsFixed(2)}'),
                          const Divider(height: 20, color: Color(0xFFE2E8F0)),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Total Payable',
                                style: GoogleFonts.inter(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF0F172A),
                                ),
                              ),
                              Text(
                                '₹$totalAmount.00',
                                style: GoogleFonts.hankenGrotesk(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF002045),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),

                    if (_errorMessage != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFFECACA)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.info_outline_rounded, size: 16, color: Color(0xFFDC2626)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _errorMessage!,
                                style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFFB91C1C), fontWeight: FontWeight.w500),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],

                    // Primary Action: Pay Button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        onPressed: _openPaymentPortal,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF002045),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        icon: const Icon(Icons.payment_rounded, size: 20),
                        label: Text(
                          'Pay ₹$totalAmount.00 via Razorpay',
                          style: GoogleFonts.inter(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Secondary Action: Check / Refresh
                    SizedBox(
                      width: double.infinity,
                      height: 46,
                      child: OutlinedButton.icon(
                        onPressed: _isCheckingStatus ? null : _verifyAndEnter,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF002045),
                          side: const BorderSide(color: Color(0xFFCBD5E1)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        icon: _isCheckingStatus
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF002045)),
                              )
                            : const Icon(Icons.refresh_rounded, size: 18),
                        label: Text(
                          _isCheckingStatus ? 'Verifying...' : 'Already Paid? Verify & Enter',
                          style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),
                    Center(
                      child: Text(
                        'Supports Google Pay, PhonePe, Paytm, UPI & Cards.\nProtected by 256-bit SSL encryption.',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: const Color(0xFF94A3B8),
                          height: 1.4,
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildPriceRow(String label, String amount) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(fontSize: 12.5, color: const Color(0xFF64748B)),
        ),
        Text(
          amount,
          style: GoogleFonts.inter(fontSize: 12.5, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A)),
        ),
      ],
    );
  }

  Widget _buildFeatureItem({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.hankenGrotesk(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: GoogleFonts.inter(
                    fontSize: 11.5,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
