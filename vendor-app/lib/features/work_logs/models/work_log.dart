import 'package:equatable/equatable.dart';

enum WorkLogStatus {
  inProgress,
  completed;

  static WorkLogStatus fromString(String value) => switch (value) {
        'completed' => completed,
        _ => inProgress,
      };

  String toJson() => switch (this) {
        inProgress => 'in_progress',
        completed => 'completed',
      };
}

enum ApprovalStatus {
  pending,
  approved,
  rejected;

  static ApprovalStatus? fromString(String? value) => switch (value) {
        'approved' => approved,
        'rejected' => rejected,
        'pending' => pending,
        _ => null,
      };

  String toJson() => switch (this) {
        pending => 'pending',
        approved => 'approved',
        rejected => 'rejected',
      };
}

class WorkLog extends Equatable {
  final int id;
  final int occurrenceId;
  final int? userId;
  final WorkLogStatus status;
  final String? beforePhoto;
  final String? beforePhotoTakenAt;
  final String? afterPhoto;
  final String? afterPhotoTakenAt;
  final String description;
  final String createdAt;
  final String? userName;
  final ApprovalStatus? approvalStatus;
  final String? rejectionReason;
  final String? reviewedByName;

  const WorkLog({
    required this.id,
    required this.occurrenceId,
    this.userId,
    this.status = WorkLogStatus.inProgress,
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

  @override
  List<Object?> get props => [
        id,
        occurrenceId,
        userId,
        status,
        beforePhoto,
        beforePhotoTakenAt,
        afterPhoto,
        afterPhotoTakenAt,
        description,
        createdAt,
        userName,
        approvalStatus,
        rejectionReason,
        reviewedByName,
      ];

  factory WorkLog.fromJson(Map<String, dynamic> json) => WorkLog(
        id: json['id'] ?? 0,
        occurrenceId: json['occurrence'] is Map
            ? json['occurrence']['id'] ?? 0
            : (json['occurrence'] ?? 0),
        userId: json['user'] is int ? json['user'] as int : null,
        status: WorkLogStatus.fromString(json['status'] ?? 'in_progress'),
        beforePhoto: json['before_photo'],
        beforePhotoTakenAt: json['before_photo_taken_at'],
        afterPhoto: json['after_photo'],
        afterPhotoTakenAt: json['after_photo_taken_at'],
        description: json['description'] ?? '',
        createdAt: json['created_at'] ?? '',
        userName: json['user_name'] ?? json['user']?.toString(),
        approvalStatus: ApprovalStatus.fromString(json['approval_status']),
        rejectionReason: json['rejection_reason'],
        reviewedByName: json['reviewed_by_name'],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'occurrence': occurrenceId,
        'user': userId,
        'status': status.toJson(),
        'before_photo': beforePhoto,
        'before_photo_taken_at': beforePhotoTakenAt,
        'after_photo': afterPhoto,
        'after_photo_taken_at': afterPhotoTakenAt,
        'description': description,
        'created_at': createdAt,
        'user_name': userName,
        'approval_status': approvalStatus?.toJson(),
        'rejection_reason': rejectionReason,
        'reviewed_by_name': reviewedByName,
      };

  WorkLog copyWith({
    int? id,
    int? occurrenceId,
    int? userId,
    WorkLogStatus? status,
    String? beforePhoto,
    String? beforePhotoTakenAt,
    String? afterPhoto,
    String? afterPhotoTakenAt,
    String? description,
    String? createdAt,
    String? userName,
    ApprovalStatus? approvalStatus,
    String? rejectionReason,
    String? reviewedByName,
  }) =>
      WorkLog(
        id: id ?? this.id,
        occurrenceId: occurrenceId ?? this.occurrenceId,
        userId: userId ?? this.userId,
        status: status ?? this.status,
        beforePhoto: beforePhoto ?? this.beforePhoto,
        beforePhotoTakenAt: beforePhotoTakenAt ?? this.beforePhotoTakenAt,
        afterPhoto: afterPhoto ?? this.afterPhoto,
        afterPhotoTakenAt: afterPhotoTakenAt ?? this.afterPhotoTakenAt,
        description: description ?? this.description,
        createdAt: createdAt ?? this.createdAt,
        userName: userName ?? this.userName,
        approvalStatus: approvalStatus ?? this.approvalStatus,
        rejectionReason: rejectionReason ?? this.rejectionReason,
        reviewedByName: reviewedByName ?? this.reviewedByName,
      );

  bool get isInProgress => status == WorkLogStatus.inProgress;
  bool get isCompleted => status == WorkLogStatus.completed;

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
