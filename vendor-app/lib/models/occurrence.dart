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
  });

  factory Occurrence.fromJson(Map<String, dynamic> json) {
    final activity = json['activity'];
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
    );
  }

  bool get isPending => status == 'pending';
  bool get isCompleted => status == 'completed';
  bool get isMissed => status == 'missed';
}
