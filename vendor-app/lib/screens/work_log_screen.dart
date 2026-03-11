import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/detail_hero.dart';

enum WorkLogMode { start, complete }

class WorkLogScreen extends StatefulWidget {
  final int occurrenceId;
  final WorkLogMode mode;
  final int? workLogId;
  final String? existingBeforePhotoUrl;

  const WorkLogScreen({
    super.key,
    required this.occurrenceId,
    this.mode = WorkLogMode.start,
    this.workLogId,
    this.existingBeforePhotoUrl,
  });

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

  bool get _isCompleteMode => widget.mode == WorkLogMode.complete;

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
        if (isBefore) {
          _beforePhoto = File(picked.path);
        } else {
          _afterPhoto = File(picked.path);
        }
      });
    }
  }

  Future<void> _submit() async {
    if (_isCompleteMode) {
      // Complete mode: require after photo
      if (_afterPhoto == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Please take an after photo'),
            backgroundColor: AppColors.amber,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
        return;
      }
    } else {
      // Start mode: require before photo
      if (_beforePhoto == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Please take a before photo'),
            backgroundColor: AppColors.amber,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
        return;
      }
    }

    setState(() => _isSubmitting = true);
    try {
      if (_isCompleteMode) {
        await ApiService.completeWorkLog(
          workLogId: widget.workLogId!,
          afterPhoto: _afterPhoto!,
        );
      } else {
        await ApiService.submitWorkLog(
          occurrenceId: widget.occurrenceId,
          description: _descriptionController.text.trim(),
          beforePhoto: _beforePhoto,
        );
      }
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
    final heroTitle = _isCompleteMode ? 'Complete Work' : 'Start Work';
    final heroSubtitle = 'Task #${widget.occurrenceId}';
    final successTitle = _isCompleteMode ? 'Work Completed!' : 'Work Started!';
    final successMessage = _isCompleteMode
        ? 'Your after photo has been uploaded. The work log is now complete.'
        : 'Your before photo has been uploaded. Remember to complete the work log when done.';

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Stack(
        children: [
          Column(
            children: [
              DetailHero(
                title: heroTitle,
                subtitle: heroSubtitle,
                onBack: () => Navigator.pop(context),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Photo upload section
                    Container(
                      decoration: AppTheme.cardDecoration,
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _isCompleteMode ? 'AFTER PHOTO' : 'BEFORE PHOTO',
                            style: AppTheme.label,
                          ),
                          const SizedBox(height: 12),

                          if (_isCompleteMode) ...[
                            // Complete mode: show existing before photo read-only, then after picker
                            if (widget.existingBeforePhotoUrl != null) ...[
                              Text(
                                'Before Photo (submitted)',
                                style: GoogleFonts.nunito(
                                  fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.muted,
                                ),
                              ),
                              const SizedBox(height: 8),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.network(
                                  'http://10.0.2.2:8000${widget.existingBeforePhotoUrl}',
                                  height: 120,
                                  width: double.infinity,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    height: 120,
                                    decoration: BoxDecoration(
                                      color: AppColors.border,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Center(
                                      child: Icon(Icons.broken_image, color: AppColors.muted, size: 32),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'Take After Photo',
                                style: GoogleFonts.nunito(
                                  fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.text,
                                ),
                              ),
                              const SizedBox(height: 8),
                            ],
                            _photoBox('After Work', _afterPhoto, false),
                          ] else ...[
                            // Start mode: only before photo picker
                            _photoBox('Before Work', _beforePhoto, true),
                          ],

                          const SizedBox(height: 10),
                          Center(
                            child: Text(
                              _isCompleteMode
                                  ? 'Tap the box to take the after photo'
                                  : 'Tap the box to take the before photo',
                              style: GoogleFonts.nunito(
                                fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.muted,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Description (only in start mode)
                    if (!_isCompleteMode) ...[
                      const SizedBox(height: 12),
                      Container(
                        decoration: AppTheme.cardDecoration,
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('WORK DESCRIPTION', style: AppTheme.label),
                            const SizedBox(height: 10),
                            TextFormField(
                              controller: _descriptionController,
                              maxLines: 3,
                              style: GoogleFonts.nunito(
                                fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.text,
                              ),
                              decoration: InputDecoration(
                                hintText: 'Describe the work to be done...',
                                hintStyle: GoogleFonts.nunito(
                                  fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.muted,
                                ),
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
                    ],

                    const SizedBox(height: 16),

                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isSubmitting ? null : _submit,
                        style: AppTheme.greenButton,
                        child: _isSubmitting
                            ? const SizedBox(
                                width: 24, height: 24,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : Text(
                                _isCompleteMode ? 'Complete Work \u2192' : 'Start Work \u2192',
                                style: GoogleFonts.nunito(fontSize: 15, fontWeight: FontWeight.w800),
                              ),
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
                      Icon(
                        _isCompleteMode ? Icons.check_circle : Icons.play_circle_filled,
                        size: 60,
                        color: Colors.white,
                      ),
                      const SizedBox(height: 16),
                      Text(successTitle, style: GoogleFonts.fraunces(
                        fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white,
                      )),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 32),
                        child: Text(
                          successMessage,
                          textAlign: TextAlign.center,
                          style: GoogleFonts.nunito(
                            fontSize: 13, color: Colors.white.withOpacity(0.65),
                          ),
                        ),
                      ),
                      const SizedBox(height: 28),
                      ElevatedButton(
                        onPressed: () => Navigator.pop(context, true),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: AppColors.green,
                          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: Text('Back to Task', style: GoogleFonts.nunito(fontWeight: FontWeight.w800, fontSize: 15)),
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
        height: 120,
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
                  const Icon(Icons.camera_alt_rounded, size: 28, color: AppColors.muted),
                  const SizedBox(height: 6),
                  Text(label, style: GoogleFonts.nunito(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.muted)),
                  const SizedBox(height: 2),
                  Text('Tap to capture', style: GoogleFonts.nunito(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.muted)),
                ],
              ),
      ),
    );
  }
}
