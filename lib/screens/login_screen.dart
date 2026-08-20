import 'dart:async';

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
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  String _dialCode = '+91';
  bool _codeSent = false;
  bool _consented = false;
  String? _error;
  int _resendSeconds = 0;
  Timer? _timer;

  static const _dialCodes = <String, String>{
    '+91': 'India (+91)',
    '+1': 'US / Canada (+1)',
    '+44': 'United Kingdom (+44)',
    '+61': 'Australia (+61)',
  };

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  String? _phoneE164() {
    final digits = _phoneController.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length < 7 || digits.length > 14) return null;
    return '$_dialCode$digits';
  }

  Future<void> _sendCode() async {
    final phone = _phoneE164();
    if (phone == null || !_consented) {
      setState(() => _error = !_consented
          ? 'Please accept the phone verification notice.'
          : 'Enter a valid mobile number.');
      return;
    }
    setState(() => _error = null);
    try {
      await AuthService.instance.sendOtp(phone);
      if (!mounted) return;
      setState(() {
        _codeSent = true;
        _resendSeconds = 60;
      });
      _timer?.cancel();
      _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (!mounted || _resendSeconds <= 1) {
          timer.cancel();
          if (mounted) setState(() => _resendSeconds = 0);
        } else {
          setState(() => _resendSeconds--);
        }
      });
    } on AuthFlowException catch (error) {
      if (mounted) setState(() => _error = error.message);
    }
  }

  Future<void> _verifyCode() async {
    final code = _codeController.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      setState(() => _error = 'Enter the 6-digit verification code.');
      return;
    }
    setState(() => _error = null);
    try {
      await AuthService.instance.confirmOtp(code);
    } on AuthFlowException catch (error) {
      if (mounted) setState(() => _error = error.message);
    }
  }

  @override
  Widget build(BuildContext context) {
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
                  const Text('Private Family Tree',
                      textAlign: TextAlign.center,
                      style:
                          TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 8),
                  Text(
                    _codeSent
                        ? 'Enter the SMS code sent to the administrator number.'
                        : 'Sign in with the registered administrator mobile number.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: MagneticColors.textSecondary),
                  ),
                  const SizedBox(height: 24),
                  if (!_codeSent) ...[
                    DropdownButtonFormField<String>(
                      initialValue: _dialCode,
                      decoration:
                          const InputDecoration(labelText: 'Country / region'),
                      items: _dialCodes.entries
                          .map((entry) => DropdownMenuItem(
                              value: entry.key, child: Text(entry.value)))
                          .toList(),
                      onChanged: busy
                          ? null
                          : (value) =>
                              setState(() => _dialCode = value ?? '+91'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _phoneController,
                      enabled: !busy,
                      keyboardType: TextInputType.phone,
                      autofillHints: const [AutofillHints.telephoneNumber],
                      decoration: const InputDecoration(
                        labelText: 'Mobile number',
                        prefixIcon: Icon(Icons.phone_outlined),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Material(
                      color: Colors.transparent,
                      child: CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        value: _consented,
                        onChanged: busy
                            ? null
                            : (value) =>
                                setState(() => _consented = value ?? false),
                        controlAffinity: ListTileControlAffinity.leading,
                        title: const Text(
                          'I understand that my phone number is sent to and '
                          'processed by Google/Firebase for verification and '
                          'abuse prevention.',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ),
                    FilledButton.icon(
                      onPressed: busy ? null : _sendCode,
                      icon: const Icon(Icons.sms_outlined),
                      label: const Text('Send verification code'),
                    ),
                  ] else ...[
                    TextField(
                      controller: _codeController,
                      enabled: !busy,
                      keyboardType: TextInputType.number,
                      autofillHints: const [AutofillHints.oneTimeCode],
                      maxLength: 6,
                      decoration: const InputDecoration(
                        labelText: '6-digit code',
                        prefixIcon: Icon(Icons.password_outlined),
                      ),
                      onSubmitted: (_) => _verifyCode(),
                    ),
                    FilledButton.icon(
                      onPressed: busy ? null : _verifyCode,
                      icon: const Icon(Icons.verified_user_outlined),
                      label: const Text('Verify and sign in'),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: busy || _resendSeconds > 0 ? null : _sendCode,
                      child: Text(_resendSeconds > 0
                          ? 'Resend in $_resendSeconds seconds'
                          : 'Resend code'),
                    ),
                    TextButton(
                      onPressed: busy
                          ? null
                          : () => setState(() {
                                _codeSent = false;
                                _codeController.clear();
                                _error = null;
                              }),
                      child: const Text('Use another number'),
                    ),
                  ],
                  if (busy) ...[
                    const SizedBox(height: 16),
                    const LinearProgressIndicator(),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Text(_error!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: MagneticColors.rose)),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
