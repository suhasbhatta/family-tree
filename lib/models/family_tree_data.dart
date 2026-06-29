import 'person.dart';
import 'family_unit.dart';

class FamilyTreeData {
  final int appVersion;
  String? selectedRootFamilyUnitId;
  final DateTime createdAt;
  DateTime updatedAt;
  final Map<String, Person> people;
  final Map<String, FamilyUnit> familyUnits;

  FamilyTreeData({
    this.appVersion = 1,
    this.selectedRootFamilyUnitId,
    DateTime? createdAt,
    DateTime? updatedAt,
    Map<String, Person>? people,
    Map<String, FamilyUnit>? familyUnits,
  })  : createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now(),
        people = people ?? {},
        familyUnits = familyUnits ?? {};

  factory FamilyTreeData.empty() => FamilyTreeData();

  factory FamilyTreeData.fromJson(Map<String, dynamic> json) {
    final peopleMap = <String, Person>{};
    if (json['people'] is List) {
      for (final p in json['people'] as List) {
        final person = Person.fromJson(p as Map<String, dynamic>);
        peopleMap[person.id] = person;
      }
    }

    final unitsMap = <String, FamilyUnit>{};
    if (json['familyUnits'] is List) {
      for (final f in json['familyUnits'] as List) {
        final unit = FamilyUnit.fromJson(f as Map<String, dynamic>);
        unitsMap[unit.id] = unit;
      }
    }

    return FamilyTreeData(
      appVersion: json['appVersion'] as int? ?? 1,
      selectedRootFamilyUnitId: json['selectedRootFamilyUnitId'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      people: peopleMap,
      familyUnits: unitsMap,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'appVersion': appVersion,
      'selectedRootFamilyUnitId': selectedRootFamilyUnitId,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'people': people.values.map((p) => p.toJson()).toList(),
      'familyUnits': familyUnits.values.map((f) => f.toJson()).toList(),
    };
  }

  void touch() => updatedAt = DateTime.now();

  List<Person> get peopleList => people.values.toList()
    ..sort((a, b) => a.name.compareTo(b.name));

  List<FamilyUnit> get familyUnitList => familyUnits.values.toList();

  Person? findPerson(String id) => people[id];
  FamilyUnit? findFamilyUnit(String id) => familyUnits[id];

  void addOrUpdatePerson(Person p) {
    people[p.id] = p;
    touch();
  }

  void addOrUpdateFamilyUnit(FamilyUnit f) {
    familyUnits[f.id] = f;
    touch();
  }

  bool removePerson(String id) {
    if (!people.containsKey(id)) return false;
    people.remove(id);
    // Clean up references in family units
    for (final unit in familyUnits.values) {
      if (unit.husbandId == id) unit.husbandId = null;
      if (unit.wifeId == id) unit.wifeId = null;
      unit.childrenIds.remove(id);
    }
    touch();
    return true;
  }

  bool removeFamilyUnit(String id) {
    if (!familyUnits.containsKey(id)) return false;
    familyUnits.remove(id);
    if (selectedRootFamilyUnitId == id) selectedRootFamilyUnitId = null;
    touch();
    return true;
  }
}
