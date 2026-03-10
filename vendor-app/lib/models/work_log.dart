class WorkLog {
  final int id;
  final int occurrenceId;
  final String? beforePhoto;
  final String? beforePhotoTakenAt;
  final String? afterPhoto;
  final String? afterPhotoTakenAt;
  final String description;
  final String createdAt;
  final String? userName;

  WorkLog({
    required this.id,
    required this.occurrenceId,
    this.beforePhoto,
    this.beforePhotoTakenAt,
    this.afterPhoto,
    this.afterPhotoTakenAt,
    required this.description,
    required this.createdAt,
    this.userName,
  });

  factory WorkLog.fromJson(Map<String, dynamic> json) => WorkLog(
        id: json['id'] ?? 0,
        occurrenceId: json['occurrence'] is Map
            ? json['occurrence']['id'] ?? 0
            : (json['occurrence'] ?? 0),
        beforePhoto: json['before_photo'],
        beforePhotoTakenAt: json['before_photo_taken_at'],
        afterPhoto: json['after_photo'],
        afterPhotoTakenAt: json['after_photo_taken_at'],
        description: json['description'] ?? '',
        createdAt: json['created_at'] ?? '',
        userName: json['user_name'] ?? json['user']?.toString(),
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
