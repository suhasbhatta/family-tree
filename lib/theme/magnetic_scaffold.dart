import 'package:flutter/material.dart';
import 'glass.dart';

/// Scaffold wrapper that lays the deep-space Magnetic background behind
/// the body, so every screen shares the same backdrop.
class MagneticScaffold extends StatelessWidget {
  final PreferredSizeWidget? appBar;
  final Widget body;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;

  const MagneticScaffold({
    super.key,
    this.appBar,
    required this.body,
    this.floatingActionButton,
    this.bottomNavigationBar,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: appBar,
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: bottomNavigationBar,
      body: Stack(
        children: [
          const Positioned.fill(child: MagneticBackground()),
          Positioned.fill(child: body),
        ],
      ),
    );
  }
}
