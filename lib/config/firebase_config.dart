import 'package:firebase_core/firebase_core.dart';

/// Public Firebase web identifiers are injected at build time. Keeping them
/// outside source control prevents accidental project coupling and makes local,
/// staging, and production builds explicit.
abstract final class FirebaseConfig {
  static const apiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const appId = String.fromEnvironment('FIREBASE_APP_ID');
  static const messagingSenderId =
      String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
  static const projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
  static const authDomain = String.fromEnvironment('FIREBASE_AUTH_DOMAIN');
  static const treeId =
      String.fromEnvironment('FAMILY_TREE_ID', defaultValue: 'primary');
  static const functionsRegion = String.fromEnvironment(
    'FIREBASE_FUNCTIONS_REGION',
    defaultValue: 'asia-south1',
  );
  static const useEmulators =
      bool.fromEnvironment('USE_FIREBASE_EMULATORS', defaultValue: false);

  static bool get isConfigured =>
      apiKey.isNotEmpty &&
      appId.isNotEmpty &&
      messagingSenderId.isNotEmpty &&
      projectId.isNotEmpty &&
      authDomain.isNotEmpty;

  static FirebaseOptions get options {
    if (!isConfigured) {
      throw StateError('Firebase build configuration is incomplete.');
    }
    return const FirebaseOptions(
      apiKey: apiKey,
      appId: appId,
      messagingSenderId: messagingSenderId,
      projectId: projectId,
      authDomain: authDomain,
    );
  }
}
