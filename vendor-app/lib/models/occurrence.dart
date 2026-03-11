class OccurrenceAssignment {
  final int id;
  final int employeeId;
  final String employeeName;
  final String assignedAt;

  OccurrenceAssignment({
    required this.id,
    required this.employeeId,
    required this.employeeName,
    required this.assignedAt,
  });

  factory OccurrenceAssignment.fromJson(Map<String, dynamic> json) {
    return OccurrenceAssignment(
      id: json['id'] ?? 0,
      employeeId: json['employee_id'] ?? 0,
      employeeName: json['employee_name'] ?? '',
      assignedAt: json['assigned_at'] ?? '',
    );
  }
}

class Occurrence {
  final int id;
  final int activityId;
  final String activityTitle;
  final String? categoryName;
  final String? activityDescription;
  final String scheduledDate;
  final String status;
  final String? completedByName;
  final int workLogCount;
  final List<OccurrenceAssignment> assignments;

  Occurrence({
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
      status: json['status'] ?? 'pending',
      completedByName: json['completed_by_name'],
      workLogCount: json['work_logs'] is List
          ? (json['work_logs'] as List).length
          : (json['work_log_count'] ?? 0),
      assignments: assignmentsList
          .map((e) => OccurrenceAssignment.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  bool get isPending => status == 'pending';
  bool get isInProgress => status == 'in_progress';
  bool get isCompleted => status == 'completed';
  bool get isMissed => status == 'missed';
}
