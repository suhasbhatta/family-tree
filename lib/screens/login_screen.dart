import 'package:flutter/material.dart';

import '../theme/glass.dart';
import '../theme/magnetic_colors.dart';
import '../theme/magnetic_scaffold.dart';
import '../utils/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String? _error;

  Future<void> _signIn() async {
    setState(() => _error = null);
    try {
      await AuthService.instance.signInWithGoogle();
    } on AuthFlowException catch (error) {
      if (mounted) setState(() => _error = error.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: AuthService.instance,
      builder: (context, _) {
        final busy = AuthService.instance.busy;
        return MagneticScaffold(
          body: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: GlassPanel(
                  padding: const EdgeInsets.all(28),
                  glowColor: MagneticColors.cyan,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Icon(Icons.hub_outlined,
                          size: 52, color: MagneticColors.cyan),
                      const SizedBox(height: 16),
                      const Text(
                        'Private Family Tree',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 24, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Sign in with a pre-approved administrator Google account.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: MagneticColors.textSecondary),
                      ),
                      const SizedBox(height: 24),
                      FilledButton.icon(
                        onPressed: busy ? null : _signIn,
                        icon: const Icon(Icons.login),
                        label: const Text('Sign in with Google'),
                      ),
                      if (busy) ...[
                        const SizedBox(height: 16),
                        const LinearProgressIndicator(),
                      ],
                      if (_error != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: MagneticColors.rose),
                        ),
                      ],
                      const SizedBox(height: 20),
                      const Text(
                        'Google provides authentication. Family information is '
                        'stored privately in Firebase and is available only to '
                        'approved administrator accounts.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            color: MagneticColors.textMuted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
