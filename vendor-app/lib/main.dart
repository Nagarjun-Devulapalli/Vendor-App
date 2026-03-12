import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/dashboard/providers/activity_provider.dart';
import 'core/theme/app_theme.dart';
import 'core/routes.dart';

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

class VendorApp extends StatelessWidget {
  const VendorApp({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.read<AuthProvider>();
    authProvider.tryAutoLogin();
    final router = createVendorRouter(authProvider);

    return MaterialApp.router(
      title: 'Orchids Vendor Portal',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      routerConfig: router,
    );
  }
}
