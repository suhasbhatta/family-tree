import 'package:flutter_test/flutter_test.dart';
import 'package:family_tree/models/family_tree_data.dart';
import 'package:family_tree/models/person.dart';
import 'package:family_tree/services/duplicate_detection_service.dart';

void main() {
  group('DuplicateDetectionService', () {
    late FamilyTreeData data;

    setUp(() {
      data = FamilyTreeData.empty();
      data.addOrUpdatePerson(Person(
        id: 'p1',
        name: 'Ramesh Kumar',
        gender: Gender.male,
        dateOfBirth: DateTime(1970, 1, 1),
        contactNumber: '9999999999',
      ));
      data.addOrUpdatePerson(Person(
        id: 'p2',
        name: 'Priya Sharma',
        gender: Gender.female,
      ));
    });

    test('finds exact name match', () {
      final candidate = Person(
          id: 'new', name: 'Ramesh Kumar', gender: Gender.male);
      final dupes =
          DuplicateDetectionService.findPotentialDuplicates(data, candidate);
      expect(dupes.isNotEmpty, true);
      expect(dupes.first.id, 'p1');
    });

    test('finds same name + same dob', () {
      final candidate = Person(
        id: 'new',
        name: 'Ramesh Kumar',
        gender: Gender.male,
        dateOfBirth: DateTime(1970, 1, 1),
      );
      final dupes =
          DuplicateDetectionService.findPotentialDuplicates(data, candidate);
      expect(dupes.isNotEmpty, true);
    });

    test('no duplicate for different name', () {
      final candidate = Person(
          id: 'new', name: 'Vikram Singh', gender: Gender.male);
      final dupes =
          DuplicateDetectionService.findPotentialDuplicates(data, candidate);
      expect(dupes, isEmpty);
    });

    test('excludeId skips that person', () {
      final candidate = Person(
          id: 'p1', name: 'Ramesh Kumar', gender: Gender.male);
      final dupes = DuplicateDetectionService.findPotentialDuplicates(
          data, candidate,
          excludeId: 'p1');
      expect(dupes, isEmpty);
    });

    test('finds same contact number', () {
      final candidate = Person(
        id: 'new',
        name: 'Ramesh K',
        gender: Gender.male,
        contactNumber: '9999999999',
      );
      final dupes =
          DuplicateDetectionService.findPotentialDuplicates(data, candidate);
      expect(dupes.isNotEmpty, true);
    });
  });
}
