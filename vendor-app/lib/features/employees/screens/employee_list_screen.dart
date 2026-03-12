import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:vendor_app/core/routes.dart';
import '../models/employee.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../occurrences/widgets/detail_hero.dart';

class EmployeeListScreen extends StatefulWidget {
  final bool embedded;
  final VoidCallback? onBack;
  const EmployeeListScreen({super.key, this.embedded = false, this.onBack});
  @override
  State<EmployeeListScreen> createState() => _EmployeeListScreenState();
}

class _EmployeeListScreenState extends State<EmployeeListScreen> {
  List<Employee> _employees = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadEmployees();
  }

  Future<void> _loadEmployees() async {
    setState(() => _isLoading = true);
    try {
      final data = await ApiService.getEmployees();
      setState(() {
        _employees = data.map((e) => Employee.fromJson(e as Map<String, dynamic>)).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.red),
        );
      }
    }
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    if (parts.isNotEmpty && parts[0].isNotEmpty) return parts[0][0].toUpperCase();
    return '?';
  }

  Future<void> _navigateToAdd() async {
    await context.pushNamed(VendorRoute.vendorAddEmployee.name);
    _loadEmployees();
  }

  void _showProfile(Employee emp) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              _empAvatar(emp, size: 72, radius: 20, fontSize: 28),
              const SizedBox(height: 12),
              Text(emp.fullName, style: TextStyle(
                fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.text,
              )),
              Text('@${emp.username}', style: TextStyle(
                fontSize: 13, color: AppColors.muted, fontWeight: FontWeight.w600,
              )),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: emp.isActive ? AppColors.greenLight : AppColors.redLight,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  emp.isActive ? 'Active' : 'Inactive',
                  style: TextStyle(
                    fontSize: 11, fontWeight: FontWeight.w800,
                    color: emp.isActive ? AppColors.green : AppColors.red,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Container(
                decoration: AppTheme.cardDecoration,
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _profileRow(Icons.phone_rounded, 'Phone', emp.phone),
                    if (emp.aadhar != null && emp.aadhar!.isNotEmpty) ...[
                      const Divider(color: AppColors.border, height: 1),
                      _profileRow(Icons.credit_card_rounded, 'Aadhar', emp.aadhar!),
                    ],
                    const Divider(color: AppColors.border, height: 1),
                    _profileRow(Icons.person_rounded, 'Username', emp.username),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        _showEditSheet(emp);
                      },
                      icon: const Icon(Icons.edit_rounded, size: 16),
                      label: Text('Edit', style: TextStyle(fontWeight: FontWeight.w800)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.blue,
                        side: const BorderSide(color: AppColors.blue),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        _confirmDelete(emp);
                      },
                      icon: const Icon(Icons.delete_rounded, size: 16),
                      label: Text('Delete', style: TextStyle(fontWeight: FontWeight.w800)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.red,
                        side: const BorderSide(color: AppColors.red),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _profileRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.muted),
          const SizedBox(width: 10),
          Text(label, style: TextStyle(
            fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.muted,
          )),
          const Spacer(),
          Text(value, style: TextStyle(
            fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.text,
          )),
        ],
      ),
    );
  }

  void _showEditSheet(Employee emp) {
    final firstNameCtrl = TextEditingController(text: emp.firstName);
    final lastNameCtrl = TextEditingController(text: emp.lastName);
    final phoneCtrl = TextEditingController(text: emp.phone);
    final aadharCtrl = TextEditingController(text: emp.aadhar ?? '');
    File? newPhoto;
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          Future<void> pickPhoto() async {
            final picker = ImagePicker();
            final source = await showModalBottomSheet<ImageSource>(
              context: ctx,
              backgroundColor: Colors.white,
              shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              builder: (c) => SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 40, height: 4,
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)),
                      ),
                      ListTile(
                        leading: Container(
                          width: 40, height: 40,
                          decoration: BoxDecoration(color: AppColors.greenLight, borderRadius: BorderRadius.circular(10)),
                          child: const Icon(Icons.camera_alt_rounded, color: AppColors.green),
                        ),
                        title: Text('Camera', style: TextStyle(fontWeight: FontWeight.w700)),
                        onTap: () => Navigator.pop(c, ImageSource.camera),
                      ),
                      ListTile(
                        leading: Container(
                          width: 40, height: 40,
                          decoration: BoxDecoration(color: AppColors.blueLight, borderRadius: BorderRadius.circular(10)),
                          child: const Icon(Icons.photo_library_rounded, color: AppColors.blue),
                        ),
                        title: Text('Gallery', style: TextStyle(fontWeight: FontWeight.w700)),
                        onTap: () => Navigator.pop(c, ImageSource.gallery),
                      ),
                    ],
                  ),
                ),
              ),
            );
            if (source == null) return;
            final picked = await picker.pickImage(source: source, maxWidth: 800, imageQuality: 85);
            if (picked != null) setSheetState(() => newPhoto = File(picked.path));
          }

          Future<void> save() async {
            setSheetState(() => isSaving = true);
            try {
              await ApiService.updateEmployee(
                employeeId: emp.id,
                firstName: firstNameCtrl.text.trim(),
                lastName: lastNameCtrl.text.trim(),
                phone: phoneCtrl.text.trim(),
                aadhar: aadharCtrl.text.trim(),
                photo: newPhoto,
              );
              if (ctx.mounted) Navigator.pop(ctx);
              _loadEmployees();
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text('Employee updated'),
                    backgroundColor: AppColors.green,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                );
              }
            } catch (e) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.red),
                );
              }
            } finally {
              if (ctx.mounted) setSheetState(() => isSaving = false);
            }
          }

          return Padding(
            padding: EdgeInsets.only(
              left: 20, right: 20, top: 16,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 40, height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)),
                  ),
                  Text('Edit Employee', style: TextStyle(
                    fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.text,
                  )),
                  const SizedBox(height: 16),
                  // Photo picker
                  Center(
                    child: GestureDetector(
                      onTap: pickPhoto,
                      child: Container(
                        width: 72, height: 72,
                        decoration: BoxDecoration(
                          color: AppColors.greenLight,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: newPhoto != null ? AppColors.green : AppColors.border,
                            width: 2,
                          ),
                          image: newPhoto != null
                              ? DecorationImage(image: FileImage(newPhoto!), fit: BoxFit.cover)
                              : null,
                        ),
                        child: newPhoto == null
                            ? Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.camera_alt_rounded, size: 22, color: AppColors.green),
                                  Text('Photo', style: TextStyle(fontSize: 9, color: AppColors.muted, fontWeight: FontWeight.w700)),
                                ],
                              )
                            : null,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _fieldLabel('FIRST NAME'),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: firstNameCtrl,
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z ]'))],
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                    decoration: AppTheme.styledInput(label: '', hint: 'First name'),
                  ),
                  const SizedBox(height: 12),
                  _fieldLabel('LAST NAME'),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: lastNameCtrl,
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z ]'))],
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                    decoration: AppTheme.styledInput(label: '', hint: 'Last name'),
                  ),
                  const SizedBox(height: 12),
                  _fieldLabel('PHONE NUMBER'),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: phoneCtrl,
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(10),
                    ],
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                    decoration: AppTheme.styledInput(label: '', hint: '10-digit phone number'),
                  ),
                  const SizedBox(height: 12),
                  _fieldLabel('AADHAR NUMBER (OPTIONAL)'),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: aadharCtrl,
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(12),
                    ],
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                    decoration: AppTheme.styledInput(label: '', hint: '12-digit Aadhar number'),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: isSaving ? null : save,
                      style: AppTheme.greenButton,
                      child: isSaving
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text('Save Changes', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _fieldLabel(String text) => Text(text, style: AppTheme.label.copyWith(color: AppColors.muted));

  Widget _empAvatar(Employee emp, {double size = 44, double radius = 14, double fontSize = 16}) {
    final photoUrl = emp.photo != null && emp.photo!.isNotEmpty
        ? ApiService.resolvePhotoUrl(emp.photo!)
        : null;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.greenLight,
        borderRadius: BorderRadius.circular(radius),
        image: photoUrl != null
            ? DecorationImage(
                image: NetworkImage(photoUrl),
                fit: BoxFit.cover,
                onError: (e, s) {},
              )
            : null,
      ),
      alignment: Alignment.center,
      child: photoUrl == null
          ? Text(
              _getInitials(emp.fullName),
              style: TextStyle(
                fontSize: fontSize, fontWeight: FontWeight.w900, color: AppColors.green,
              ),
            )
          : null,
    );
  }

  void _confirmDelete(Employee emp) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 56, height: 56,
                decoration: BoxDecoration(color: AppColors.redLight, borderRadius: BorderRadius.circular(16)),
                child: const Icon(Icons.delete_rounded, color: AppColors.red, size: 28),
              ),
              const SizedBox(height: 16),
              Text('Delete Employee?', style: TextStyle(
                fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.text,
              )),
              const SizedBox(height: 8),
              Text(
                'Are you sure you want to delete ${emp.fullName}? This action cannot be undone.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppColors.muted, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.muted,
                        side: const BorderSide(color: AppColors.border),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text('Cancel', style: TextStyle(fontWeight: FontWeight.w800)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        Navigator.pop(ctx);
                        try {
                          await ApiService.deleteEmployee(emp.id);
                          _loadEmployees();
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('${emp.fullName} deleted'),
                                backgroundColor: AppColors.red,
                                behavior: SnackBarBehavior.floating,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            );
                          }
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.red),
                            );
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.red,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: Text('Delete', style: TextStyle(fontWeight: FontWeight.w800)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (widget.embedded)
          Container(
            color: AppColors.green,
            padding: const EdgeInsets.fromLTRB(8, 12, 20, 20),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                  onPressed: widget.onBack,
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('My Team', style: TextStyle(
                        fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white,
                      )),
                      const SizedBox(height: 2),
                      Text('${_employees.length} employees', style: TextStyle(
                        fontSize: 12, color: Colors.white.withValues(alpha: 0.65),
                      )),
                    ],
                  ),
                ),
              ],
            ),
          )
        else
          DetailHero(
            title: 'My Team',
            subtitle: '${_employees.length} employees',
            onBack: () => Navigator.pop(context),
          ),
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: AppColors.green))
              : RefreshIndicator(
                  color: AppColors.green,
                  onRefresh: _loadEmployees,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _navigateToAdd,
                          icon: const Text('＋', style: TextStyle(fontSize: 18)),
                          label: Text('Add New Employee', style: TextStyle(fontWeight: FontWeight.w800)),
                          style: AppTheme.greenButton,
                        ),
                      ),
                      const SizedBox(height: 18),
                      if (_employees.isEmpty)
                        Container(
                          decoration: AppTheme.cardDecoration,
                          padding: const EdgeInsets.all(32),
                          child: Column(
                            children: [
                              const Icon(Icons.groups_rounded, size: 40, color: AppColors.muted),
                              const SizedBox(height: 12),
                              Text('No employees yet', style: TextStyle(
                                fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.muted,
                              )),
                              const SizedBox(height: 4),
                              Text('Tap the button above to add one', style: TextStyle(
                                fontSize: 12, color: AppColors.muted, fontWeight: FontWeight.w600,
                              )),
                            ],
                          ),
                        )
                      else
                        Container(
                          decoration: AppTheme.cardDecoration,
                          clipBehavior: Clip.hardEdge,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(
                                padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
                                child: Text('REGISTERED EMPLOYEES', style: AppTheme.label),
                              ),
                              ..._employees.asMap().entries.map((entry) {
                                final i = entry.key;
                                final emp = entry.value;
                                return Column(
                                  children: [
                                    if (i > 0) const Divider(height: 1, indent: 72, color: AppColors.border),
                                    InkWell(
                                      onTap: () => _showProfile(emp),
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                        child: Row(
                                          children: [
                                            _empAvatar(emp),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(emp.fullName, style: TextStyle(
                                                    fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.text,
                                                  )),
                                                  const SizedBox(height: 1),
                                                  Row(
                                                    children: [
                                                      const Icon(Icons.phone_rounded, size: 12, color: AppColors.muted),
                                                      const SizedBox(width: 4),
                                                      Text(emp.phone, style: TextStyle(
                                                        fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.muted,
                                                      )),
                                                    ],
                                                  ),
                                                  if (emp.aadhar != null && emp.aadhar!.isNotEmpty)
                                                    Text('Aadhar: ${emp.aadhar}', style: TextStyle(
                                                      fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.muted,
                                                    )),
                                                ],
                                              ),
                                            ),
                                            // Action icons
                                            IconButton(
                                              icon: const Icon(Icons.edit_rounded, size: 18, color: AppColors.blue),
                                              onPressed: () => _showEditSheet(emp),
                                              tooltip: 'Edit',
                                              padding: EdgeInsets.zero,
                                              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                            ),
                                            IconButton(
                                              icon: const Icon(Icons.delete_rounded, size: 18, color: AppColors.red),
                                              onPressed: () => _confirmDelete(emp),
                                              tooltip: 'Delete',
                                              padding: EdgeInsets.zero,
                                              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                );
                              }),
                            ],
                          ),
                        ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
        ),
      ],
    );
  }
}
