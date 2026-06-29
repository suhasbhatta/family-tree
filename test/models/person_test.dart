import 'package:flutter_test/flutter_test.dart';
import 'package:family_tree/models/person.dart';

void main() {
  group('Person', () {
    test('creates with required fields', () {
      final p = Person(id: 'p1', name: 'Alice', gender: Gender.female);
      expect(p.name, 'Alice');
      expect(p.gender, Gender.female);
      expect(p.isAlive, true);
      expect(p.dateOfDeath, null);
    });

    test('serializes and deserializes via JSON', () {
      final p = Person(
        id: 'p1',
        name: 'Bob',
        gender: Gender.male,
        dateOfBirth: DateTime(1990, 5, 15),
        isAlive: true,
        contactNumber: '9999999999',
        currentPlaceOfResidence: 'Mumbai',
      );
      final json = p.toJson();
      final p2 = Person.fromJson(json);
      expect(p2.name, 'Bob');
      expect(p2.gender, Gender.male);
      expect(p2.dateOfBirth?.year, 1990);
      expect(p2.contactNumber, '9999999999');
    });

    test('isAlive false when dateOfDeath is set', () {
      final p = Person(
        id: 'p1',
        name: 'Charlie',
        gender: Gender.male,
        dateOfDeath: DateTime(2020),
        isAlive: false,
      );
      expect(p.isAlive, false);
      expect(p.dateOfDeath?.year, 2020);
    });

    test('copyWith works correctly', () {
      final p = Person(id: 'p1', name: 'Dave', gender: Gender.male);
      final p2 = p.copyWith(name: 'David', gender: Gender.male);
      expect(p2.name, 'David');
      expect(p2.id, 'p1');
    });

    test('genderFromString handles all values', () {
      expect(genderFromString('male'), Gender.male);
      expect(genderFromString('female'), Gender.female);
      expect(genderFromString('other'), Gender.other);
      expect(genderFromString('unknown'), Gender.unknown);
      expect(genderFromString('MALE'), Gender.male);
      expect(genderFromString('invalid'), Gender.unknown);
    });
  });
}
