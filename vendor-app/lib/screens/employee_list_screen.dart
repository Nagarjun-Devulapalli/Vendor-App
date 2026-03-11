import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/employee.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/detail_hero.dart';
import 'add_employee_screen.dart';

class EmployeeListScreen extends StatefulWidget {
  final bool embedded;
  const EmployeeListScreen({super.key, this.embedded = false});
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
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const AddEmployeeScreen()),
    );
    _loadEmployees();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Header
        if (widget.embedded)
          Container(
            color: AppColors.green,
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('My Team', style: GoogleFonts.fraunces(
                        fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white,
                      )),
                      const SizedBox(height: 2),
                      Text('${_employees.length} employees', style: GoogleFonts.nunito(
                        fontSize: 12, color: Colors.white.withOpacity(0.65),
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
                      // Add button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _navigateToAdd,
                          icon: const Text('＋', style: TextStyle(fontSize: 18)),
                          label: Text('Add New Employee', style: GoogleFonts.nunito(fontWeight: FontWeight.w800)),
                          style: AppTheme.greenButton,
                        ),
                      ),
                      const SizedBox(height: 18),

                      // Employee list
                      if (_employees.isEmpty)
                        Container(
                          decoration: AppTheme.cardDecoration,
                          padding: const EdgeInsets.all(32),
                          child: Column(
                            children: [
                              const Icon(Icons.groups_rounded, size: 40, color: AppColors.muted),
                              const SizedBox(height: 12),
                              Text('No employees yet', style: GoogleFonts.nunito(
                                fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.muted,
                              )),
                              const SizedBox(height: 4),
                              Text('Tap the button above to add one', style: GoogleFonts.nunito(
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
                                    Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                      child: Row(
                                        children: [
                                          Container(
                                            width: 44, height: 44,
                                            decoration: BoxDecoration(
                                              color: AppColors.greenLight,
                                              borderRadius: BorderRadius.circular(14),
                                            ),
                                            alignment: Alignment.center,
                                            child: Text(
                                              _getInitials(emp.fullName),
                                              style: GoogleFonts.nunito(
                                                fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.green,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(emp.fullName, style: GoogleFonts.nunito(
                                                  fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.text,
                                                )),
                                                const SizedBox(height: 1),
                                                Row(
                                                  children: [
                                                    const Icon(Icons.phone_rounded, size: 12, color: AppColors.muted),
                                                    const SizedBox(width: 4),
                                                    Text(emp.phone, style: GoogleFonts.nunito(
                                                      fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.muted,
                                                    )),
                                                  ],
                                                ),
                                                if (emp.aadhar != null && emp.aadhar!.isNotEmpty)
                                                  Text('Aadhar: ${emp.aadhar}', style: GoogleFonts.nunito(
                                                    fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.muted,
                                                  )),
                                              ],
                                            ),
                                          ),
                                        ],
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
