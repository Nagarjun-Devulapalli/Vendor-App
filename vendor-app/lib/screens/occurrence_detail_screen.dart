import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:math' show pi;
import '../models/occurrence.dart';
import '../models/work_log.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/detail_hero.dart';
import 'work_log_screen.dart';

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

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final occData = await ApiService.getOccurrenceDetail(widget.occurrenceId);
      final logsData = await ApiService.getWorkLogs(widget.occurrenceId);
      setState(() {
        _occurrence = Occurrence.fromJson(occData);
        _workLogs = logsData.map((e) => WorkLog.fromJson(e as Map<String, dynamic>)).toList();
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

  String _categoryIcon(String? cat) {
    final c = cat?.toLowerCase() ?? '';
    if (c.contains('electric')) return '⚡';
    if (c.contains('plumb')) return '🔧';
    if (c.contains('clean') || c.contains('housekeep')) return '🧹';
    if (c.contains('security')) return '🛡️';
    if (c.contains('pest')) return '🐛';
    if (c.contains('garden') || c.contains('landscape')) return '🌿';
    if (c.contains('fire')) return '🔥';
    if (c.contains('it') || c.contains('network')) return '💻';
    if (c.contains('transport')) return '🚐';
    if (c.contains('cafe') || c.contains('kitchen')) return '🍽️';
    if (c.contains('waste')) return '♻️';
    if (c.contains('hvac') || c.contains('ventil')) return '❄️';
    if (c.contains('civil') || c.contains('structur')) return '🏗️';
    if (c.contains('event')) return '🎪';
    return '📋';
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
            const Expanded(child: Center(child: CircularProgressIndicator(color: AppColors.green))),
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

    // Progress ring
    final progress = occ.isCompleted
        ? 1.0
        : occ.status == 'in_progress'
            ? 0.5
            : (_workLogs.isNotEmpty ? 0.3 + (_workLogs.length * 0.1) : 0.0);

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Column(
        children: [
          DetailHero(
            title: occ.activityTitle,
            subtitle: '${occ.categoryName ?? 'Task'} · ${occ.scheduledDate}',
            onBack: () => Navigator.pop(context),
            trailing: _progressRing(progress),
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
                      _chip(
                        occ.status == 'completed' ? '✓ Completed'
                            : occ.status == 'in_progress' ? '● In Progress'
                            : occ.status == 'missed' ? '⚠️ Overdue'
                            : '● Pending',
                        occ.status == 'completed' ? AppColors.greenLight
                            : occ.status == 'in_progress' ? AppColors.blueLight
                            : occ.status == 'missed' ? AppColors.redLight
                            : AppColors.amberLight,
                        occ.status == 'completed' ? AppColors.green
                            : occ.status == 'in_progress' ? AppColors.blue
                            : occ.status == 'missed' ? AppColors.red
                            : AppColors.amber,
                      ),
                      if (occ.categoryName != null)
                        _chip('${_categoryIcon(occ.categoryName)} ${occ.categoryName}', AppColors.greenLight, AppColors.green),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Info block
                  _infoBlock([
                    _infoRow('Scheduled Date', occ.scheduledDate),
                    _infoRow('Status',
                      occ.status == 'in_progress' ? 'In Progress'
                          : occ.status[0].toUpperCase() + occ.status.substring(1),
                      valueColor: occ.status == 'completed' ? AppColors.green
                          : occ.status == 'in_progress' ? AppColors.blue
                          : occ.status == 'missed' ? AppColors.red : AppColors.amber),
                    if (occ.completedByName != null)
                      _infoRow('Completed By', occ.completedByName!),
                  ]),

                  // Description
                  if (occ.activityDescription != null && occ.activityDescription!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    _sectionBlock('DESCRIPTION', Text(
                      occ.activityDescription!,
                      style: GoogleFonts.nunito(
                        fontSize: 13, fontWeight: FontWeight.w600,
                        color: AppColors.text, height: 1.6,
                      ),
                    )),
                  ],

                  // Work logs
                  const SizedBox(height: 12),
                  _sectionBlock(
                    'WORK LOGS (${_workLogs.length})',
                    _workLogs.isEmpty
                        ? Padding(
                            padding: const EdgeInsets.all(8),
                            child: Center(child: Text(
                              'No logs yet for this occurrence',
                              style: GoogleFonts.nunito(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.muted),
                            )),
                          )
                        : Column(
                            children: _workLogs.map((log) => _workLogCard(log)).toList(),
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

  Widget _buildActionButton(Occurrence occ) {
    // Find an in-progress work log if one exists
    final inProgressLog = _workLogs.cast<WorkLog?>().firstWhere(
      (log) => log!.isInProgress,
      orElse: () => null,
    );

    if (occ.status == 'pending' && _workLogs.isEmpty) {
      // No work started yet - show Start Work button
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: () async {
            final result = await Navigator.push(context, MaterialPageRoute(
              builder: (_) => WorkLogScreen(
                occurrenceId: widget.occurrenceId,
                mode: WorkLogMode.start,
              ),
            ));
            if (result == true) _loadData();
          },
          icon: const Icon(Icons.play_arrow_rounded, size: 20),
          label: Text('Start Work', style: GoogleFonts.nunito(fontWeight: FontWeight.w800)),
          style: AppTheme.greenButton,
        ),
      );
    } else if ((occ.status == 'in_progress' || occ.status == 'pending') && inProgressLog != null) {
      // Work in progress - show Complete Work button
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: () async {
            final result = await Navigator.push(context, MaterialPageRoute(
              builder: (_) => WorkLogScreen(
                occurrenceId: widget.occurrenceId,
                mode: WorkLogMode.complete,
                workLogId: inProgressLog.id,
                existingBeforePhotoUrl: inProgressLog.beforePhoto,
              ),
            ));
            if (result == true) _loadData();
          },
          icon: const Icon(Icons.check_circle_outline_rounded, size: 20),
          label: Text('Complete Work', style: GoogleFonts.nunito(fontWeight: FontWeight.w800)),
          style: AppTheme.greenButton,
        ),
      );
    } else if (occ.status == 'completed') {
      // Completed - show disabled button
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

    // Fallback: no action button (e.g. missed status)
    return const SizedBox.shrink();
  }

  Widget _progressRing(double progress) {
    final pct = (progress * 100).toInt();
    return Column(
      children: [
        SizedBox(
          width: 56, height: 56,
          child: CustomPaint(
            painter: _ProgressPainter(progress),
            child: Center(
              child: Text(
                '$pct%',
                style: GoogleFonts.fraunces(
                  fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text('DONE', style: GoogleFonts.nunito(
          fontSize: 9, fontWeight: FontWeight.w700, color: Colors.white.withOpacity(0.6),
        )),
      ],
    );
  }

  Widget _chip(String text, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(text, style: GoogleFonts.nunito(fontSize: 11, fontWeight: FontWeight.w800, color: fg)),
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
          Text(label, style: GoogleFonts.nunito(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.muted)),
          Text(value, style: GoogleFonts.nunito(fontSize: 13, fontWeight: FontWeight.w700, color: valueColor ?? AppColors.text)),
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
              Text('By: ${log.userName ?? 'Unknown'}', style: GoogleFonts.nunito(
                fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.text,
              )),
              Row(
                children: [
                  if (log.approvalStatus != null) ...[
                    _approvalBadge(log.approvalStatus!),
                    const SizedBox(width: 8),
                  ],
                  Text(log.createdAt.split('T').first, style: GoogleFonts.nunito(
                    fontSize: 11, color: AppColors.muted, fontWeight: FontWeight.w600,
                  )),
                ],
              ),
            ],
          ),
          if (log.approvalStatus == 'rejected' && log.rejectionReason != null && log.rejectionReason!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'Rejected: ${log.rejectionReason}',
              style: GoogleFonts.nunito(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.red),
            ),
          ],
          if (log.approvalStatus == 'approved' && log.reviewedByName != null) ...[
            const SizedBox(height: 4),
            Text(
              'Approved by ${log.reviewedByName}',
              style: GoogleFonts.nunito(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.green),
            ),
          ],
          if (log.description.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(log.description, style: GoogleFonts.nunito(
              fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.text, height: 1.4,
            )),
          ],
          if (log.beforePhoto != null || log.afterPhoto != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                if (log.beforePhoto != null)
                  Expanded(child: _photoThumb('Before', log.beforePhoto!, log.formattedBeforeTime)),
                if (log.beforePhoto != null && log.afterPhoto != null) const SizedBox(width: 8),
                if (log.afterPhoto != null)
                  Expanded(child: _photoThumb('After', log.afterPhoto!, log.formattedAfterTime)),
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
    switch (status) {
      case 'approved':
        bg = AppColors.greenLight;
        fg = AppColors.green;
        label = '✓ Approved';
        break;
      case 'rejected':
        bg = AppColors.redLight;
        fg = AppColors.red;
        label = '✗ Rejected';
        break;
      default:
        bg = AppColors.amberLight;
        fg = AppColors.amber;
        label = '● Pending';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
      child: Text(label, style: GoogleFonts.nunito(fontSize: 10, fontWeight: FontWeight.w800, color: fg)),
    );
  }

  Widget _photoThumb(String label, String url, String? timestamp) {
    return Column(
      children: [
        Text(label, style: GoogleFonts.nunito(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.muted)),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.network(
            'http://10.0.2.2:8000$url',
            height: 80,
            width: double.infinity,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              height: 80,
              decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.broken_image, color: AppColors.muted),
            ),
          ),
        ),
        if (timestamp != null) ...[
          const SizedBox(height: 3),
          Text(timestamp, style: GoogleFonts.nunito(fontSize: 9, color: AppColors.muted, fontWeight: FontWeight.w600)),
        ],
      ],
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
      center, radius,
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
