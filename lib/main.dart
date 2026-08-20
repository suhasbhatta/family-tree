import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';

import 'config/firebase_config.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'theme/magnetic_colors.dart';
import 'theme/magnetic_scaffold.dart';
import 'theme/magnetic_theme.dart';
import 'utils/app_state.dart';
import 'utils/auth_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (FirebaseConfig.isConfigured) {
    await Firebase.initializeApp(options: FirebaseConfig.options);
    FirebaseFirestore.instance.settings =
        const Settings(persistenceEnabled: false);
    if (FirebaseConfig.useEmulators) {
      await FirebaseAuth.instance.useAuthEmulator('localhost', 9099);
      FirebaseFirestore.instance.useFirestoreEmulator('localhost', 8080);
      FirebaseFunctions.instanceFor(region: FirebaseConfig.functionsRegion)
          .useFunctionsEmulator('localhost', 5001);
    }
  }
  await AuthService.instance.initialize();
  runApp(const FamilyTreeApp());
}

class FamilyTreeApp extends StatelessWidget {
  const FamilyTreeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Private Family Tree',
      debugShowCheckedModeBanner: false,
      theme: MagneticTheme.build(),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  String? _connectedUid;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: AuthService.instance,
      builder: (context, _) {
        final auth = AuthService.instance;
        if (!auth.configured) return const _ConfigurationScreen();
        if (!auth.initialized || auth.busy) {
          return const MagneticScaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (!auth.isAuthenticated) {
          _connectedUid = null;
          AppState.instance.disconnect();
          return const LoginScreen();
        }
        if (_connectedUid != auth.uid) {
          _connectedUid = auth.uid;
          AppState.instance.connect();
        }
        return const HomeScreen();
      },
    );
  }
}

class _ConfigurationScreen extends StatelessWidget {
  const _ConfigurationScreen();

  @override
  Widget build(BuildContext context) {
    return MagneticScaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: const Padding(
            padding: EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.cloud_off_outlined,
                    size: 64, color: MagneticColors.amber),
                SizedBox(height: 20),
                Text('Firebase configuration required',
                    textAlign: TextAlign.center,
                    style:
                        TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
                SizedBox(height: 12),
                Text(
                  'Build this app with the FIREBASE_* dart-defines documented '
                  'in README.md. No family data is stored locally when the '
                  'shared backend is unavailable.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: MagneticColors.textSecondary),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
