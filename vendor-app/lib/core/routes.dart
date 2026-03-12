import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:vendor_app/features/auth/cubit/auth_cubit.dart';
import 'package:vendor_app/features/auth/screens/login_screen.dart';
import 'package:vendor_app/features/dashboard/screens/owner_dashboard.dart';
import 'package:vendor_app/features/dashboard/screens/employee_dashboard.dart';
import 'package:vendor_app/features/occurrences/screens/occurrence_detail_screen.dart';
import 'package:vendor_app/features/work_logs/screens/work_log_screen.dart';
import 'package:vendor_app/features/employees/screens/employee_list_screen.dart';
import 'package:vendor_app/features/employees/screens/add_employee_screen.dart';

enum VendorRoute {
  vendorLogin('/vendor-login'),
  vendorOwnerDashboard('/vendor-owner-dashboard'),
  vendorEmployeeDashboard('/vendor-employee-dashboard'),
  vendorOccurrenceDetail('/vendor-occurrence-detail/:occurrenceId'),
  vendorWorkLog('/vendor-work-log/:occurrenceId'),
  vendorEmployeeList('/vendor-employee-list'),
  vendorAddEmployee('/vendor-add-employee');

  const VendorRoute(this.path);
  final String path;
}

/// Bridges BLoC stream to a Listenable for GoRouter's refreshListenable.
class GoRouterRefreshStream extends ChangeNotifier {
  late final StreamSubscription<dynamic> _subscription;

  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}

GoRouter createVendorRouter(AuthCubit authCubit) {
  return GoRouter(
    initialLocation: VendorRoute.vendorLogin.path,
    refreshListenable: GoRouterRefreshStream(authCubit.stream),
    redirect: (context, state) {
      final authState = authCubit.state;
      final isLoggedIn = authState.isAuthenticated;
      final isInitializing = authState.isInitializing;
      final isOnLogin = state.matchedLocation == VendorRoute.vendorLogin.path;

      if (isInitializing) return null;

      if (!isLoggedIn && !isOnLogin) {
        return VendorRoute.vendorLogin.path;
      }

      if (isLoggedIn && isOnLogin) {
        return authState.user!.isOwner
            ? VendorRoute.vendorOwnerDashboard.path
            : VendorRoute.vendorEmployeeDashboard.path;
      }

      return null;
    },
    routes: [
      GoRoute(
        name: VendorRoute.vendorLogin.name,
        path: VendorRoute.vendorLogin.path,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        name: VendorRoute.vendorOwnerDashboard.name,
        path: VendorRoute.vendorOwnerDashboard.path,
        builder: (context, state) => const OwnerDashboard(),
      ),
      GoRoute(
        name: VendorRoute.vendorEmployeeDashboard.name,
        path: VendorRoute.vendorEmployeeDashboard.path,
        builder: (context, state) => const EmployeeDashboard(),
      ),
      GoRoute(
        name: VendorRoute.vendorOccurrenceDetail.name,
        path: VendorRoute.vendorOccurrenceDetail.path,
        builder: (context, state) {
          final occurrenceId = int.parse(state.pathParameters['occurrenceId']!);
          return OccurrenceDetailScreen(occurrenceId: occurrenceId);
        },
      ),
      GoRoute(
        name: VendorRoute.vendorWorkLog.name,
        path: VendorRoute.vendorWorkLog.path,
        builder: (context, state) {
          final occurrenceId = int.parse(state.pathParameters['occurrenceId']!);
          final extra = state.extra as Map<String, dynamic>?;
          return WorkLogScreen(
            occurrenceId: occurrenceId,
            mode: extra?['mode'] ?? WorkLogMode.start,
            workLogId: extra?['workLogId'],
            existingBeforePhotoUrl: extra?['existingBeforePhotoUrl'],
          );
        },
      ),
      GoRoute(
        name: VendorRoute.vendorEmployeeList.name,
        path: VendorRoute.vendorEmployeeList.path,
        builder: (context, state) => const EmployeeListScreen(),
      ),
      GoRoute(
        name: VendorRoute.vendorAddEmployee.name,
        path: VendorRoute.vendorAddEmployee.path,
        builder: (context, state) => const AddEmployeeScreen(),
      ),
    ],
  );
}
