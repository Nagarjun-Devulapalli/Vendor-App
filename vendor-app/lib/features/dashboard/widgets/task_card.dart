import 'package:flutter/material.dart';
import '../../occurrences/models/occurrence.dart';
import '../../../core/theme/app_theme.dart';

class TaskCard extends StatelessWidget {
  final Occurrence occurrence;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  const TaskCard({super.key, required this.occurrence, this.onTap, this.onLongPress});

  Color get _statusColor {
    switch (occurrence.status) {
      case OccurrenceStatus.completed:
        return AppColors.green;
      case OccurrenceStatus.missed:
        return AppColors.red;
      default:
        return AppColors.amber;
    }
  }

  Color get _iconBg {
    switch (occurrence.status) {
      case OccurrenceStatus.completed:
        return AppColors.greenLight;
      case OccurrenceStatus.missed:
        return AppColors.redLight;
      default:
        return AppColors.amberLight;
    }
  }

  IconData get _statusIcon {
    switch (occurrence.status) {
      case OccurrenceStatus.completed:
        return Icons.check_circle_rounded;
      case OccurrenceStatus.missed:
        return Icons.warning_rounded;
      default:
        return Icons.schedule_rounded;
    }
  }

  String get _statusLabel {
    switch (occurrence.status) {
      case OccurrenceStatus.completed:
        return 'Completed';
      case OccurrenceStatus.inProgress:
        return 'In Progress';
      case OccurrenceStatus.missed:
        return 'Overdue';
      default:
        return 'Pending';
    }
  }

  IconData get _categoryIcon {
    final cat = occurrence.categoryName?.toLowerCase() ?? '';
    if (cat.contains('electric')) return Icons.electrical_services_rounded;
    if (cat.contains('plumb')) return Icons.plumbing_rounded;
    if (cat.contains('clean') || cat.contains('housekeep')) return Icons.cleaning_services_rounded;
    if (cat.contains('security')) return Icons.shield_rounded;
    if (cat.contains('pest')) return Icons.pest_control_rounded;
    if (cat.contains('garden') || cat.contains('landscape')) return Icons.yard_rounded;
    if (cat.contains('fire')) return Icons.local_fire_department_rounded;
    if (cat.contains('it') || cat.contains('network')) return Icons.computer_rounded;
    if (cat.contains('transport')) return Icons.local_shipping_rounded;
    if (cat.contains('cafe') || cat.contains('kitchen')) return Icons.restaurant_rounded;
    if (cat.contains('waste')) return Icons.recycling_rounded;
    if (cat.contains('hvac') || cat.contains('ventil')) return Icons.ac_unit_rounded;
    if (cat.contains('civil') || cat.contains('structur')) return Icons.construction_rounded;
    if (cat.contains('event')) return Icons.event_rounded;
    return Icons.assignment_rounded;
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      onLongPress: onLongPress,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: AppTheme.cardDecoration.copyWith(
          borderRadius: BorderRadius.circular(18),
        ),
        clipBehavior: Clip.hardEdge,
        child: Stack(
          children: [
            // Left accent bar
            Positioned(
              left: 0, top: 0, bottom: 0,
              child: Container(
                width: 4,
                color: _statusColor,
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Icon
                  Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(
                      color: _iconBg,
                      borderRadius: BorderRadius.circular(13),
                    ),
                    alignment: Alignment.center,
                    child: Icon(_categoryIcon, size: 22, color: _statusColor),
                  ),
                  const SizedBox(width: 14),
                  // Body
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          occurrence.activityTitle,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: AppColors.text,
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Started ${occurrence.scheduledDate}${occurrence.categoryName != null ? ' · ${occurrence.categoryName}' : ''}',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.muted,
                          ),
                        ),
                        const SizedBox(height: 8),
                        // Status badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                          decoration: BoxDecoration(
                            color: occurrence.isCompleted
                                ? AppColors.greenLight
                                : occurrence.isMissed
                                    ? AppColors.redLight
                                    : AppColors.amberLight,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(_statusIcon, size: 12, color: _statusColor),
                              const SizedBox(width: 3),
                              Text(
                                _statusLabel,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: _statusColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Arrow
                  Icon(Icons.chevron_right_rounded, color: AppColors.muted, size: 20),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
