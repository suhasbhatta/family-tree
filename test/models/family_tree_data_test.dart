import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:family_tree/models/family_tree_data.dart';
import 'package:family_tree/models/person.dart';
import 'package:family_tree/models/family_unit.dart';

void main() {
  group('FamilyTreeData', () {
    test('empty tree has no people or units', () {
      final data = FamilyTreeData.empty();
      expect(data.people, isEmpty);
      expect(data.familyUnits, isEmpty);
    });

    test('add and find person', () {
      final data = FamilyTreeData.empty();
      final p = Person(id: 'p1', name: 'Alice', gender: Gender.female);
      data.addOrUpdatePerson(p);
      expect(data.findPerson('p1')?.name, 'Alice');
    });

    test('remove person cleans up family unit references', () {
      final data = FamilyTreeData.empty();
      data.addOrUpdatePerson(
          Person(id: 'p1', name: 'Alice', gender: Gender.female));
      data.addOrUpdatePerson(
          Person(id: 'p2', name: 'Bob', gender: Gender.male));
      data.addOrUpdateFamilyUnit(FamilyUnit(
          id: 'f1', husbandId: 'p2', wifeId: 'p1', childrenIds: []));

      data.removePerson('p1');
      expect(data.people.containsKey('p1'), false);
      expect(data.familyUnits['f1']?.wifeId, null);
    });

    test('serializes full tree to JSON and back', () {
      final data = FamilyTreeData.empty();
      data.addOrUpdatePerson(
          Person(id: 'p1', name: 'Alice', gender: Gender.female));
      data.addOrUpdateFamilyUnit(
          FamilyUnit(id: 'f1', wifeId: 'p1', childrenIds: []));

      final json = jsonEncode(data.toJson());
      final data2 = FamilyTreeData.fromJson(jsonDecode(json));
      expect(data2.people['p1']?.name, 'Alice');
      expect(data2.familyUnits['f1']?.wifeId, 'p1');
    });

    test('handles import of older appVersion gracefully', () {
      final oldJson = {
        'appVersion': 0,
        'people': [
          {'id': 'p1', 'name': 'Old Person', 'gender': 'male', 'isAlive': true}
        ],
        'familyUnits': [],
      };
      final data = FamilyTreeData.fromJson(oldJson);
      expect(data.people['p1']?.name, 'Old Person');
    });

    test('peopleList returns sorted by name', () {
      final data = FamilyTreeData.empty();
      data.addOrUpdatePerson(
          Person(id: 'p2', name: 'Zara', gender: Gender.female));
      data.addOrUpdatePerson(
          Person(id: 'p1', name: 'Alice', gender: Gender.female));
      final list = data.peopleList;
      expect(list.first.name, 'Alice');
      expect(list.last.name, 'Zara');
    });
  });
}
