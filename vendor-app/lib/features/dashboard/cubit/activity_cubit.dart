import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../occurrences/models/occurrence.dart';
import '../../../core/services/api_service.dart';

part 'activity_state.dart';

class ActivityCubit extends Cubit<ActivityState> {
  ActivityCubit() : super(const ActivityState());

  Future<void> loadTodayTasks() async {
    emit(state.copyWith(isLoading: true, clearError: true));

    try {
      final data = await ApiService.getTodayOccurrences();
      final tasks = data
          .map((e) => Occurrence.fromJson(e as Map<String, dynamic>))
          .toList();
      emit(state.copyWith(todayTasks: tasks, isLoading: false));
    } catch (e) {
      emit(state.copyWith(
        error: e.toString().replaceFirst('Exception: ', ''),
        isLoading: false,
      ));
    }
  }

  Future<void> updateOccurrenceStatus(int id, String status) async {
    try {
      await ApiService.updateOccurrenceStatus(id, status);
      final index = state.todayTasks.indexWhere((t) => t.id == id);
      if (index != -1) {
        await loadTodayTasks();
      }
    } catch (e) {
      emit(state.copyWith(
        error: e.toString().replaceFirst('Exception: ', ''),
      ));
    }
  }

  Future<bool> markActivityComplete(int activityId) async {
    try {
      await ApiService.markActivityComplete(activityId);
      await loadTodayTasks();
      return true;
    } catch (e) {
      emit(state.copyWith(
        error: e.toString().replaceFirst('Exception: ', ''),
      ));
      return false;
    }
  }
}
