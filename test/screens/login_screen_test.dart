import 'package:family_tree/screens/login_screen.dart';
import 'package:family_tree/theme/magnetic_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('admin login uses a pre-approved Google account', (tester) async {
    await tester.pumpWidget(MaterialApp(
      theme: MagneticTheme.build(),
      home: const LoginScreen(),
    ));

    expect(find.text('Private Family Tree'), findsOneWidget);
    expect(find.textContaining('pre-approved administrator'), findsOneWidget);
    expect(find.text('Sign in with Google'), findsOneWidget);
    expect(find.textContaining('stored privately in Firebase'), findsOneWidget);
    expect(find.byType(CheckboxListTile), findsNothing);
  });
}
