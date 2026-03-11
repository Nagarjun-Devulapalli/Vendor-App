class WorkLog {
  final int id;
  final int occurrenceId;
  final String status;
  final String? beforePhoto;
  final String? beforePhotoTakenAt;
  final String? afterPhoto;
  final String? afterPhotoTakenAt;
  final String description;
  final String createdAt;
  final String? userName;
  final String? approvalStatus;
  final String? rejectionReason;
  final String? reviewedByName;

  WorkLog({
    required this.id,
    required this.occurrenceId,
    this.status = 'in_progress',
    this.beforePhoto,
    this.beforePhotoTakenAt,
    this.afterPhoto,
    this.afterPhotoTakenAt,
    required this.description,
    required this.createdAt,
    this.userName,
    this.approvalStatus,
    this.rejectionReason,
    this.reviewedByName,
  });

  bool get isInProgress => status == 'in_progress';
  bool get isCompleted => status == 'completed';

  factory WorkLog.fromJson(Map<String, dynamic> json) => WorkLog(
        id: json['id'] ?? 0,
        occurrenceId: json['occurrence'] is Map
            ? json['occurrence']['id'] ?? 0
            : (json['occurrence'] ?? 0),
        status: json['status'] ?? 'in_progress',
        beforePhoto: json['before_photo'],
        beforePhotoTakenAt: json['before_photo_taken_at'],
        afterPhoto: json['after_photo'],
        afterPhotoTakenAt: json['after_photo_taken_at'],
        description: json['description'] ?? '',
        createdAt: json['created_at'] ?? '',
        userName: json['user_name'] ?? json['user']?.toString(),
        approvalStatus: json['approval_status'],
        rejectionReason: json['rejection_reason'],
        reviewedByName: json['reviewed_by_name'],
      );

  String? get formattedBeforeTime => _formatTimestamp(beforePhotoTakenAt);
  String? get formattedAfterTime => _formatTimestamp(afterPhotoTakenAt);

  static String? _formatTimestamp(String? ts) {
    if (ts == null) return null;
    try {
      final dt = DateTime.parse(ts).toLocal();
      return '${dt.day}/${dt.month}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return ts;
    }
  }
}
