import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../cubit/auth_cubit.dart';
import '../../../core/theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  String _selectedRole = 'vendor_owner';
  String? _errorMessage;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _errorMessage = null);
    final auth = context.read<AuthCubit>();
    final success = await auth.login(
      _usernameController.text.trim(),
      _passwordController.text,
      expectedRole: _selectedRole,
    );
    if (!success && mounted) {
      _usernameController.text = '';
      _passwordController.text = '';
      setState(() => _errorMessage = auth.state.error ?? 'Login failed');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.green, Color(0xFF1a3d2b)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              const Spacer(flex: 2),
              // Logo & branding
              const Icon(Icons.school_rounded, size: 56, color: Colors.white),
              const SizedBox(height: 16),
              Text(
                'Orchids Vendor Portal',
                style: AppTheme.heading.copyWith(fontSize: 26),
              ),
              const SizedBox(height: 6),
              Text(
                'Sign in to continue',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.white.withValues(alpha: 0.55),
                ),
              ),
              const Spacer(),
              // Login card
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.3),
                        blurRadius: 60,
                        offset: const Offset(0, 20),
                      ),
                    ],
                  ),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Role tab toggle
                        Container(
                          height: 46,
                          decoration: BoxDecoration(
                            color: AppColors.bg,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Row(
                            children: [
                              _roleTab('Vendor Owner', 'vendor_owner'),
                              _roleTab('Employee', 'vendor_employee'),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                        Text('USERNAME', style: AppTheme.label),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _usernameController,
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.text),
                          decoration: AppTheme.styledInput(label: '', hint: 'Enter username'),
                          validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                        ),
                        const SizedBox(height: 14),
                        Text('PASSWORD', style: AppTheme.label),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.text),
                          decoration: AppTheme.styledInput(label: '', hint: 'Enter password').copyWith(
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                                color: AppColors.muted,
                                size: 20,
                              ),
                              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                            ),
                          ),
                          validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                          onFieldSubmitted: (_) => _login(),
                        ),
                        if (_errorMessage != null) ...[
                          const SizedBox(height: 12),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppColors.redLight,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_rounded, color: AppColors.red, size: 16),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _errorMessage!,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.red,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 20),
                        BlocBuilder<AuthCubit, AuthState>(
                          builder: (ctx, state) => SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: state.isLoading ? null : _login,
                              style: AppTheme.greenButton,
                              child: state.isLoading
                                  ? const SizedBox(
                                      width: 24, height: 24,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                    )
                                  : Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text('Sign In', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                                        const SizedBox(width: 6),
                                        const Text('\u2192', style: TextStyle(fontSize: 16)),
                                      ],
                                    ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Center(
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.lock_rounded, size: 13, color: AppColors.muted),
                              const SizedBox(width: 4),
                              Text(
                                'Credentials are provided by your school admin',
                                style: TextStyle(fontSize: 11, color: AppColors.muted, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _roleTab(String label, String role) {
    final isSelected = _selectedRole == role;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          _usernameController.clear();
          _passwordController.clear();
          _formKey.currentState?.reset();
          setState(() {
            _selectedRole = role;
            _errorMessage = null;
          });
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          margin: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.green : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: isSelected ? Colors.white : AppColors.muted,
            ),
          ),
        ),
      ),
    );
  }
}
