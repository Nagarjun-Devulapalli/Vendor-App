import 'package:flutter/material.dart';
import '../../../models/user.dart';
import '../../../core/services/api_service.dart';
import '../../../core/services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  bool _isLoading = false;
  bool _isInitializing = true;
  String? _error;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isInitializing => _isInitializing;
  bool get isAuthenticated => _user != null;
  String? get error => _error;

  Future<bool> login(String username, String password, {String? expectedRole}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await ApiService.login(username, password);
      final userData = data['user'] as Map<String, dynamic>;
      final user = User.fromJson(userData);

      // Role mismatch check before setting user
      if (expectedRole != null && user.role != expectedRole) {
        final expected = expectedRole == 'vendor_owner' ? 'Vendor Owner' : 'Employee';
        _error = 'These credentials are not valid for $expected login';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      await AuthService.saveTokens(data['access'], data['refresh']);
      await AuthService.saveUser(userData);
      _user = user;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Wrong credentials. Please try again.';
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
    _isInitializing = true;
    notifyListeners();

    try {
      final token = await AuthService.getAccessToken();
      if (token == null) {
        _isInitializing = false;
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

    _isInitializing = false;
    notifyListeners();
  }
}
