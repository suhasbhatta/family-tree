import 'package:family_tree/screens/login_screen.dart';
import 'package:family_tree/theme/magnetic_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('admin phone login explains privacy consent', (tester) async {
    await tester.pumpWidget(MaterialApp(
      theme: MagneticTheme.build(),
      home: const LoginScreen(),
    ));

    expect(find.text('Private Family Tree'), findsOneWidget);
    expect(find.textContaining('registered administrator'), findsOneWidget);
    expect(find.textContaining('processed by Google/Firebase'), findsOneWidget);
    expect(find.text('Send verification code'), findsOneWidget);
    expect(find.byType(CheckboxListTile), findsOneWidget);
  });
}
