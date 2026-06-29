import 'package:flutter_test/flutter_test.dart';
import 'package:family_tree/models/family_unit.dart';

void main() {
  group('FamilyUnit', () {
    test('creates with optional fields', () {
      final fu = FamilyUnit(id: 'f1', husbandId: 'p1', wifeId: 'p2');
      expect(fu.husbandId, 'p1');
      expect(fu.wifeId, 'p2');
      expect(fu.childrenIds, isEmpty);
      expect(fu.anniversaryDate, null);
    });

    test('allows missing husband', () {
      final fu = FamilyUnit(id: 'f1', wifeId: 'p2');
      expect(fu.husbandId, null);
      expect(fu.wifeId, 'p2');
    });

    test('allows missing wife', () {
      final fu = FamilyUnit(id: 'f1', husbandId: 'p1');
      expect(fu.husbandId, 'p1');
      expect(fu.wifeId, null);
    });

    test('serializes and deserializes', () {
      final fu = FamilyUnit(
        id: 'f1',
        husbandId: 'p1',
        wifeId: 'p2',
        anniversaryDate: DateTime(2000, 2, 14),
        childrenIds: ['p3', 'p4'],
      );
      final json = fu.toJson();
      final fu2 = FamilyUnit.fromJson(json);
      expect(fu2.id, 'f1');
      expect(fu2.husbandId, 'p1');
      expect(fu2.childrenIds, ['p3', 'p4']);
      expect(fu2.anniversaryDate?.year, 2000);
    });

    test('allMemberIds includes all non-null members', () {
      final fu = FamilyUnit(
          id: 'f1',
          husbandId: 'p1',
          wifeId: 'p2',
          childrenIds: ['p3', 'p4']);
      expect(fu.allMemberIds, containsAll(['p1', 'p2', 'p3', 'p4']));
    });

    test('husband can appear in multiple family units', () {
      final fu1 = FamilyUnit(id: 'f1', husbandId: 'h1', wifeId: 'w1');
      final fu2 = FamilyUnit(id: 'f2', husbandId: 'h1', wifeId: 'w2');
      expect(fu1.husbandId, fu2.husbandId);
    });
  });
}
