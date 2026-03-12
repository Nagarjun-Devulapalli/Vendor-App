import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../models/user.dart';
import '../../../core/services/api_service.dart';
import '../../../core/services/auth_service.dart';

part 'auth_state.dart';

class AuthCubit extends Cubit<AuthState> {
  AuthCubit() : super(const AuthState());

  Future<bool> login(String username, String password,
      {String? expectedRole}) async {
    emit(state.copyWith(isLoading: true, clearError: true));

    try {
      final data = await ApiService.login(username, password);
      final userData = data['user'] as Map<String, dynamic>;
      final user = User.fromJson(userData);

      // Role mismatch check before setting user
      if (expectedRole != null && user.role != expectedRole) {
        final expected =
            expectedRole == 'vendor_owner' ? 'Vendor Owner' : 'Employee';
        emit(state.copyWith(
          error: 'These credentials are not valid for $expected login',
          isLoading: false,
        ));
        return false;
      }

      await AuthService.saveTokens(data['access'], data['refresh']);
      await AuthService.saveUser(userData);
      emit(state.copyWith(
        user: user,
        isLoading: false,
        status: AuthStatus.authenticated,
      ));
      return true;
    } catch (e) {
      emit(state.copyWith(
        error: 'Wrong credentials. Please try again.',
        isLoading: false,
        status: AuthStatus.error,
      ));
      return false;
    }
  }

  Future<void> logout() async {
    await AuthService.clear();
    emit(const AuthState(
      isInitializing: false,
      status: AuthStatus.unauthenticated,
    ));
  }

  Future<void> tryAutoLogin() async {
    emit(state.copyWith(isInitializing: true));

    try {
      final token = await AuthService.getAccessToken();
      if (token == null) {
        emit(state.copyWith(
          isInitializing: false,
          status: AuthStatus.unauthenticated,
        ));
        return;
      }

      User? user;
      final savedUser = await AuthService.getUser();
      if (savedUser != null) {
        user = User.fromJson(savedUser);
      }

      try {
        final profile = await ApiService.getProfile();
        user = User.fromJson(profile);
        await AuthService.saveUser(profile);
      } catch (_) {
        // If profile fetch fails but we have saved user, keep it
        if (user == null) {
          await AuthService.clear();
          emit(state.copyWith(
            isInitializing: false,
            status: AuthStatus.unauthenticated,
          ));
          return;
        }
      }

      emit(state.copyWith(
        user: user,
        isInitializing: false,
        status: AuthStatus.authenticated,
      ));
    } catch (_) {
      await AuthService.clear();
      emit(state.copyWith(
        isInitializing: false,
        status: AuthStatus.unauthenticated,
      ));
    }
  }
}
