import 'package:flutter/material.dart';

/// Palette for the "Magnetic" dark theme — deep space canvas with
/// neon accents (cyan = paternal/male, magenta = maternal/female,
/// emerald = direct lineage/alive, amber = caution/deceased).
class MagneticColors {
  MagneticColors._();

  static const void_ = Color(0xFF09090B);
  static const voidSoft = Color(0xFF121216);
  static const voidElevated = Color(0xFF17171D);

  static const glassFill = Color(0x0AFFFFFF);
  static const glassBorder = Color(0x17FFFFFF);
  static const glassBorderStrong = Color(0x26FFFFFF);

  static const cyan = Color(0xFF22D3EE);
  static const magenta = Color(0xFFE879F9);
  static const emerald = Color(0xFF34D399);
  static const amber = Color(0xFFFBBF24);
  static const rose = Color(0xFFFB7185);

  static const textPrimary = Color(0xFFE4E4E7);
  static const textSecondary = Color(0xFFA1A1AA);
  static const textMuted = Color(0xFF71717A);

  static Color genderColor(bool isMale) => isMale ? cyan : magenta;
}
