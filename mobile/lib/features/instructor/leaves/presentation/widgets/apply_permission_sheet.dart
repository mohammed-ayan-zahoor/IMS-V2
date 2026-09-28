import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:student_app/core/auth/auth_provider.dart';
import 'package:student_app/features/instructor/leaves/presentation/providers/instructor_leaves_provider.dart';

class ApplyPermissionSheet extends StatefulWidget {
  const ApplyPermissionSheet({super.key});

  static Future<bool?> show(BuildContext context) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const ApplyPermissionSheet(),
    );
  }

  @override
  State<ApplyPermissionSheet> createState() => _ApplyPermissionSheetState();
}

class _ApplyPermissionSheetState extends State<ApplyPermissionSheet> {
  final _formKey = GlobalKey<FormState>();
  final _reasonController = TextEditingController();

  TimeOfDay _departureTime = TimeOfDay.now();
  late TimeOfDay _returnTime;

  String _durationHours = '1 hour';
  String _category = 'personal_errand';
  bool _isSubmitting = false;

  final List<String> _durations = [
    '30 minutes',
    '1 hour',
    '1.5 hours',
    '2 hours',
    '3 hours',
    'Half day',
  ];

  final List<Map<String, String>> _categories = [
    {'value': 'personal_errand', 'label': 'Personal Errand'},
    {'value': 'official_work', 'label': 'Official Work'},
    {'value': 'emergency', 'label': 'Emergency'},
    {'value': 'medical', 'label': 'Medical'},
    {'value': 'other', 'label': 'Other'},
  ];

  @override
  void initState() {
    super.initState();
    // Default return time: departure + 1 hour
    final now = TimeOfDay.now();
    _returnTime = TimeOfDay(hour: (now.hour + 1) % 24, minute: now.minute);
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  String _formatTime(TimeOfDay t) {
    final now = DateTime.now();
    final dt = DateTime(now.year, now.month, now.day, t.hour, t.minute);
    return DateFormat('hh:mm a').format(dt);
  }

  Future<void> _pickDepartureTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _departureTime,
    );
    if (picked != null) {
      setState(() {
        _departureTime = picked;
        _returnTime = TimeOfDay(hour: (picked.hour + 1) % 24, minute: picked.minute);
      });
    }
  }

  Future<void> _pickReturnTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _returnTime,
    );
    if (picked != null) {
      setState(() {
        _returnTime = picked;
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final requesterName = auth.userName;

    setState(() => _isSubmitting = true);

    final provider = context.read<InstructorLeavesProvider>();
    final success = await provider.createPermission(
      recipientName: requesterName,
      departureTime: _formatTime(_departureTime),
      expectedReturnTime: _formatTime(_returnTime),
      durationHours: _durationHours,
      category: _category,
      reason: _reasonController.text.trim(),
      requestDate: DateTime.now().toIso8601String(),
    );

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Out-Pass permission requested successfully!'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to submit permission request.'),
            backgroundColor: Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: Color(0xFFC4C6CF))),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.badge_outlined, color: Color(0xFF002045), size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Request Permission (Out-Pass)',
                      style: GoogleFonts.hankenGrotesk(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 20, color: Color(0xFF64748B)),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Scrollable Form
          Expanded(
            child: Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Notice Banner
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF4FF),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: const Color(0xFFC4C6CF)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.info_outline_rounded, size: 18, color: Color(0xFF002045)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Use this to request short permissions to go out during working hours. Your request will be routed immediately to the administration panel.',
                            style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF1E293B)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Category Selector
                  Text(
                    'Permission Category *',
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: const Color(0xFFC4C6CF)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isExpanded: true,
                        value: _category,
                        items: _categories
                            .map((c) => DropdownMenuItem(
                                  value: c['value'],
                                  child: Text(c['label']!, style: const TextStyle(fontSize: 13)),
                                ))
                            .toList(),
                        onChanged: (val) => setState(() => _category = val ?? 'personal_errand'),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Timing Row (Departure Time & Return Time)
                  Row(
                    children: [
                      // Departure Time
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Departure Time *',
                              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                            ),
                            const SizedBox(height: 6),
                            InkWell(
                              onTap: _pickDepartureTime,
                              borderRadius: BorderRadius.circular(4),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: const Color(0xFFC4C6CF)),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      _formatTime(_departureTime),
                                      style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A)),
                                    ),
                                    const Icon(Icons.access_time_rounded, size: 16, color: Color(0xFF64748B)),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Return Time
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Expected Return *',
                              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                            ),
                            const SizedBox(height: 6),
                            InkWell(
                              onTap: _pickReturnTime,
                              borderRadius: BorderRadius.circular(4),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: const Color(0xFFC4C6CF)),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      _formatTime(_returnTime),
                                      style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A)),
                                    ),
                                    const Icon(Icons.access_time_filled_rounded, size: 16, color: Color(0xFF64748B)),
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

                  // Duration Selector
                  Text(
                    'Expected Duration *',
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: const Color(0xFFC4C6CF)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isExpanded: true,
                        value: _durationHours,
                        items: _durations
                            .map((d) => DropdownMenuItem(
                                  value: d,
                                  child: Text(d, style: const TextStyle(fontSize: 13)),
                                ))
                            .toList(),
                        onChanged: (val) => setState(() => _durationHours = val ?? '1 hour'),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Reason Field
                  Text(
                    'Reason for Out-Pass *',
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                  ),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _reasonController,
                    maxLines: 3,
                    style: GoogleFonts.inter(fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Provide specific reason...',
                      hintStyle: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF94A3B8)),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: const BorderSide(color: Color(0xFFC4C6CF))),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                    validator: (v) => v == null || v.trim().isEmpty ? 'Please specify reason' : null,
                  ),
                  const SizedBox(height: 24),

                  // Submit CTA
                  ElevatedButton(
                    onPressed: _isSubmitting ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF002045),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Text(
                            'Submit Out-Pass Request',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
