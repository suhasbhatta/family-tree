import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../config/firebase_config.dart';
import '../models/admin_session.dart';

class AuthService extends ChangeNotifier {
  static AuthService? _instance;
  AuthService._();
  static AuthService get instance => _instance ??= AuthService._();

  FirebaseAuth? _auth;
  FirebaseFirestore? _db;
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
  String? get displayName => _auth?.currentUser?.displayName;
  String? get maskedEmail {
    final email = _auth?.currentUser?.email;
    if (email == null) return null;
    final separator = email.indexOf('@');
    if (separator <= 1) return email;
    return '${email.substring(0, 1)}•••${email.substring(separator)}';
  }

  Future<void> initialize() async {
    if (_initialized || !configured) {
      _initialized = true;
      return;
    }
    _auth = FirebaseAuth.instance;
    _db = FirebaseFirestore.instance;
    // Keep the Firebase session only for the current browser tab/session so a
    // shared computer does not retain administrator access indefinitely.
    if (kIsWeb) await _auth!.setPersistence(Persistence.SESSION);
    if (_auth!.currentUser != null) {
      try {
        await _authorizeCurrentUser();
      } catch (_) {
        await _signOutUnauthorizedUser();
      }
    }
    _initialized = true;
    notifyListeners();
  }

  Future<void> signInWithGoogle() async {
    if (!kIsWeb || _auth == null || _db == null) {
      throw const AuthFlowException(
          'Google sign-in is configured for the web application.');
    }
    _setBusy(true);
    try {
      final provider = GoogleAuthProvider()
        ..setCustomParameters(const {'prompt': 'select_account'});
      await _auth!.signInWithPopup(provider);
      await _authorizeCurrentUser();
    } on FirebaseAuthException catch (error) {
      await _signOutUnauthorizedUser();
      if (error.code == 'popup-closed-by-user' ||
          error.code == 'cancelled-popup-request') {
        throw const AuthFlowException('Google sign-in was cancelled.');
      }
      throw const AuthFlowException(
          'Unable to sign in. Please try again later.');
    } on FirebaseException {
      await _signOutUnauthorizedUser();
      throw const AuthFlowException(
          'This Google account is not authorized for this family tree.');
    } on AuthFlowException {
      await _signOutUnauthorizedUser();
      rethrow;
    } finally {
      _setBusy(false);
    }
  }

  Future<void> _authorizeCurrentUser() async {
    final user = _auth?.currentUser;
    if (user == null || !user.emailVerified) {
      throw const AuthFlowException('Access is not active.');
    }
    final providerIds = user.providerData.map((item) => item.providerId);
    if (!providerIds.contains(GoogleAuthProvider.PROVIDER_ID)) {
      throw const AuthFlowException('Access is not active.');
    }
    final snapshot = await _db!.collection('adminAccess').doc(user.uid).get();
    if (!snapshot.exists) {
      throw const AuthFlowException('Access is not active.');
    }
    final session = AdminSession.fromMap(user.uid, snapshot.data()!);
    if (!session.isActive || session.treeId != FirebaseConfig.treeId) {
      throw const AuthFlowException('Access is not active.');
    }
    _adminSession = session;
    notifyListeners();
  }

  Future<void> _signOutUnauthorizedUser() async {
    _adminSession = null;
    await _auth?.signOut();
  }

  Future<void> logout() async {
    await _auth?.signOut();
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
