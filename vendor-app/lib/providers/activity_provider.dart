import 'package:flutter/material.dart';
import '../models/occurrence.dart';
import '../services/api_service.dart';

class ActivityProvider extends ChangeNotifier {
  List<Occurrence> _todayTasks = [];
  bool _isLoading = false;
  String? _error;

  List<Occurrence> get todayTasks => _todayTasks;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadTodayTasks() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await ApiService.getTodayOccurrences();
      _todayTasks = data.map((e) => Occurrence.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> updateOccurrenceStatus(int id, String status) async {
    try {
      await ApiService.updateOccurrenceStatus(id, status);
      final index = _todayTasks.indexWhere((t) => t.id == id);
      if (index != -1) {
        await loadTodayTasks();
      }
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
    }
  }

  Future<bool> markActivityComplete(int activityId) async {
    try {
      await ApiService.markActivityComplete(activityId);
      await loadTodayTasks();
      return true;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
      return false;
    }
  }
}
