import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../config/firebase_config.dart';
import '../models/admin_session.dart';

class AuthService extends ChangeNotifier {
  static AuthService? _instance;
  AuthService._();
  static AuthService get instance => _instance ??= AuthService._();

  FirebaseAuth? _auth;
  FirebaseFunctions? _functions;
  ConfirmationResult? _confirmation;
  AdminSession? _adminSession;
  bool _busy = false;
  bool _initialized = false;

  bool get configured => FirebaseConfig.isConfigured;
  bool get initialized => _initialized;
  bool get busy => _busy;
  AdminSession? get adminSession => _adminSession;
  bool get isAuthenticated =>
      _auth?.currentUser != null && _adminSession?.isActive == true;
  bool get isAdmin => isAuthenticated;
  String? get uid => _auth?.currentUser?.uid;
  String? get maskedPhone {
    final value = _auth?.currentUser?.phoneNumber;
    if (value == null || value.length < 5) return null;
    return '${value.substring(0, 3)}••••${value.substring(value.length - 2)}';
  }

  Future<void> initialize() async {
    if (_initialized || !configured) {
      _initialized = true;
      return;
    }
    _auth = FirebaseAuth.instance;
    _functions = FirebaseFunctions.instanceFor(
      region: FirebaseConfig.functionsRegion,
    );
    if (kIsWeb) await _auth!.setPersistence(Persistence.LOCAL);
    if (_auth!.currentUser != null) {
      try {
        await _claimAdminAccess();
      } catch (_) {
        await _auth!.signOut();
        _adminSession = null;
      }
    }
    _initialized = true;
    notifyListeners();
  }

  Future<void> sendOtp(String phoneE164) async {
    if (!kIsWeb || _auth == null) {
      throw StateError('Phone login is configured for the web application.');
    }
    _setBusy(true);
    try {
      _confirmation = await _auth!.signInWithPhoneNumber(phoneE164);
    } on FirebaseAuthException {
      throw const AuthFlowException(
          'Unable to send a verification code. Please try again later.');
    } finally {
      _setBusy(false);
    }
  }

  Future<void> confirmOtp(String code) async {
    final confirmation = _confirmation;
    if (confirmation == null) {
      throw const AuthFlowException('Request a new verification code.');
    }
    _setBusy(true);
    try {
      await confirmation.confirm(code);
      await _claimAdminAccess();
      _confirmation = null;
    } on FirebaseAuthException {
      throw const AuthFlowException(
          'The verification code could not be accepted.');
    } on FirebaseFunctionsException {
      await _auth?.signOut();
      _adminSession = null;
      throw const AuthFlowException(
          'This account does not have access to the family tree.');
    } on AuthFlowException {
      await _auth?.signOut();
      _adminSession = null;
      throw const AuthFlowException(
          'This account does not have access to the family tree.');
    } finally {
      _setBusy(false);
    }
  }

  Future<void> _claimAdminAccess() async {
    final result = await _functions!.httpsCallable('claimAdminAccess').call();
    final data = Map<String, dynamic>.from(result.data as Map);
    final user = _auth!.currentUser!;
    final session = AdminSession.fromMap(user.uid, data);
    if (!session.isActive || session.treeId != FirebaseConfig.treeId) {
      throw const AuthFlowException('Access is not active.');
    }
    _adminSession = session;
    notifyListeners();
  }

  Future<void> logout() async {
    await _auth?.signOut();
    _confirmation = null;
    _adminSession = null;
    notifyListeners();
  }

  void _setBusy(bool value) {
    _busy = value;
    notifyListeners();
  }
}

class AuthFlowException implements Exception {
  final String message;
  const AuthFlowException(this.message);

  @override
  String toString() => message;
}
