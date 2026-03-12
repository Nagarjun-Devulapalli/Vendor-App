import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../occurrences/widgets/detail_hero.dart';

class AddEmployeeScreen extends StatefulWidget {
  const AddEmployeeScreen({super.key});
  @override
  State<AddEmployeeScreen> createState() => _AddEmployeeScreenState();
}

class _AddEmployeeScreenState extends State<AddEmployeeScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _aadharController = TextEditingController();
  File? _photo;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _aadharController.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              ListTile(
                leading: Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.greenLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.camera_alt_rounded, color: AppColors.green),
                ),
                title: Text('Camera', style: GoogleFonts.nunito(fontWeight: FontWeight.w700)),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
              ListTile(
                leading: Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.blueLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.photo_library_rounded, color: AppColors.blue),
                ),
                title: Text('Gallery', style: GoogleFonts.nunito(fontWeight: FontWeight.w700)),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
            ],
          ),
        ),
      ),
    );
    if (source == null) return;
    final picked = await picker.pickImage(source: source, maxWidth: 800, imageQuality: 85);
    if (picked != null) {
      setState(() => _photo = File(picked.path));
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_photo == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please take or select a photo'),
          backgroundColor: AppColors.amber,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }
    setState(() => _isSubmitting = true);

    try {
      final profile = await ApiService.getProfile();
      final vendorId = profile['vendor_id'] ?? profile['id'];

      final result = await ApiService.addEmployee(
        vendorOwnerId: vendorId,
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        phone: _phoneController.text.trim(),
        aadhar: _aadharController.text.trim(),
        photo: _photo,
      );

      if (mounted) {
        final credentials = result['credentials'] ?? {
          'username': result['user']?['username'],
          'password': result['generated_password'],
        };
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => Dialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 56, height: 56,
                    decoration: BoxDecoration(
                      color: AppColors.greenLight,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.check_circle_rounded, color: AppColors.green, size: 32),
                  ),
                  const SizedBox(height: 16),
                  Text('Employee Created!', style: GoogleFonts.fraunces(
                    fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.text,
                  )),
                  const SizedBox(height: 16),
                  // Warning
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.redLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_rounded, color: AppColors.red, size: 20),
                        const SizedBox(width: 8),
                        Expanded(child: Text(
                          'Save these credentials!\nThey won\'t be shown again.',
                          style: GoogleFonts.nunito(
                            fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.red,
                          ),
                        )),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Credentials
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.bg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('USERNAME', style: AppTheme.label),
                        const SizedBox(height: 2),
                        Text(
                          credentials['username'] ?? 'N/A',
                          style: GoogleFonts.nunito(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.text),
                        ),
                        const SizedBox(height: 10),
                        Text('PASSWORD', style: AppTheme.label),
                        const SizedBox(height: 2),
                        Text(
                          credentials['password'] ?? 'N/A',
                          style: GoogleFonts.nunito(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.text),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: AppTheme.greenButton,
                      child: Text('Done', style: GoogleFonts.nunito(fontWeight: FontWeight.w800)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
        if (mounted) Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Column(
        children: [
          DetailHero(
            title: 'Add Employee',
            subtitle: 'Register a new team member',
            onBack: () => Navigator.pop(context),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  children: [
                    // Photo picker
                    GestureDetector(
                      onTap: _pickPhoto,
                      child: Container(
                        decoration: AppTheme.cardDecoration,
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          children: [
                            Container(
                              width: 80, height: 80,
                              decoration: BoxDecoration(
                                color: AppColors.greenLight,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: _photo != null ? AppColors.green : AppColors.border,
                                  width: 2,
                                ),
                                image: _photo != null
                                    ? DecorationImage(image: FileImage(_photo!), fit: BoxFit.cover)
                                    : null,
                              ),
                              child: _photo == null
                                  ? const Icon(Icons.camera_alt_rounded, size: 32, color: AppColors.green)
                                  : null,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _photo == null ? 'Tap to add photo' : 'Tap to change photo',
                              style: GoogleFonts.nunito(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.muted),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Form fields
                    Container(
                      decoration: AppTheme.cardDecoration,
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('EMPLOYEE DETAILS', style: AppTheme.label),
                          const SizedBox(height: 14),
                          Text('FIRST NAME', style: AppTheme.label.copyWith(color: AppColors.muted)),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _firstNameController,
                            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z ]'))],
                            style: GoogleFonts.nunito(fontSize: 14, fontWeight: FontWeight.w600),
                            decoration: AppTheme.styledInput(label: '', hint: 'e.g. Suresh'),
                            validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                          ),
                          const SizedBox(height: 14),
                          Text('LAST NAME', style: AppTheme.label.copyWith(color: AppColors.muted)),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _lastNameController,
                            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z ]'))],
                            style: GoogleFonts.nunito(fontSize: 14, fontWeight: FontWeight.w600),
                            decoration: AppTheme.styledInput(label: '', hint: 'e.g. Babu'),
                            validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                          ),
                          const SizedBox(height: 14),
                          Text('PHONE NUMBER', style: AppTheme.label.copyWith(color: AppColors.muted)),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _phoneController,
                            keyboardType: TextInputType.number,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                              LengthLimitingTextInputFormatter(10),
                            ],
                            style: GoogleFonts.nunito(fontSize: 14, fontWeight: FontWeight.w600),
                            decoration: AppTheme.styledInput(label: '', hint: '10-digit phone number'),
                            validator: (v) {
                              if (v == null || v.isEmpty) return 'Required';
                              if (v.length != 10) return 'Enter exactly 10 digits';
                              return null;
                            },
                          ),
                          const SizedBox(height: 14),
                          Text('AADHAR NUMBER (OPTIONAL)', style: AppTheme.label.copyWith(color: AppColors.muted)),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _aadharController,
                            keyboardType: TextInputType.number,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                              LengthLimitingTextInputFormatter(12),
                            ],
                            style: GoogleFonts.nunito(fontSize: 14, fontWeight: FontWeight.w600),
                            decoration: AppTheme.styledInput(label: '', hint: '12-digit Aadhar number'),
                            validator: (v) {
                              if (v != null && v.isNotEmpty && v.length != 12) return 'Enter exactly 12 digits';
                              return null;
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Credential notice
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.amberLight,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.info_outline_rounded, size: 18, color: Color(0xFF7a5000)),
                          const SizedBox(width: 8),
                          Expanded(child: Text(
                            'Login credentials will be auto-generated and shown once after saving.',
                            style: GoogleFonts.nunito(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF7a5000)),
                          )),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isSubmitting ? null : _submit,
                        style: AppTheme.greenButton,
                        child: _isSubmitting
                            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : Text('Create Employee', style: GoogleFonts.nunito(fontSize: 15, fontWeight: FontWeight.w800)),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
