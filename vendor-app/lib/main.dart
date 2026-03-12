import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'features/auth/cubit/auth_cubit.dart';
import 'features/dashboard/cubit/activity_cubit.dart';
import 'core/theme/app_theme.dart';
import 'core/routes.dart';

void main() {
  runApp(
    MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => AuthCubit()),
        BlocProvider(create: (_) => ActivityCubit()),
      ],
      child: const VendorApp(),
    ),
  );
}

class VendorApp extends StatelessWidget {
  const VendorApp({super.key});

  @override
  Widget build(BuildContext context) {
    final authCubit = context.read<AuthCubit>();
    authCubit.tryAutoLogin();
    final router = createVendorRouter(authCubit);

    return MaterialApp.router(
      title: 'Orchids Vendor Portal',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      routerConfig: router,
    );
  }
}
