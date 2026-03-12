import 'package:equatable/equatable.dart';

enum OccurrenceStatus {
  pending,
  inProgress,
  completed,
  missed;

  static OccurrenceStatus fromString(String value) => switch (value) {
        'pending' => pending,
        'in_progress' => inProgress,
        'completed' => completed,
        'missed' => missed,
        _ => pending,
      };

  String toJson() => switch (this) {
        pending => 'pending',
        inProgress => 'in_progress',
        completed => 'completed',
        missed => 'missed',
      };
}

class OccurrenceAssignment extends Equatable {
  final int id;
  final int employeeId;
  final String employeeName;
  final String assignedAt;

  const OccurrenceAssignment({
    required this.id,
    required this.employeeId,
    required this.employeeName,
    required this.assignedAt,
  });

  @override
  List<Object?> get props => [id, employeeId, employeeName, assignedAt];

  factory OccurrenceAssignment.fromJson(Map<String, dynamic> json) {
    return OccurrenceAssignment(
      id: json['id'] ?? 0,
      employeeId: json['employee_id'] ?? 0,
      employeeName: json['employee_name'] ?? '',
      assignedAt: json['assigned_at'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'employee_id': employeeId,
        'employee_name': employeeName,
        'assigned_at': assignedAt,
      };

  OccurrenceAssignment copyWith({
    int? id,
    int? employeeId,
    String? employeeName,
    String? assignedAt,
  }) =>
      OccurrenceAssignment(
        id: id ?? this.id,
        employeeId: employeeId ?? this.employeeId,
        employeeName: employeeName ?? this.employeeName,
        assignedAt: assignedAt ?? this.assignedAt,
      );
}

class Occurrence extends Equatable {
  final int id;
  final int activityId;
  final String activityTitle;
  final String? categoryName;
  final String? activityDescription;
  final String scheduledDate;
  final OccurrenceStatus status;
  final String? completedByName;
  final int workLogCount;
  final List<OccurrenceAssignment> assignments;

  const Occurrence({
    required this.id,
    required this.activityId,
    required this.activityTitle,
    this.categoryName,
    this.activityDescription,
    required this.scheduledDate,
    required this.status,
    this.completedByName,
    this.workLogCount = 0,
    this.assignments = const [],
  });

  @override
  List<Object?> get props => [
        id,
        activityId,
        activityTitle,
        categoryName,
        activityDescription,
        scheduledDate,
        status,
        completedByName,
        workLogCount,
        assignments,
      ];

  factory Occurrence.fromJson(Map<String, dynamic> json) {
    final activity = json['activity'];
    final assignmentsList = json['assignments'] as List? ?? [];
    return Occurrence(
      id: json['id'] ?? 0,
      activityId: activity is Map ? activity['id'] ?? 0 : (json['activity'] ?? 0),
      activityTitle: activity is Map
          ? activity['title'] ?? 'Task'
          : (json['activity_title'] ?? 'Task'),
      categoryName: activity is Map
          ? activity['category_name']
          : json['category_name'],
      activityDescription: activity is Map
          ? activity['description']
          : json['description'],
      scheduledDate: json['scheduled_date'] ?? '',
      status: OccurrenceStatus.fromString(json['status'] ?? 'pending'),
      completedByName: json['completed_by_name'],
      workLogCount: json['work_logs'] is List
          ? (json['work_logs'] as List).length
          : (json['work_log_count'] ?? 0),
      assignments: assignmentsList
          .map((e) => OccurrenceAssignment.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'activity': activityId,
        'activity_title': activityTitle,
        'category_name': categoryName,
        'description': activityDescription,
        'scheduled_date': scheduledDate,
        'status': status.toJson(),
        'completed_by_name': completedByName,
        'work_log_count': workLogCount,
        'assignments': assignments.map((a) => a.toJson()).toList(),
      };

  Occurrence copyWith({
    int? id,
    int? activityId,
    String? activityTitle,
    String? categoryName,
    String? activityDescription,
    String? scheduledDate,
    OccurrenceStatus? status,
    String? completedByName,
    int? workLogCount,
    List<OccurrenceAssignment>? assignments,
  }) =>
      Occurrence(
        id: id ?? this.id,
        activityId: activityId ?? this.activityId,
        activityTitle: activityTitle ?? this.activityTitle,
        categoryName: categoryName ?? this.categoryName,
        activityDescription: activityDescription ?? this.activityDescription,
        scheduledDate: scheduledDate ?? this.scheduledDate,
        status: status ?? this.status,
        completedByName: completedByName ?? this.completedByName,
        workLogCount: workLogCount ?? this.workLogCount,
        assignments: assignments ?? this.assignments,
      );

  bool get isPending => status == OccurrenceStatus.pending;
  bool get isInProgress => status == OccurrenceStatus.inProgress;
  bool get isCompleted => status == OccurrenceStatus.completed;
  bool get isMissed => status == OccurrenceStatus.missed;
}
