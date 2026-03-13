import 'package:flutter/material.dart';

class AppColors {
  static const green = Color(0xFF1a6b4a);
  static const green2 = Color(0xFF2d8f63);
  static const greenLight = Color(0xFFe8f5ee);
  static const amber = Color(0xFFe8a020);
  static const amberLight = Color(0xFFfef3e0);
  static const red = Color(0xFFc0392b);
  static const redLight = Color(0xFFfdecea);
  static const blue = Color(0xFF2563a8);
  static const blueLight = Color(0xFFe8f0fc);
  static const bg = Color(0xFFf2f4f7);
  static const border = Color(0xFFe4e8ed);
  static const text = Color(0xFF18202e);
  static const muted = Color(0xFF7a8494);
}

class AppTheme {
  static ThemeData get theme {
    return ThemeData(
      useMaterial3: true,
      colorSchemeSeed: AppColors.green,
      scaffoldBackgroundColor: AppColors.bg,
    );
  }

  static TextStyle get heading => const TextStyle(
        fontWeight: FontWeight.w800,
        color: Colors.white,
      );

  static TextStyle get headingDark => const TextStyle(
        fontWeight: FontWeight.w800,
        color: AppColors.text,
      );

  static TextStyle get body => const TextStyle(
        color: AppColors.text,
      );

  static TextStyle get label => const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w800,
        color: AppColors.muted,
        letterSpacing: 0.7,
      );

  static TextStyle get sectionTitle => const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w800,
        color: AppColors.muted,
        letterSpacing: 0.9,
      );

  static BoxDecoration get cardDecoration => BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      );

  static InputDecoration styledInput({
    required String label,
    String? hint,
    Widget? prefix,
  }) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      prefixIcon: prefix,
      labelStyle: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w800,
        color: AppColors.muted,
        letterSpacing: 0.7,
      ),
      hintStyle: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: AppColors.muted,
      ),
      filled: true,
      fillColor: AppColors.bg,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border, width: 1.5),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border, width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.green, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
    );
  }

  static ButtonStyle get greenButton => ElevatedButton.styleFrom(
        backgroundColor: AppColors.green,
        foregroundColor: Colors.white,
        elevation: 4,
        shadowColor: AppColors.green.withOpacity(0.35),
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
      );

  static ButtonStyle get outlineButton => OutlinedButton.styleFrom(
        foregroundColor: AppColors.text,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        side: const BorderSide(color: AppColors.border, width: 2),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
      );
}
