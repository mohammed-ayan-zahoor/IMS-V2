import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/features/vault/presentation/providers/vault_provider.dart';
import 'package:student_app/features/vault/data/models/vault_model.dart';
import 'package:url_launcher/url_launcher.dart';

class VaultScreen extends StatefulWidget {
  const VaultScreen({super.key});

  @override
  State<VaultScreen> createState() => _VaultScreenState();
}

class _VaultScreenState extends State<VaultScreen> {
  String _selectedCategory = 'All'; // All, Academic, Identity, Certificates

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        Provider.of<VaultProvider>(context, listen: false).loadDocuments(refresh: true);
      }
    });
  }

  IconData _getCategoryIcon(String category) {
    switch (category.toLowerCase()) {
      case 'aadhar':
      case 'identity':
        return Icons.badge_outlined;
      case 'photo':
        return Icons.person_outline;
      case 'marksheet':
      case 'academic':
        return Icons.description_outlined;
      case 'certificate':
      case 'certificates':
        return Icons.workspace_premium_outlined;
      default:
        return Icons.folder_open_outlined;
    }
  }

  Color _getCategoryColor(String category) {
    switch (category.toLowerCase()) {
      case 'aadhar':
      case 'identity':
        return const Color(0xFF002045);
      case 'photo':
        return const Color(0xFF059669);
      case 'marksheet':
      case 'academic':
        return const Color(0xFF2563EB);
      case 'certificate':
      case 'certificates':
        return const Color(0xFFD97706);
      default:
        return const Color(0xFF7C3AED);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;

    return Consumer<VaultProvider>(
      builder: (context, vaultProvider, _) {
        return Scaffold(
          backgroundColor: const Color(0xFFF8F9FF),
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0.5,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Color(0xFF002045)),
              onPressed: () => Navigator.pop(context),
            ),
            title: Text(
              'Document Vault',
              style: GoogleFonts.hankenGrotesk(
                color: const Color(0xFF002045),
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            centerTitle: true,
          ),
          body: vaultProvider.isLoading
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF002045)))
              : RefreshIndicator(
                  onRefresh: () => vaultProvider.loadDocuments(refresh: true),
                  color: const Color(0xFF002045),
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                    padding: const EdgeInsets.all(16.0),
                    children: [
                      // Branded Digital ID Header Banner
                      _buildDigitalIdCard(context, user),

                      const SizedBox(height: 20),

                      // Category Filters
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        child: Row(
                          children: [
                            _buildFilterChip('All', Icons.all_inbox, 'All Documents'),
                            const SizedBox(width: 8),
                            _buildFilterChip('Identity', Icons.badge_outlined, 'Identity & KYC'),
                            const SizedBox(width: 8),
                            _buildFilterChip('Academic', Icons.school_outlined, 'Academic Records'),
                            const SizedBox(width: 8),
                            _buildFilterChip('Certificates', Icons.workspace_premium_outlined, 'Certificates'),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Filtered Document List Section
                      _buildDocumentList(context, vaultProvider),
                    ],
                  ),
                ),
        );
      },
    );
  }

  Widget _buildDigitalIdCard(BuildContext context, Map<String, dynamic>? user) {
    final String fullName = user?['fullName'] ?? user?['name'] ?? 'Student';
    final String rawId = user?['studentId'] ?? user?['id'] ?? user?['_id'];
    final String enrollmentNo = (rawId != null && rawId.length >= 8) ? rawId.substring(0, 8).toUpperCase() : 'N/A';
    final String instituteName = user?['institute']?['name'] ?? 'Quantech Learning Institute';
    final String avatarUrl = (user?['avatar'] ?? user?['image'] ?? (user?['profile'] as Map?)?['avatar'] ?? '').toString();
    final String initials = fullName.trim().isNotEmpty
        ? fullName.trim().split(' ').map((e) => e[0]).take(2).join('').toUpperCase()
        : 'ST';

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF002045),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF002045).withValues(alpha: 0.2),
            blurRadius: 12,
            offset: const Offset(0, 6),
          )
        ],
      ),
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.lock, size: 14, color: Color(0xFFD6E3FF)),
                  const SizedBox(width: 6),
                  Text(
                    'SECURE CREDENTIALS',
                    style: GoogleFonts.inter(
                      color: const Color(0xFFD6E3FF),
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.0,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF059669),
                  borderRadius: BorderRadius.circular(9999),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.verified, size: 10, color: Colors.white),
                    const SizedBox(width: 4),
                    Text(
                      'VERIFIED',
                      style: GoogleFonts.inter(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Digital Student ID Row
          Row(
            children: [
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  color: const Color(0xFF1E3A8A),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.4), width: 1.5),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8.5),
                  child: avatarUrl.isNotEmpty
                      ? Image.network(
                          avatarUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _buildInitialsPlaceholder(initials),
                        )
                      : _buildInitialsPlaceholder(initials),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      fullName,
                      style: GoogleFonts.hankenGrotesk(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'ID: $enrollmentNo',
                      style: GoogleFonts.inter(color: const Color(0xFFD6E3FF), fontSize: 11, fontWeight: FontWeight.w500),
                    ),
                    Text(
                      instituteName,
                      style: GoogleFonts.inter(color: const Color(0xFF93C5FD), fontSize: 11),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.qr_code_2, color: Colors.white, size: 28),
                onPressed: () => _showQRCodeDialog(context, fullName, enrollmentNo),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String category, IconData icon, String label) {
    final bool isSelected = _selectedCategory == category;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedCategory = category;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF002045) : const Color(0xFFEFF4FF),
          borderRadius: BorderRadius.circular(9999),
          border: Border.all(
            color: isSelected ? Colors.transparent : const Color(0xFFC4C6CF),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: isSelected ? Colors.white : const Color(0xFF0D1C2E)),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.inter(
                color: isSelected ? Colors.white : const Color(0xFF0D1C2E),
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDocumentList(BuildContext context, VaultProvider provider) {
    final List<KycDocumentModel> kycList = provider.kycDocuments;
    final List<CertificateModel> certList = provider.certificates;

    // Filter according to category tab
    final List<Widget> items = [];

    if (_selectedCategory == 'All' || _selectedCategory == 'Identity') {
      for (final doc in kycList) {
        if (_selectedCategory == 'Identity' && (doc.category != 'Aadhar' && doc.category != 'Photo')) {
          continue;
        }
        items.add(_buildKycCard(context, doc));
      }
    }

    if (_selectedCategory == 'All' || _selectedCategory == 'Academic') {
      for (final doc in kycList) {
        if (doc.category == 'Marksheet' || doc.category == 'Previous TC') {
          items.add(_buildKycCard(context, doc));
        }
      }
    }

    if (_selectedCategory == 'All' || _selectedCategory == 'Certificates') {
      for (final cert in certList) {
        items.add(_buildCertificateCard(context, cert));
      }
    }

    if (items.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(40.0),
          child: Column(
            children: [
              const Icon(Icons.folder_open_outlined, size: 48, color: Color(0xFF545F72)),
              const SizedBox(height: 12),
              Text(
                'No documents found in this category.',
                style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    return Column(children: items);
  }

  Widget _buildKycCard(BuildContext context, KycDocumentModel doc) {
    final color = _getCategoryColor(doc.category);
    final icon = _getCategoryIcon(doc.category);
    final dateStr = '${doc.uploadedAt.day}/${doc.uploadedAt.month}/${doc.uploadedAt.year}';
    final isImage = doc.url.toLowerCase().endsWith('.png') ||
        doc.url.toLowerCase().endsWith('.jpg') ||
        doc.url.toLowerCase().endsWith('.jpeg') ||
        doc.url.contains('unsplash') ||
        doc.category == 'Photo';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: const Color(0xFFC4C6CF)),
          borderRadius: BorderRadius.circular(14),
        ),
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    doc.name,
                    style: GoogleFonts.inter(
                      color: const Color(0xFF0D1C2E),
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF4FF),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          doc.category.toUpperCase(),
                          style: GoogleFonts.inter(color: const Color(0xFF2563EB), fontSize: 9, fontWeight: FontWeight.bold),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          '• $dateStr',
                          style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 11),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.visibility_outlined, color: Color(0xFF002045), size: 20),
              onPressed: () => _showDocumentPreview(context, doc.name, doc.url, isImage),
            ),
            IconButton(
              icon: const Icon(Icons.download_outlined, color: Color(0xFF002045), size: 20),
              onPressed: () => _handleOpenUrl(context, doc.url, doc.name),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCertificateCard(BuildContext context, CertificateModel cert) {
    final dateStr = '${cert.issueDate.day}/${cert.issueDate.month}/${cert.issueDate.year}';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: const Color(0xFFC4C6CF)),
          borderRadius: BorderRadius.circular(14),
        ),
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: const Color(0xFFD97706).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.workspace_premium, color: Color(0xFFD97706), size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          cert.courseName,
                          style: GoogleFonts.inter(
                            color: const Color(0xFF0D1C2E),
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE6F4EA),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'GRADE ${cert.grade}',
                          style: GoogleFonts.inter(color: const Color(0xFF137333), fontSize: 9, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'No: ${cert.certificateNumber} • Issued: $dateStr',
                    style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 11),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.visibility_outlined, color: Color(0xFF002045), size: 20),
              onPressed: () => _showDocumentPreview(context, cert.courseName, cert.pdfUrl, false),
            ),
            IconButton(
              icon: const Icon(Icons.download_outlined, color: Color(0xFF002045), size: 20),
              onPressed: () => _handleOpenUrl(context, cert.pdfUrl, cert.courseName),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleOpenUrl(BuildContext context, String url, String title) async {
    if (url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Document URL unavailable.')));
      return;
    }
    final Uri uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Opening $title...')));
    }
  }

  void _showQRCodeDialog(BuildContext context, String name, String studentId) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            '$name\nDigital ID Card',
            textAlign: TextAlign.center,
            style: GoogleFonts.hankenGrotesk(
              color: const Color(0xFF002045),
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 170,
                height: 170,
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFF002045), width: 3),
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.all(12),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      for (int i = 0; i < 4; i++)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 3.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              for (int j = 0; j < 4; j++)
                                Container(
                                  width: 22,
                                  height: 22,
                                  decoration: BoxDecoration(
                                    color: (i + j) % 2 == 0 ? const Color(0xFF002045) : Colors.transparent,
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Student ID: $studentId\nScan QR code to verify institutional credentials.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 12),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text('Close', style: GoogleFonts.inter(color: const Color(0xFF002045), fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  void _showDocumentPreview(BuildContext context, String title, String url, bool isImage) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.75,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Align(
                alignment: Alignment.center,
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFC4C6CF),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: GoogleFonts.hankenGrotesk(
                        color: const Color(0xFF002045),
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF4FF),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFC4C6CF)),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: isImage && url.isNotEmpty
                      ? Image.network(
                          url,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _buildPdfPlaceholder(title),
                        )
                      : _buildPdfPlaceholder(title),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).pop();
                    _handleOpenUrl(context, url, title);
                  },
                  icon: const Icon(Icons.download, color: Colors.white),
                  label: Text('Download Document File', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF002045),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPdfPlaceholder(String title) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.verified_user_outlined, size: 56, color: Color(0xFF002045)),
        const SizedBox(height: 12),
        Text(
          'Official Document Preview',
          style: GoogleFonts.hankenGrotesk(color: const Color(0xFF0D1C2E), fontWeight: FontWeight.bold, fontSize: 16),
        ),
        const SizedBox(height: 4),
        Text(
          'Encrypted credential issued by Quantech Institute.',
          style: GoogleFonts.inter(color: const Color(0xFF545F72), fontSize: 12),
        ),
      ],
    );
  }

  Widget _buildInitialsPlaceholder(String initials) {
    return Center(
      child: Text(
        initials,
        style: GoogleFonts.hankenGrotesk(
          color: Colors.white,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
