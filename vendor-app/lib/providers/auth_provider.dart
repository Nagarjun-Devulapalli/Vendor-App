import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;
  String? get error => _error;

  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await ApiService.login(username, password);
      await AuthService.saveTokens(data['access'], data['refresh']);
      final userData = data['user'] as Map<String, dynamic>;
      await AuthService.saveUser(userData);
      _user = User.fromJson(userData);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await AuthService.clear();
    _user = null;
    _error = null;
    notifyListeners();
  }

  Future<void> tryAutoLogin() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await AuthService.getAccessToken();
      if (token == null) {
        _isLoading = false;
        notifyListeners();
        return;
      }

      final savedUser = await AuthService.getUser();
      if (savedUser != null) {
        _user = User.fromJson(savedUser);
      }

      try {
        final profile = await ApiService.getProfile();
        _user = User.fromJson(profile);
        await AuthService.saveUser(profile);
      } catch (_) {
        // If profile fetch fails but we have saved user, keep it
        if (_user == null) {
          await AuthService.clear();
        }
      }
    } catch (_) {
      await AuthService.clear();
    }

    _isLoading = false;
    notifyListeners();
  }
}
