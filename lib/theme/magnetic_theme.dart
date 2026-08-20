import 'package:flutter/material.dart';
import 'magnetic_colors.dart';

/// Builds the app-wide dark "Magnetic" ThemeData.
class MagneticTheme {
  MagneticTheme._();

  static ThemeData build() {
    final scheme = ColorScheme.fromSeed(
      seedColor: MagneticColors.cyan,
      brightness: Brightness.dark,
      primary: MagneticColors.cyan,
      secondary: MagneticColors.magenta,
      surface: MagneticColors.voidSoft,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: MagneticColors.void_,
      colorScheme: scheme,
      fontFamily: 'Roboto',
      textTheme: const TextTheme(
        headlineSmall: TextStyle(
          color: MagneticColors.textPrimary,
          fontWeight: FontWeight.w700,
        ),
        titleLarge: TextStyle(
          color: MagneticColors.textPrimary,
          fontWeight: FontWeight.w600,
        ),
        titleMedium: TextStyle(
          color: MagneticColors.textPrimary,
          fontWeight: FontWeight.w600,
        ),
        bodyLarge: TextStyle(color: MagneticColors.textPrimary),
        bodyMedium: TextStyle(color: MagneticColors.textSecondary),
        bodySmall: TextStyle(color: MagneticColors.textMuted),
        labelSmall: TextStyle(color: MagneticColors.textMuted),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        foregroundColor: MagneticColors.textPrimary,
        titleTextStyle: TextStyle(
          color: MagneticColors.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
      ),
      cardTheme: CardThemeData(
        color: MagneticColors.glassFill,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: MagneticColors.glassBorder),
        ),
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      ),
      dividerTheme: const DividerThemeData(
        color: MagneticColors.glassBorder,
        space: 20,
        thickness: 1,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: MagneticColors.glassFill,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: MagneticColors.glassBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: MagneticColors.glassBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: MagneticColors.cyan, width: 1.5),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        labelStyle: const TextStyle(color: MagneticColors.textSecondary),
        hintStyle: const TextStyle(color: MagneticColors.textMuted),
        prefixIconColor: MagneticColors.textMuted,
        suffixIconColor: MagneticColors.textMuted,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: MagneticColors.cyan,
          foregroundColor: MagneticColors.void_,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: MagneticColors.textPrimary,
          side: const BorderSide(color: MagneticColors.glassBorderStrong),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: MagneticColors.cyan),
      ),
      iconTheme: const IconThemeData(color: MagneticColors.textSecondary),
      listTileTheme: const ListTileThemeData(
        iconColor: MagneticColors.textSecondary,
        textColor: MagneticColors.textPrimary,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: MagneticColors.glassFill,
        side: const BorderSide(color: MagneticColors.glassBorder),
        labelStyle:
            const TextStyle(color: MagneticColors.textPrimary, fontSize: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: MagneticColors.voidElevated,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: MagneticColors.glassBorder),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: MagneticColors.voidElevated,
        contentTextStyle: const TextStyle(color: MagneticColors.textPrimary),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: MagneticColors.glassBorder),
        ),
        behavior: SnackBarBehavior.floating,
      ),
      popupMenuTheme: PopupMenuThemeData(
        color: MagneticColors.voidElevated,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: MagneticColors.glassBorder),
        ),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? MagneticColors.cyan
              : MagneticColors.textMuted,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? MagneticColors.cyan.withValues(alpha: 0.3)
              : MagneticColors.glassFill,
        ),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: ButtonStyle(
          backgroundColor: WidgetStateProperty.resolveWith(
            (states) => states.contains(WidgetState.selected)
                ? MagneticColors.cyan.withValues(alpha: 0.18)
                : MagneticColors.glassFill,
          ),
          foregroundColor: WidgetStateProperty.resolveWith(
            (states) => states.contains(WidgetState.selected)
                ? MagneticColors.cyan
                : MagneticColors.textSecondary,
          ),
          side: WidgetStateProperty.all(
            const BorderSide(color: MagneticColors.glassBorder),
          ),
        ),
      ),
    );
  }
}
