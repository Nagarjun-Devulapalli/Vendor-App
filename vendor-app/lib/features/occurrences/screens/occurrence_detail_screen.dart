import 'dart:math';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/occurrence.dart';
import '../../work_logs/models/work_log.dart';
import '../../../core/services/api_service.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/theme/app_theme.dart';
import '../widgets/detail_hero.dart';
import '../../work_logs/screens/work_log_screen.dart';

class OccurrenceDetailScreen extends StatefulWidget {
  final int occurrenceId;
  const OccurrenceDetailScreen({super.key, required this.occurrenceId});
  @override
  State<OccurrenceDetailScreen> createState() => _OccurrenceDetailScreenState();
}

class _OccurrenceDetailScreenState extends State<OccurrenceDetailScreen> {
  Occurrence? _occurrence;
  List<WorkLog> _workLogs = [];
  bool _isLoading = true;
  bool _isUpdating = false;
  String? _userRole;
  int? _vendorId;
  int? _currentUserId;

  @override
  void initState() {
    super.initState();
    _loadUserAndData();
  }

  Future<void> _loadUserAndData() async {
    final user = await AuthService.getUser();
    if (mounted) {
      setState(() {
        _userRole = user?['role'] as String?;
        _vendorId = user?['vendor_id'] as int?;
        _currentUserId = user?['id'] as int?;
      });
    }
    await _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final occData = await ApiService.getOccurrenceDetail(widget.occurrenceId);
      final logsData = await ApiService.getWorkLogs(widget.occurrenceId);
      setState(() {
        _occurrence = Occurrence.fromJson(occData);
        _workLogs = logsData
            .map((e) => WorkLog.fromJson(e as Map<String, dynamic>))
            .toList();
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

  Future<void> _unassignEmployee(int employeeId) async {
    try {
      await ApiService.unassignEmployee(widget.occurrenceId, employeeId);
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Employee removed'),
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
    }
  }

  Future<void> _showAssignBottomSheet() async {
    List<dynamic> employees = [];
    try {
      employees = await ApiService.getEmployees(vendorId: _vendorId);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading employees: $e'), backgroundColor: AppColors.red),
        );
      }
      return;
    }

    if (!mounted) return;

    final assignedIds = _occurrence?.assignments.map((a) => a.employeeId).toSet() ?? {};
    final selected = <int>{...assignedIds};

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.bg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _AssignEmployeesSheet(
        employees: employees,
        initialSelected: selected,
        alreadyAssigned: assignedIds,
        onConfirm: (newlySelected) async {
          final toAssign = newlySelected.difference(assignedIds);
          final toUnassign = assignedIds.difference(newlySelected);
          bool hasError = false;
          for (final id in toAssign) {
            try {
              await ApiService.assignEmployee(widget.occurrenceId, id);
            } catch (_) {
              hasError = true;
            }
          }
          for (final id in toUnassign) {
            try {
              await ApiService.unassignEmployee(widget.occurrenceId, id);
            } catch (_) {
              hasError = true;
            }
          }
          await _loadData();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(hasError ? 'Some changes could not be saved' : 'Assignments updated'),
                backgroundColor: hasError ? AppColors.amber : AppColors.green,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            );
          }
        },
      ),
    );
  }

  Future<void> _updateStatus(String status) async {
    setState(() => _isUpdating = true);
    try {
      await ApiService.updateOccurrenceStatus(widget.occurrenceId, status);
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Marked as $status'),
            backgroundColor: AppColors.green,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
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
      setState(() => _isUpdating = false);
    }
  }

  IconData _categoryIcon(String? cat) {
    final c = cat?.toLowerCase() ?? '';
    if (c.contains('electric')) return Icons.electrical_services_rounded;
    if (c.contains('plumb')) return Icons.plumbing_rounded;
    if (c.contains('clean') || c.contains('housekeep'))
      return Icons.cleaning_services_rounded;
    if (c.contains('security')) return Icons.shield_rounded;
    if (c.contains('pest')) return Icons.pest_control_rounded;
    if (c.contains('garden') || c.contains('landscape'))
      return Icons.yard_rounded;
    if (c.contains('fire')) return Icons.local_fire_department_rounded;
    if (c.contains('it') || c.contains('network'))
      return Icons.computer_rounded;
    if (c.contains('transport')) return Icons.local_shipping_rounded;
    if (c.contains('cafe') || c.contains('kitchen'))
      return Icons.restaurant_rounded;
    if (c.contains('waste')) return Icons.recycling_rounded;
    if (c.contains('hvac') || c.contains('ventil'))
      return Icons.ac_unit_rounded;
    if (c.contains('civil') || c.contains('structur'))
      return Icons.construction_rounded;
    if (c.contains('event')) return Icons.event_rounded;
    return Icons.assignment_rounded;
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: AppColors.bg,
        body: Column(
          children: [
            DetailHero(
              title: 'Loading...',
              subtitle: '',
              onBack: () => Navigator.pop(context),
            ),
            const Expanded(
              child: Center(
                child: CircularProgressIndicator(color: AppColors.green),
              ),
            ),
          ],
        ),
      );
    }

    final occ = _occurrence;
    if (occ == null) {
      return Scaffold(
        backgroundColor: AppColors.bg,
        body: Column(
          children: [
            DetailHero(
              title: 'Task Not Found',
              subtitle: '',
              onBack: () => Navigator.pop(context),
            ),
            const Expanded(child: Center(child: Text('Task not found'))),
          ],
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Column(
        children: [
          DetailHero(
            title: occ.activityTitle,
            subtitle: '${occ.categoryName ?? 'Task'} · ${occ.scheduledDate}',
            onBack: () => Navigator.pop(context),
            trailing: _statusBadge(occ.status),
          ),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.green,
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Chips
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      _iconChip(
                        occ.status == 'completed'
                            ? Icons.check_circle_rounded
                            : occ.status == 'in_progress'
                            ? Icons.schedule_rounded
                            : occ.status == 'missed'
                            ? Icons.warning_rounded
                            : Icons.schedule_rounded,
                        occ.status == 'completed'
                            ? 'Completed'
                            : occ.status == 'in_progress'
                            ? 'In Progress'
                            : occ.status == 'missed'
                            ? 'Overdue'
                            : 'Pending',
                        occ.status == 'completed'
                            ? AppColors.greenLight
                            : occ.status == 'in_progress'
                            ? AppColors.blueLight
                            : occ.status == 'missed'
                            ? AppColors.redLight
                            : AppColors.amberLight,
                        occ.status == 'completed'
                            ? AppColors.green
                            : occ.status == 'in_progress'
                            ? AppColors.blue
                            : occ.status == 'missed'
                            ? AppColors.red
                            : AppColors.amber,
                      ),
                      if (occ.categoryName != null)
                        _iconChip(
                          _categoryIcon(occ.categoryName),
                          occ.categoryName!,
                          AppColors.greenLight,
                          AppColors.green,
                        ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Info block
                  _infoBlock([
                    _infoRow('Scheduled Date', occ.scheduledDate),
                    _infoRow(
                      'Status',
                      occ.status == 'in_progress'
                          ? 'In Progress'
                          : occ.status[0].toUpperCase() +
                                occ.status.substring(1),
                      valueColor: occ.status == 'completed'
                          ? AppColors.green
                          : occ.status == 'in_progress'
                          ? AppColors.blue
                          : occ.status == 'missed'
                          ? AppColors.red
                          : AppColors.amber,
                    ),
                    if (occ.completedByName != null)
                      _infoRow('Completed By', occ.completedByName!),
                  ]),

                  // Description
                  if (occ.activityDescription != null &&
                      occ.activityDescription!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    _sectionBlock(
                      'DESCRIPTION',
                      Text(
                        occ.activityDescription!,
                        style: GoogleFonts.nunito(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.text,
                          height: 1.6,
                        ),
                      ),
                    ),
                  ],

                  // Assignments (vendor_owner only)
                  if (_userRole == 'vendor_owner') ...[
                    const SizedBox(height: 12),
                    _assignmentsSection(occ),
                  ],

                  // Work logs
                  const SizedBox(height: 12),
                  _sectionBlock(
                    'WORK LOG',
                    _workLogs.isEmpty
                        ? Padding(
                            padding: const EdgeInsets.all(8),
                            child: Center(
                              child: Text(
                                'No work log yet. Start work to create one.',
                                style: GoogleFonts.nunito(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.muted,
                                ),
                              ),
                            ),
                          )
                        : Column(
                            children: _workLogs
                                .map((log) => _workLogCard(log))
                                .toList(),
                          ),
                  ),

                  const SizedBox(height: 16),

                  // Actions
                  _buildActionButton(occ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _assignmentsSection(Occurrence occ) {
    return Container(
      decoration: AppTheme.cardDecoration,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('ASSIGNED EMPLOYEES (${occ.assignments.length})', style: AppTheme.label),
              GestureDetector(
                onTap: _showAssignBottomSheet,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.greenLight,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.person_add_rounded, size: 12, color: AppColors.green),
                      const SizedBox(width: 4),
                      Text('Assign', style: GoogleFonts.nunito(
                        fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.green,
                      )),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (occ.assignments.isEmpty)
            Padding(
              padding: const EdgeInsets.all(8),
              child: Center(child: Text(
                'No employees assigned yet',
                style: GoogleFonts.nunito(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.muted),
              )),
            )
          else
            Column(
              children: occ.assignments.map((a) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.bg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 32, height: 32,
                      decoration: BoxDecoration(
                        color: AppColors.greenLight,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Center(
                        child: Text(
                          a.employeeName.isNotEmpty ? a.employeeName[0].toUpperCase() : '?',
                          style: GoogleFonts.nunito(
                            fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.green,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(a.employeeName, style: GoogleFonts.nunito(
                        fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.text,
                      )),
                    ),
                    GestureDetector(
                      onTap: () => _unassignEmployee(a.employeeId),
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: AppColors.redLight,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.close_rounded, size: 14, color: AppColors.red),
                      ),
                    ),
                  ],
                ),
              )).toList(),
            ),
        ],
      ),
    );
  }

  Widget _buildActionButton(Occurrence occ) {
    if (occ.status == 'completed') {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: null,
          icon: const Icon(Icons.check_circle, size: 20),
          label: Text('Completed', style: GoogleFonts.nunito(fontWeight: FontWeight.w800)),
          style: AppTheme.greenButton.copyWith(
            backgroundColor: WidgetStatePropertyAll(AppColors.border),
            foregroundColor: WidgetStatePropertyAll(AppColors.muted),
            elevation: const WidgetStatePropertyAll(0),
            shadowColor: const WidgetStatePropertyAll(Colors.transparent),
          ),
        ),
      );
    }

    if (occ.status == 'missed') return const SizedBox.shrink();

    // Find any existing work log for this occurrence (not per-user)
    final existingLog = _workLogs.isEmpty ? null : _workLogs.first;

    if (existingLog == null) {
      // No work log — show Start Work (any vendor/employee can start)
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: () async {
            final result = await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => WorkLogScreen(
                  occurrenceId: widget.occurrenceId,
                  mode: WorkLogMode.start,
                ),
              ),
            );
            if (result == true) _loadData();
          },
          icon: const Icon(Icons.play_arrow_rounded, size: 20),
          label: Text('Start Work', style: GoogleFonts.nunito(fontWeight: FontWeight.w800)),
          style: AppTheme.greenButton,
        ),
      );
    } else if (existingLog.approvalStatus == 'rejected') {
      // Work log rejected — allow resubmission of after photo
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: () async {
            final result = await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => WorkLogScreen(
                  occurrenceId: widget.occurrenceId,
                  mode: WorkLogMode.complete,
                  workLogId: existingLog.id,
                  existingBeforePhotoUrl: existingLog.beforePhoto,
                ),
              ),
            );
            if (result == true) _loadData();
          },
          icon: const Icon(Icons.refresh_rounded, size: 20),
          label: Text('Resubmit After Photo', style: GoogleFonts.nunito(fontWeight: FontWeight.w800)),
          style: AppTheme.greenButton.copyWith(
            backgroundColor: const WidgetStatePropertyAll(AppColors.amber),
          ),
        ),
      );
    } else if (existingLog.isInProgress) {
      // Work started but not completed — show Complete Work
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: () async {
            final result = await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => WorkLogScreen(
                  occurrenceId: widget.occurrenceId,
                  mode: WorkLogMode.complete,
                  workLogId: existingLog.id,
                  existingBeforePhotoUrl: existingLog.beforePhoto,
                ),
              ),
            );
            if (result == true) _loadData();
          },
          icon: const Icon(Icons.check_circle_outline_rounded, size: 20),
          label: Text('Complete Work', style: GoogleFonts.nunito(fontWeight: FontWeight.w800)),
          style: AppTheme.greenButton,
        ),
      );
    } else if (existingLog.isCompleted && existingLog.approvalStatus != 'approved') {
      // Submitted and awaiting admin review
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: null,
          icon: const Icon(Icons.hourglass_top_rounded, size: 20),
          label: Text('Submitted · Awaiting Review', style: GoogleFonts.nunito(fontWeight: FontWeight.w800)),
          style: AppTheme.greenButton.copyWith(
            backgroundColor: WidgetStatePropertyAll(AppColors.amberLight),
            foregroundColor: WidgetStatePropertyAll(AppColors.amber),
            elevation: const WidgetStatePropertyAll(0),
            shadowColor: const WidgetStatePropertyAll(Colors.transparent),
          ),
        ),
      );
    } else {
      return const SizedBox.shrink();
    }
  }

  Widget _buildMarkJobCompleteButton(Occurrence occ) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: _isUpdating ? null : () => _showMarkCompleteDialog(occ),
        icon: const Icon(Icons.done_all_rounded, size: 18),
        label: Text(
          'Mark Job as Complete',
          style: GoogleFonts.nunito(fontWeight: FontWeight.w800),
        ),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.green,
          side: const BorderSide(color: AppColors.green, width: 1.5),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
    );
  }

  Future<void> _showMarkCompleteDialog(Occurrence occ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          'Mark Job as Complete?',
          style: GoogleFonts.nunito(fontWeight: FontWeight.w800, fontSize: 16),
        ),
        content: Text(
          'This will mark the entire activity "${occ.activityTitle}" as completed. No new daily tasks will be created for this job.',
          style: GoogleFonts.nunito(fontSize: 13, height: 1.5),
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: GoogleFonts.nunito(fontWeight: FontWeight.w700)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.green,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: Text('Complete', style: GoogleFonts.nunito(fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isUpdating = true);
      try {
        await ApiService.markActivityComplete(occ.activityId);
        await _loadData();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Job marked as complete!'),
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
        setState(() => _isUpdating = false);
      }
    }
  }

  Widget _statusBadge(String status) {
    final String label;
    final IconData icon;
    switch (status) {
      case 'completed':
        label = 'Completed';
        icon = Icons.check_circle_rounded;
        break;
      case 'in_progress':
        label = 'In Progress';
        icon = Icons.schedule_rounded;
        break;
      case 'missed':
        label = 'Overdue';
        icon = Icons.warning_rounded;
        break;
      default:
        label = 'Pending';
        icon = Icons.schedule_rounded;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.2),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Colors.white),
          const SizedBox(width: 5),
          Text(
            label,
            style: GoogleFonts.nunito(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _iconChip(IconData icon, String text, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: fg),
          const SizedBox(width: 4),
          Text(
            text,
            style: GoogleFonts.nunito(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoBlock(List<Widget> children) {
    return Container(
      decoration: AppTheme.cardDecoration,
      padding: const EdgeInsets.all(16),
      child: Column(children: children),
    );
  }

  Widget _infoRow(String label, String value, {Color? valueColor}) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.border, width: 1)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.nunito(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.muted,
            ),
          ),
          Text(
            value,
            style: GoogleFonts.nunito(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: valueColor ?? AppColors.text,
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionBlock(String title, Widget child) {
    return Container(
      decoration: AppTheme.cardDecoration,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AppTheme.label),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }

  Widget _workLogCard(WorkLog log) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'By: ${log.userName ?? 'Unknown'}',
                style: GoogleFonts.nunito(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: AppColors.text,
                ),
              ),
              Row(
                children: [
                  if (log.approvalStatus != null) ...[
                    _approvalBadge(log.approvalStatus!),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    log.createdAt.split('T').first,
                    style: GoogleFonts.nunito(
                      fontSize: 11,
                      color: AppColors.muted,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
          ),
          if (log.approvalStatus == 'rejected' &&
              log.rejectionReason != null &&
              log.rejectionReason!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'Rejected: ${log.rejectionReason}',
              style: GoogleFonts.nunito(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.red,
              ),
            ),
          ],
          if (log.approvalStatus == 'approved' &&
              log.reviewedByName != null) ...[
            const SizedBox(height: 4),
            Text(
              'Approved by ${log.reviewedByName}',
              style: GoogleFonts.nunito(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.green,
              ),
            ),
          ],
          if (log.description.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              log.description,
              style: GoogleFonts.nunito(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.text,
                height: 1.4,
              ),
            ),
          ],
          if (log.beforePhoto != null || log.afterPhoto != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                if (log.beforePhoto != null)
                  Expanded(
                    child: _photoThumb(
                      'Before',
                      log.beforePhoto!,
                      log.formattedBeforeTime,
                    ),
                  ),
                if (log.beforePhoto != null && log.afterPhoto != null)
                  const SizedBox(width: 8),
                if (log.afterPhoto != null)
                  Expanded(
                    child: _photoThumb(
                      'After',
                      log.afterPhoto!,
                      log.formattedAfterTime,
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _approvalBadge(String status) {
    final Color bg;
    final Color fg;
    final String label;
    final IconData icon;
    switch (status) {
      case 'approved':
        bg = AppColors.greenLight;
        fg = AppColors.green;
        label = 'Approved';
        icon = Icons.check_circle_rounded;
        break;
      case 'rejected':
        bg = AppColors.redLight;
        fg = AppColors.red;
        label = 'Rejected';
        icon = Icons.cancel_rounded;
        break;
      default:
        bg = AppColors.amberLight;
        fg = AppColors.amber;
        label = 'Pending';
        icon = Icons.schedule_rounded;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: fg),
          const SizedBox(width: 3),
          Text(
            label,
            style: GoogleFonts.nunito(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }

  void _openFullScreenImage(String url, String label) {
    final resolvedUrl = ApiService.resolvePhotoUrl(url);
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: Colors.black,
          body: Stack(
            children: [
              Center(
                child: InteractiveViewer(
                  minScale: 0.5,
                  maxScale: 4.0,
                  child: Image.network(
                    resolvedUrl,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const Icon(
                      Icons.broken_image,
                      color: Colors.white54,
                      size: 64,
                    ),
                  ),
                ),
              ),
              Positioned(
                top: MediaQuery.of(context).padding.top + 8,
                left: 8,
                child: IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, color: Colors.white, size: 28),
                  style: IconButton.styleFrom(backgroundColor: Colors.black54),
                ),
              ),
              Positioned(
                top: MediaQuery.of(context).padding.top + 14,
                left: 0,
                right: 0,
                child: Center(
                  child: Text(
                    label,
                    style: GoogleFonts.nunito(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _photoThumb(String label, String url, String? timestamp) {
    final resolvedUrl = ApiService.resolvePhotoUrl(url);
    return Column(
      children: [
        Text(
          label,
          style: GoogleFonts.nunito(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: AppColors.muted,
          ),
        ),
        const SizedBox(height: 4),
        GestureDetector(
          onTap: () => _openFullScreenImage(url, label),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              resolvedUrl,
              height: 80,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                height: 80,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.broken_image, color: AppColors.muted),
              ),
            ),
          ),
        ),
        if (timestamp != null) ...[
          const SizedBox(height: 3),
          Text(
            timestamp,
            style: GoogleFonts.nunito(
              fontSize: 9,
              color: AppColors.muted,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ],
    );
  }
}
class _AssignEmployeesSheet extends StatefulWidget {
  final List<dynamic> employees;
  final Set<int> initialSelected;
  final Set<int> alreadyAssigned;
  final Future<void> Function(Set<int> selected) onConfirm;

  const _AssignEmployeesSheet({
    required this.employees,
    required this.initialSelected,
    required this.alreadyAssigned,
    required this.onConfirm,
  });

  @override
  State<_AssignEmployeesSheet> createState() => _AssignEmployeesSheetState();
}

class _AssignEmployeesSheetState extends State<_AssignEmployeesSheet> {
  late Set<int> _selected;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _selected = {...widget.initialSelected};
  }

  String _employeeName(dynamic emp) {
    final user = emp['user'] as Map<String, dynamic>?;
    if (user == null) return 'Employee';
    final first = user['first_name'] ?? '';
    final last = user['last_name'] ?? '';
    return '$first $last'.trim();
  }

  int _employeeId(dynamic emp) => emp['id'] as int? ?? 0;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          Container(
            width: 36, height: 4,
            decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Select Employees', style: GoogleFonts.fraunces(
                  fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.text,
                )),
                Text('${_selected.length} selected', style: GoogleFonts.nunito(
                  fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.muted,
                )),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (widget.employees.isEmpty)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Text('No employees found', style: GoogleFonts.nunito(
                fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.muted,
              )),
            )
          else
            ConstrainedBox(
              constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.4),
              child: ListView.builder(
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: widget.employees.length,
                itemBuilder: (_, i) {
                  final emp = widget.employees[i];
                  final id = _employeeId(emp);
                  final name = _employeeName(emp);
                  final isSelected = _selected.contains(id);
                  return GestureDetector(
                    onTap: () => setState(() {
                      if (isSelected) {
                        _selected.remove(id);
                      } else {
                        _selected.add(id);
                      }
                    }),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.greenLight : AppColors.bg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSelected ? AppColors.green : AppColors.border,
                          width: 1.5,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 32, height: 32,
                            decoration: BoxDecoration(
                              color: isSelected ? AppColors.green : AppColors.border,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Center(
                              child: Text(
                                name.isNotEmpty ? name[0].toUpperCase() : '?',
                                style: GoogleFonts.nunito(
                                  fontSize: 14, fontWeight: FontWeight.w800,
                                  color: isSelected ? Colors.white : AppColors.muted,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(name, style: GoogleFonts.nunito(
                              fontSize: 13, fontWeight: FontWeight.w700,
                              color: isSelected ? AppColors.green : AppColors.text,
                            )),
                          ),
                          if (isSelected)
                            const Icon(Icons.check_circle_rounded, color: AppColors.green, size: 20)
                          else
                            const Icon(Icons.radio_button_unchecked_rounded, color: AppColors.border, size: 20),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSaving
                    ? null
                    : () async {
                        setState(() => _isSaving = true);
                        Navigator.pop(context);
                        await widget.onConfirm(_selected);
                      },
                style: AppTheme.greenButton,
                child: _isSaving
                    ? const SizedBox(
                        height: 18, width: 18,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : Text('Confirm', style: GoogleFonts.nunito(fontWeight: FontWeight.w800)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressPainter extends CustomPainter {
  final double progress;
  _ProgressPainter(this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 3;

    // Background
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = Colors.white.withOpacity(0.2)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 5,
    );

    // Progress
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -pi / 2,
      2 * pi * progress,
      false,
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = 5
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

