import 'dart:ui';
import 'package:flutter/material.dart';
import 'magnetic_colors.dart';

/// A frosted glass panel: blurred, semi-transparent, hairline border.
class GlassPanel extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final BorderRadius borderRadius;
  final Color? glowColor;
  final Color borderColor;
  final double blurSigma;

  const GlassPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
    this.borderRadius = const BorderRadius.all(Radius.circular(18)),
    this.glowColor,
    this.borderColor = MagneticColors.glassBorder,
    this.blurSigma = 18,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        boxShadow: glowColor != null
            ? [
                BoxShadow(
                  color: glowColor!.withValues(alpha: 0.35),
                  blurRadius: 24,
                  spreadRadius: -4,
                ),
              ]
            : null,
      ),
      child: ClipRRect(
        borderRadius: borderRadius,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blurSigma, sigmaY: blurSigma),
          child: Container(
            padding: padding,
            decoration: BoxDecoration(
              color: MagneticColors.glassFill,
              borderRadius: borderRadius,
              border: Border.all(color: borderColor),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}

/// Deep-space gradient backdrop shared by every screen.
class MagneticBackground extends StatelessWidget {
  const MagneticBackground({super.key});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0, -0.6),
            radius: 1.2,
            colors: [
              Color(0xFF102229),
              MagneticColors.void_,
            ],
            stops: [0.0, 0.7],
          ),
        ),
        child: DecoratedBox(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment(0.9, 0.9),
              radius: 1.0,
              colors: [
                Color(0x1AE879F9),
                Colors.transparent,
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Small rounded pill used for status/role tags (e.g. "ALIVE", "You", "root").
class GlowBadge extends StatelessWidget {
  final String text;
  final Color color;
  final IconData? icon;

  const GlowBadge(
      {super.key, required this.text, required this.color, this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 11, color: color),
            const SizedBox(width: 4),
          ],
          Text(
            text,
            style: TextStyle(
              color: color,
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}

/// Circular gender avatar with a neon-tinted glow ring.
class GenderAvatar extends StatelessWidget {
  final bool isMale;
  final double radius;
  final IconData? overrideIcon;

  const GenderAvatar({
    super.key,
    required this.isMale,
    this.radius = 20,
    this.overrideIcon,
  });

  @override
  Widget build(BuildContext context) {
    final color = MagneticColors.genderColor(isMale);
    return Container(
      width: radius * 2,
      height: radius * 2,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color.withValues(alpha: 0.14),
        border: Border.all(color: color.withValues(alpha: 0.5)),
        boxShadow: [
          BoxShadow(
              color: color.withValues(alpha: 0.3),
              blurRadius: 12,
              spreadRadius: -2),
        ],
      ),
      child: Icon(
        overrideIcon ?? (isMale ? Icons.male : Icons.female),
        color: color,
        size: radius,
      ),
    );
  }
}
