import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/constants/api_endpoints.dart';
import 'package:student_app/core/network/api_client.dart';
import 'package:student_app/features/timeline/presentation/providers/timeline_provider.dart';

class LogTimelineEventSheet extends StatefulWidget {
  final String studentId;
  final String? studentName;

  const LogTimelineEventSheet({
    super.key,
    required this.studentId,
    this.studentName,
  });

  static Future<void> show(
    BuildContext context, {
    required String studentId,
    String? studentName,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => LogTimelineEventSheet(
        studentId: studentId,
        studentName: studentName,
      ),
    );
  }

  @override
  State<LogTimelineEventSheet> createState() => _LogTimelineEventSheetState();
}

class _LogTimelineEventSheetState extends State<LogTimelineEventSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();

  String _category = 'achievement';
  DateTime _selectedDate = DateTime.now();
  PlatformFile? _pickedImage;
  bool _isSubmitting = false;
  String _statusText = 'Saving...';

  static const List<Map<String, dynamic>> _categories = [
    {'id': 'achievement', 'label': 'Achievement', 'color': Color(0xFF854D0E), 'bg': Color(0xFFFEF08A)},
    {'id': 'academic', 'label': 'Academic', 'color': Color(0xFF1E3A8A), 'bg': Color(0xFFDBEAFE)},
    {'id': 'milestone', 'label': 'Milestone', 'color': Color(0xFF166534), 'bg': Color(0xFFDCFCE7)},
    {'id': 'disciplinary', 'label': 'Disciplinary', 'color': Color(0xFF991B1B), 'bg': Color(0xFFFEE2E2)},
    {'id': 'general', 'label': 'General', 'color': Color(0xFF334155), 'bg': Color(0xFFF1F5F9)},
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365 * 5)),
      lastDate: DateTime.now().add(const Duration(days: 30)),
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
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _pickPhoto() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['png', 'jpg', 'jpeg', 'webp'],
      );
      if (result != null && result.files.isNotEmpty) {
        setState(() => _pickedImage = result.files.first);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not pick image: $e')),
        );
      }
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSubmitting = true;
      _statusText = _pickedImage != null ? 'Uploading photo...' : 'Saving event...';
    });

    String? uploadedUrl;
    if (_pickedImage != null && _pickedImage!.path != null) {
      final uploadRes = await ApiClient().uploadFile(
        filePath: _pickedImage!.path!,
        fileName: _pickedImage!.name,
        fileType: 'image',
      );
      if (uploadRes != null && uploadRes['url'] != null) {
        String rawUrl = uploadRes['url'].toString();
        if (rawUrl.startsWith('/')) {
          rawUrl = '${ApiEndpoints.host}$rawUrl';
        }
        uploadedUrl = rawUrl;
      } else {
        if (mounted) {
          setState(() => _isSubmitting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Photo upload failed. Please try again or remove the photo.'),
              backgroundColor: Color(0xFFDC2626),
            ),
          );
        }
        return;
      }
    }

    if (!mounted) return;
    setState(() => _statusText = 'Saving event...');

    final provider = context.read<TimelineProvider>();
    final success = await provider.logEvent(
      studentId: widget.studentId,
      title: _titleController.text.trim(),
      description: _descController.text.trim(),
      category: _category,
      date: _selectedDate,
      photoUrl: uploadedUrl,
    );

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (success) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Timeline event logged successfully!'),
          backgroundColor: Color(0xFF16A34A),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to log timeline event. Please try again.'),
          backgroundColor: Color(0xFFDC2626),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Drag handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Log Timeline Event',
                          style: GoogleFonts.hankenGrotesk(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF002045),
                          ),
                        ),
                        if (widget.studentName != null)
                          Text(
                            'For ${widget.studentName}',
                            style: GoogleFonts.inter(
                              fontSize: 12.5,
                              color: const Color(0xFF545F72),
                            ),
                          ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Color(0xFF545F72)),
                    onPressed: _isSubmitting ? null : () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Category Chips
              Text(
                'CATEGORY',
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF545F72),
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _categories.map((cat) {
                  final isSelected = _category == cat['id'];
                  return ChoiceChip(
                    label: Text(
                      cat['label'],
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        color: isSelected ? cat['color'] : const Color(0xFF545F72),
                      ),
                    ),
                    selected: isSelected,
                    selectedColor: cat['bg'],
                    backgroundColor: const Color(0xFFF8FAFC),
                    side: BorderSide(
                      color: isSelected ? (cat['color'] as Color).withValues(alpha: 0.4) : const Color(0xFFE2E8F0),
                    ),
                    onSelected: _isSubmitting ? null : (_) => setState(() => _category = cat['id']),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),

              // Title
              TextFormField(
                controller: _titleController,
                enabled: !_isSubmitting,
                decoration: InputDecoration(
                  labelText: 'Event Title',
                  hintText: 'e.g. 1st Place in Science Exhibition',
                  labelStyle: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF545F72)),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                ),
                validator: (val) => (val == null || val.trim().isEmpty) ? 'Title is required' : null,
              ),
              const SizedBox(height: 14),

              // Date Picker
              InkWell(
                onTap: _isSubmitting ? null : _pickDate,
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today_outlined, size: 18, color: Color(0xFF002045)),
                      const SizedBox(width: 10),
                      Text(
                        'Date: ${DateFormat('MMM dd, yyyy').format(_selectedDate)}',
                        style: GoogleFonts.inter(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF0D1C2E),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        'Change',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF002045),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Description
              TextFormField(
                controller: _descController,
                enabled: !_isSubmitting,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: 'Description / Notes',
                  hintText: 'Write details about this event or remark...',
                  alignLabelWithHint: true,
                  labelStyle: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF545F72)),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                ),
                validator: (val) => (val == null || val.trim().isEmpty) ? 'Description is required' : null,
              ),
              const SizedBox(height: 14),

              // Optional Photo Upload
              InkWell(
                onTap: _isSubmitting ? null : _pickPhoto,
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF4FF),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFC7D2FE)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.add_photo_alternate_outlined, size: 20, color: Color(0xFF002045)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _pickedImage != null ? _pickedImage!.name : 'Attach Photo / Certificate (Optional)',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: const Color(0xFF002045),
                          ),
                        ),
                      ),
                      if (_pickedImage != null)
                        IconButton(
                          icon: const Icon(Icons.close, size: 18, color: Color(0xFF545F72)),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          onPressed: _isSubmitting ? null : () => setState(() => _pickedImage = null),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Save Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF002045),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: _isSubmitting
                      ? Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            ),
                            const SizedBox(width: 10),
                            Text(_statusText, style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                          ],
                        )
                      : Text(
                          'Save Timeline Event',
                          style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
