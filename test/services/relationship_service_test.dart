import 'package:flutter_test/flutter_test.dart';
import 'package:family_tree/models/family_tree_data.dart';
import 'package:family_tree/models/person.dart';
import 'package:family_tree/models/family_unit.dart';
import 'package:family_tree/services/relationship_service.dart';

FamilyTreeData _buildSampleTree() {
  final data = FamilyTreeData.empty();

  final grandfather = Person(id: 'gf', name: 'Ramesh', gender: Gender.male);
  final grandmother = Person(id: 'gm', name: 'Sita', gender: Gender.female);
  final father = Person(id: 'f', name: 'Suresh', gender: Gender.male);
  final mother = Person(id: 'm', name: 'Priya', gender: Gender.female);
  final child = Person(id: 'c', name: 'Amit', gender: Gender.male);
  final uncle = Person(id: 'u', name: 'Vijay', gender: Gender.male);
  final wife2 = Person(id: 'w2', name: 'Meera', gender: Gender.female);

  data.addOrUpdatePerson(grandfather);
  data.addOrUpdatePerson(grandmother);
  data.addOrUpdatePerson(father);
  data.addOrUpdatePerson(mother);
  data.addOrUpdatePerson(child);
  data.addOrUpdatePerson(uncle);
  data.addOrUpdatePerson(wife2);

  // Grandparents' family
  data.addOrUpdateFamilyUnit(FamilyUnit(
    id: 'fu1',
    husbandId: 'gf',
    wifeId: 'gm',
    childrenIds: ['f', 'u'],
  ));

  // Parents' family
  data.addOrUpdateFamilyUnit(FamilyUnit(
    id: 'fu2',
    husbandId: 'f',
    wifeId: 'm',
    childrenIds: ['c'],
  ));

  // Father's second family (multiple wives test)
  data.addOrUpdateFamilyUnit(FamilyUnit(
    id: 'fu3',
    husbandId: 'f',
    wifeId: 'w2',
    childrenIds: [],
  ));

  return data;
}

void main() {
  group('RelationshipService', () {
    late RelationshipService service;
    late FamilyTreeData data;

    setUp(() {
      data = _buildSampleTree();
      service = RelationshipService(data);
    });

    test('finds direct spouse relationship', () {
      final rels = service.findRelationships('f', 'm');
      expect(rels.any((r) => r.contains('wife') || r.contains('husband')), true);
    });

    test('finds parent-child relationship', () {
      final rels = service.findRelationships('f', 'c');
      expect(rels.any((r) => r.contains('son') || r.contains('father')), true);
    });

    test('finds grandparent relationship', () {
      final rels = service.findRelationships('gf', 'c');
      expect(
          rels.any((r) =>
              r.contains('grandfather') || r.contains('grandchild')),
          true);
    });

    test('finds sibling relationship', () {
      final rels = service.findRelationships('f', 'u');
      expect(rels.any((r) => r.contains('brother') || r.contains('sibling')), true);
    });

    test('multiple wives - husband appears in multiple family units', () {
      final spouses = service.getSpouseIds('f');
      expect(spouses.length, 2);
      expect(spouses, containsAll(['m', 'w2']));
    });

    test('same person as child and husband', () {
      // Suresh is child in fu1 and husband in fu2/fu3
      final fus = service.getFamilyUnitsForPerson('f');
      expect(fus.length, 3); // fu1 (as child), fu2 (as husband), fu3 (as husband)
    });

    test('uncle relationship via path', () {
      final rels = service.findRelationships('u', 'c');
      // u is sibling of f, f is parent of c → u is uncle of c
      expect(rels.isNotEmpty, true);
    });

    test('getChildIds returns correct children', () {
      final children = service.getChildIds('f');
      expect(children, contains('c'));
    });

    test('getParentIds returns both parents', () {
      final parents = service.getParentIds('c');
      expect(parents, containsAll(['f', 'm']));
    });

    test('getSiblingIds returns father and uncle as siblings', () {
      final sibs = service.getSiblingIds('f');
      expect(sibs, contains('u'));
    });

    test('same person returns Same person label', () {
      final rels = service.findRelationships('f', 'f');
      expect(rels.first, 'Same person');
    });
  });
}
