part of 'auth_cubit.dart';

enum AuthStatus { initial, authenticated, unauthenticated, loading, error }

class AuthState extends Equatable {
  final User? user;
  final bool isLoading;
  final bool isInitializing;
  final String? error;
  final AuthStatus status;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.isInitializing = true,
    this.error,
    this.status = AuthStatus.initial,
  });

  bool get isAuthenticated => user != null;

  AuthState copyWith({
    User? user,
    bool? isLoading,
    bool? isInitializing,
    String? error,
    AuthStatus? status,
    bool clearUser = false,
    bool clearError = false,
  }) {
    return AuthState(
      user: clearUser ? null : (user ?? this.user),
      isLoading: isLoading ?? this.isLoading,
      isInitializing: isInitializing ?? this.isInitializing,
      error: clearError ? null : (error ?? this.error),
      status: status ?? this.status,
    );
  }

  @override
  List<Object?> get props => [user, isLoading, isInitializing, error, status];
}
