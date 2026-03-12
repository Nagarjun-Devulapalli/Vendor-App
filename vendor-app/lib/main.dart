import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/dashboard/providers/activity_provider.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/dashboard/screens/owner_dashboard.dart';
import 'features/dashboard/screens/employee_dashboard.dart';
import 'core/theme/app_theme.dart';

void main() {
  GoogleFonts.config.allowRuntimeFetching = true;
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ActivityProvider()),
      ],
      child: const VendorApp(),
    ),
  );
}

class VendorApp extends StatefulWidget {
  const VendorApp({super.key});
  @override
  State<VendorApp> createState() => _VendorAppState();
}

class _VendorAppState extends State<VendorApp> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => context.read<AuthProvider>().tryAutoLogin());
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Orchids Vendor Portal',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      home: Consumer<AuthProvider>(
        builder: (ctx, auth, _) {
          if (auth.isInitializing) {
            return Scaffold(
              backgroundColor: AppColors.green,
              body: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.school_rounded, size: 48, color: Colors.white),
                    const SizedBox(height: 16),
                    Text('Orchids Vendor Portal', style: AppTheme.heading.copyWith(fontSize: 22)),
                    const SizedBox(height: 24),
                    const CircularProgressIndicator(color: Colors.white),
                  ],
                ),
              ),
            );
          }
          if (auth.isAuthenticated) {
            return auth.user!.isOwner
                ? const OwnerDashboard()
                : const EmployeeDashboard();
          }
          return const LoginScreen();
        },
      ),
    );
  }
}
