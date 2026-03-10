import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/detail_hero.dart';

class WorkLogScreen extends StatefulWidget {
  final int occurrenceId;
  const WorkLogScreen({super.key, required this.occurrenceId});
  @override
  State<WorkLogScreen> createState() => _WorkLogScreenState();
}

class _WorkLogScreenState extends State<WorkLogScreen> {
  final _descriptionController = TextEditingController();
  final _picker = ImagePicker();
  File? _beforePhoto;
  File? _afterPhoto;
  bool _isSubmitting = false;
  bool _showSuccess = false;

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(bool isBefore) async {
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
    final picked = await _picker.pickImage(source: source, maxWidth: 1024, imageQuality: 85);
    if (picked != null) {
      setState(() {
        if (isBefore) _beforePhoto = File(picked.path);
        else _afterPhoto = File(picked.path);
      });
    }
  }

  Future<void> _submit() async {
    if (_descriptionController.text.trim().isEmpty && _beforePhoto == null && _afterPhoto == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please add a description or photos'),
          backgroundColor: AppColors.amber,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      await ApiService.submitWorkLog(
        occurrenceId: widget.occurrenceId,
        description: _descriptionController.text.trim(),
        beforePhoto: _beforePhoto,
        afterPhoto: _afterPhoto,
      );
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _showSuccess = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Stack(
        children: [
          Column(
            children: [
              DetailHero(
                title: 'Submit Work Log',
                subtitle: 'Task #${widget.occurrenceId}',
                onBack: () => Navigator.pop(context),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Photo upload
                    Container(
                      decoration: AppTheme.cardDecoration,
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('📷 UPLOAD PHOTOS', style: AppTheme.label),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(child: _photoBox('Before Work', _beforePhoto, true)),
                              const SizedBox(width: 10),
                              Expanded(child: _photoBox('After Work', _afterPhoto, false)),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Center(
                            child: Text(
                              'Tap each box to take a photo or choose from gallery',
                              style: GoogleFonts.nunito(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.muted),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Description
                    Container(
                      decoration: AppTheme.cardDecoration,
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('WORK DESCRIPTION *', style: AppTheme.label),
                          const SizedBox(height: 10),
                          TextFormField(
                            controller: _descriptionController,
                            maxLines: 3,
                            style: GoogleFonts.nunito(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.text),
                            decoration: InputDecoration(
                              hintText: 'Describe the work done...',
                              hintStyle: GoogleFonts.nunito(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.muted),
                              filled: true,
                              fillColor: AppColors.bg,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: AppColors.border, width: 1.5),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: AppColors.border, width: 1.5),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: AppColors.green, width: 1.5),
                              ),
                            ),
                          ),
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
                            : Text('✅ Submit Work Log', style: GoogleFonts.nunito(fontSize: 15, fontWeight: FontWeight.w800)),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          ),

          // Success overlay
          if (_showSuccess)
            Container(
              color: AppColors.green.withOpacity(0.95),
              child: SafeArea(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('✅', style: TextStyle(fontSize: 60)),
                      const SizedBox(height: 16),
                      Text('Work Log Submitted!', style: GoogleFonts.fraunces(
                        fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white,
                      )),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 32),
                        child: Text(
                          'Your before & after photos have been uploaded. The admin has been notified.',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.nunito(
                            fontSize: 13, color: Colors.white.withOpacity(0.65),
                          ),
                        ),
                      ),
                      const SizedBox(height: 28),
                      ElevatedButton(
                        onPressed: () => Navigator.pop(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: AppColors.green,
                          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: Text('Back to Tasks', style: GoogleFonts.nunito(fontWeight: FontWeight.w800, fontSize: 15)),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // Loading overlay
          if (_isSubmitting)
            Container(
              color: Colors.black.withOpacity(0.3),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(color: AppColors.green),
                      const SizedBox(height: 16),
                      Text('Uploading...', style: GoogleFonts.nunito(fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _photoBox(String label, File? photo, bool isBefore) {
    final hasFilled = photo != null;
    return GestureDetector(
      onTap: () => _pickImage(isBefore),
      child: Container(
        height: 90,
        decoration: BoxDecoration(
          color: hasFilled ? AppColors.greenLight : AppColors.bg,
          border: Border.all(
            color: hasFilled ? AppColors.green : AppColors.border,
            width: 2,
            strokeAlign: BorderSide.strokeAlignInside,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: hasFilled
            ? Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.file(photo, fit: BoxFit.cover, width: double.infinity, height: double.infinity),
                  ),
                  Positioned(
                    top: 6, right: 6,
                    child: Container(
                      width: 18, height: 18,
                      decoration: const BoxDecoration(
                        color: AppColors.green,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check, color: Colors.white, size: 12),
                    ),
                  ),
                  Positioned(
                    bottom: 0, left: 0, right: 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.5),
                        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(10)),
                      ),
                      child: Text(
                        label,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.nunito(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white),
                      ),
                    ),
                  ),
                ],
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('📷', style: TextStyle(fontSize: 20)),
                  const SizedBox(height: 4),
                  Text(label, style: GoogleFonts.nunito(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.muted)),
                ],
              ),
      ),
    );
  }
}
