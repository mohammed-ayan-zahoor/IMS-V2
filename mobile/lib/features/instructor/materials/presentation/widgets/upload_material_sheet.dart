import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/features/instructor/materials/presentation/providers/instructor_materials_provider.dart';

class UploadMaterialSheet extends StatefulWidget {
  const UploadMaterialSheet({super.key});

  static Future<bool?> show(BuildContext context) {
    return showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => const UploadMaterialSheet(),
    );
  }

  @override
  State<UploadMaterialSheet> createState() => _UploadMaterialSheetState();
}

class _UploadMaterialSheetState extends State<UploadMaterialSheet> {
  final _titleController = TextEditingController();
  final _urlController = TextEditingController();
  final _descController = TextEditingController();
  final _marksController = TextEditingController(text: '100');

  String _materialType = 'document'; // 'document', 'assignment', 'video'
  String? _selectedCourseId;
  DateTime? _dueDate;

  PlatformFile? _pickedFile;
  bool _isUploading = false;
  String _uploadStatus = '';

  @override
  void dispose() {
    _titleController.dispose();
    _urlController.dispose();
    _descController.dispose();
    _marksController.dispose();
    super.dispose();
  }

  Future<void> _pickDeviceFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'ppt', 'pptx', 'zip'],
      );

      if (result != null && result.files.isNotEmpty) {
        setState(() {
          _pickedFile = result.files.first;
          if (_titleController.text.trim().isEmpty) {
            // Auto fill title with file base name
            final nameWithoutExt = _pickedFile!.name.split('.').first;
            _titleController.text = nameWithoutExt.replaceAll('_', ' ').replaceAll('-', ' ');
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('File selection failed: $e')),
        );
      }
    }
  }

  Future<void> _selectDueDate(BuildContext context) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF002045),
              onPrimary: Colors.white,
              onSurface: Color(0xFF0F172A),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _dueDate = picked);
    }
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    final urlInput = _urlController.text.trim();

    if (title.isEmpty) {
      _showError('Please enter a Material Title.');
      return;
    }

    if (_selectedCourseId == null) {
      _showError('Please select a Course or Class.');
      return;
    }

    if (_pickedFile == null && urlInput.isEmpty) {
      _showError('Please select a file from your device or enter a Resource URL.');
      return;
    }

    setState(() {
      _isUploading = true;
      _uploadStatus = _pickedFile != null ? 'Uploading file...' : 'Saving material...';
    });

    final provider = context.read<InstructorMaterialsProvider>();
    String finalFileUrl = urlInput;
    int? fileSize = _pickedFile?.size;

    // 1. If local file picked, upload to /api/v1/upload first
    if (_pickedFile != null && _pickedFile!.path != null) {
      final uploadRes = await provider.uploadFile(
        filePath: _pickedFile!.path!,
        fileName: _pickedFile!.name,
        fileType: _pickedFile!.name.toLowerCase().endsWith('.png') ||
                _pickedFile!.name.toLowerCase().endsWith('.jpg') ||
                _pickedFile!.name.toLowerCase().endsWith('.jpeg')
            ? 'image'
            : 'document',
      );

      if (uploadRes == null || uploadRes['url'] == null) {
        if (mounted) {
          setState(() => _isUploading = false);
          _showError('Failed to upload file to server. Please try again.');
        }
        return;
      }

      String uploadedUrl = uploadRes['url'].toString();
      if (uploadedUrl.startsWith('/')) {
        uploadedUrl = '${ApiEndpoints.host}$uploadedUrl';
      }
      finalFileUrl = uploadedUrl;
    }

    setState(() => _uploadStatus = 'Saving material...');

    // 2. Save material metadata
    final isAssignment = _materialType == 'assignment';
    final success = await provider.uploadMaterial(
      title: title,
      courseId: _selectedCourseId!,
      fileUrl: finalFileUrl,
      description: _descController.text.trim(),
      type: _materialType == 'video' ? 'video' : 'document',
      category: isAssignment ? 'assignment' : (_materialType == 'video' ? 'reference' : 'lecture'),
      allowSubmissions: isAssignment,
      totalMarks: isAssignment ? int.tryParse(_marksController.text.trim()) : null,
      dueDate: isAssignment ? _dueDate : null,
      fileSize: fileSize,
    );

    if (mounted) {
      setState(() => _isUploading = false);
      if (success) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isAssignment ? 'Assignment created successfully!' : 'Study material uploaded successfully!'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
      } else {
        _showError('Failed to save material record. Try again.');
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: GoogleFonts.inter()),
        backgroundColor: const Color(0xFFBA1A1A),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<InstructorMaterialsProvider>();
    final courses = provider.courses;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    if (_selectedCourseId == null && courses.isNotEmpty) {
      _selectedCourseId = courses.first['id'];
    }

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      padding: EdgeInsets.fromLTRB(20, 14, 20, 24 + bottomInset),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFC4C6CF),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                const Icon(Icons.upload_file_rounded, color: Color(0xFF002045), size: 24),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Upload Material',
                    style: GoogleFonts.hankenGrotesk(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0D1C2E),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Material Type Selector
            Text(
              'Material Type',
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF545F72)),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                _buildTypeChip('document', 'Notes / PDF', Icons.description_outlined),
                const SizedBox(width: 8),
                _buildTypeChip('assignment', 'Assignment', Icons.assignment_outlined),
                const SizedBox(width: 8),
                _buildTypeChip('video', 'Video / Link', Icons.smart_display_outlined),
              ],
            ),
            const SizedBox(height: 16),

            // Course Dropdown
            Text(
              'Course / Class',
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF545F72)),
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF4FF),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: const Color(0xFFC4C6CF)),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedCourseId,
                  isExpanded: true,
                  hint: Text('Select Course', style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF545F72))),
                  items: courses.map((c) {
                    return DropdownMenuItem<String>(
                      value: c['id'],
                      child: Text(
                        c['name']!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF0D1C2E)),
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedCourseId = val);
                  },
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Material Title
            Text(
              'Material Title',
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF545F72)),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _titleController,
              style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF0D1C2E)),
              decoration: InputDecoration(
                hintText: _materialType == 'assignment'
                    ? 'e.g. Assignment 3: Data Structures Problem Set'
                    : 'e.g. Chapter 4 Thermodynamics Notes',
                hintStyle: GoogleFonts.inter(color: const Color(0xFF94A3B8), fontSize: 13),
                filled: true,
                fillColor: const Color(0xFFEFF4FF),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
              ),
            ),
            const SizedBox(height: 14),

            // Conditional Assignment Options (Total Marks + Due Date)
            if (_materialType == 'assignment') ...[
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Total Marks',
                          style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF545F72)),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _marksController,
                          keyboardType: TextInputType.number,
                          style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF0D1C2E)),
                          decoration: InputDecoration(
                            hintText: '100',
                            filled: true,
                            fillColor: const Color(0xFFEFF4FF),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Due Date',
                          style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF545F72)),
                        ),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: () => _selectDueDate(context),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF4FF),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: const Color(0xFFC4C6CF)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.calendar_today, size: 15, color: Color(0xFF002045)),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _dueDate != null ? DateFormat('dd MMM yyyy').format(_dueDate!) : 'Pick Date',
                                    style: GoogleFonts.inter(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600,
                                      color: _dueDate != null ? const Color(0xFF0D1C2E) : const Color(0xFF545F72),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
            ],

            // Direct File Upload Section
            Text(
              'Attach File (PDF, Image, Document)',
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF545F72)),
            ),
            const SizedBox(height: 6),
            if (_pickedFile != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF4FF),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: const Color(0xFF2563EB)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.insert_drive_file, color: Color(0xFF2563EB), size: 24),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _pickedFile!.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF0D1C2E)),
                          ),
                          Text(
                            '${(_pickedFile!.size / (1024 * 1024)).toStringAsFixed(2)} MB',
                            style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF545F72)),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 18, color: Color(0xFFBA1A1A)),
                      onPressed: () => setState(() => _pickedFile = null),
                    ),
                  ],
                ),
              ),
            ] else ...[
              OutlinedButton.icon(
                onPressed: _pickDeviceFile,
                icon: const Icon(Icons.attach_file_rounded, size: 18, color: Color(0xFF002045)),
                label: Text(
                  'Choose File from Device',
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: const Color(0xFF002045)),
                ),
                style: OutlinedButton.styleFrom(
                  backgroundColor: const Color(0xFFEFF4FF),
                  side: const BorderSide(color: Color(0xFFC4C6CF)),
                  minimumSize: const Size(double.infinity, 44),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                ),
              ),
            ],
            const SizedBox(height: 14),

            // Fallback URL input
            Text(
              _pickedFile != null ? 'Or External Resource Link (Optional)' : 'Or Enter Resource / Drive / YouTube URL',
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF545F72)),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _urlController,
              style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF0D1C2E)),
              decoration: InputDecoration(
                hintText: 'https://...',
                hintStyle: GoogleFonts.inter(color: const Color(0xFF94A3B8), fontSize: 13),
                filled: true,
                fillColor: const Color(0xFFEFF4FF),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
              ),
            ),
            const SizedBox(height: 14),

            // Description
            Text(
              'Description (Optional)',
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF545F72)),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _descController,
              maxLines: 2,
              style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF0D1C2E)),
              decoration: InputDecoration(
                hintText: 'Additional notes or instructions for students...',
                hintStyle: GoogleFonts.inter(color: const Color(0xFF94A3B8), fontSize: 13),
                filled: true,
                fillColor: const Color(0xFFEFF4FF),
                contentPadding: const EdgeInsets.all(12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
              ),
            ),
            const SizedBox(height: 20),

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton(
                onPressed: _isUploading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF002045),
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                ),
                child: _isUploading
                    ? Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          ),
                          const SizedBox(width: 10),
                          Text(_uploadStatus, style: GoogleFonts.inter(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                        ],
                      )
                    : Text(
                        _materialType == 'assignment' ? 'Create Assignment' : 'Upload Material',
                        style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeChip(String type, String label, IconData icon) {
    final isSelected = _materialType == type;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _materialType = type),
        borderRadius: BorderRadius.circular(4),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF002045) : const Color(0xFFEFF4FF),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(
              color: isSelected ? const Color(0xFF002045) : const Color(0xFFC4C6CF),
            ),
          ),
          child: Column(
            children: [
              Icon(icon, size: 16, color: isSelected ? Colors.white : const Color(0xFF002045)),
              const SizedBox(height: 3),
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                  color: isSelected ? Colors.white : const Color(0xFF002045),
                ),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
