part of 'activity_cubit.dart';

class ActivityState extends Equatable {
  final List<Occurrence> todayTasks;
  final bool isLoading;
  final String? error;

  const ActivityState({
    this.todayTasks = const [],
    this.isLoading = false,
    this.error,
  });

  ActivityState copyWith({
    List<Occurrence>? todayTasks,
    bool? isLoading,
    String? error,
    bool clearError = false,
  }) {
    return ActivityState(
      todayTasks: todayTasks ?? this.todayTasks,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props => [todayTasks, isLoading, error];
}
