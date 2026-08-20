import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';

import '../config/firebase_config.dart';
import '../models/family_tree_data.dart';
import '../models/family_unit.dart';
import '../models/person.dart';

class FirebaseTreeService {
  FirebaseTreeService._();
  static final instance = FirebaseTreeService._();

  FirebaseFirestore get _db => FirebaseFirestore.instance;
  FirebaseFunctions get _functions => FirebaseFunctions.instanceFor(
        region: FirebaseConfig.functionsRegion,
      );
  String get _treeId => FirebaseConfig.treeId;
  DocumentReference<Map<String, dynamic>> get _treeRef =>
      _db.collection('trees').doc(_treeId);

  Stream<DocumentSnapshot<Map<String, dynamic>>> watchTreeMetadata() =>
      _treeRef.snapshots();

  Future<FamilyTreeData> loadTree() async {
    final tree = await _treeRef.get();
    if (!tree.exists) return FamilyTreeData.empty();

    final results = await Future.wait([
      _treeRef.collection('people').get(),
      _treeRef.collection('familyUnits').get(),
    ]);
    final peopleSnapshot = results[0];
    final unitsSnapshot = results[1];

    final people = <String, Person>{};
    for (final doc in peopleSnapshot.docs) {
      final map = <String, dynamic>{...doc.data(), 'id': doc.id};
      people[doc.id] = Person.fromJson(map);
    }

    final privateSnapshot = await _treeRef.collection('personPrivate').get();
    for (final doc in privateSnapshot.docs) {
      final person = people[doc.id];
      if (person != null) {
        person.contactNumber = doc.data()['contactNumber'] as String?;
      }
    }

    final units = <String, FamilyUnit>{};
    for (final doc in unitsSnapshot.docs) {
      units[doc.id] = FamilyUnit.fromJson({...doc.data(), 'id': doc.id});
    }
    final metadata = tree.data() ?? const <String, dynamic>{};
    return FamilyTreeData(
      appVersion: metadata['schemaVersion'] as int? ?? 2,
      selectedRootFamilyUnitId: metadata['selectedRootFamilyUnitId'] as String?,
      createdAt: _dateTime(metadata['createdAt']),
      updatedAt: _dateTime(metadata['updatedAt']),
      people: people,
      familyUnits: units,
    );
  }

  Future<Person> addPerson(Person person) async {
    final result = await _call('savePerson', {
      'person': _personPayload(person, includeId: false),
    });
    return person.copyWith(
      id: result['id'] as String,
      version: result['version'] as int? ?? 1,
    );
  }

  Future<void> updatePerson(Person person) async {
    await _call('savePerson', {
      'person': _personPayload(person, includeId: true),
    });
  }

  Future<void> deletePerson(String personId) =>
      _call('deletePerson', {'personId': personId});

  Future<FamilyUnit> addFamilyUnit(FamilyUnit unit) async {
    final result = await _call('saveFamilyUnit', {
      'familyUnit': _familyPayload(unit, includeId: false),
    });
    return unit.copyWith(id: result['id'] as String);
  }

  Future<void> updateFamilyUnit(FamilyUnit unit) => _call(
      'saveFamilyUnit', {'familyUnit': _familyPayload(unit, includeId: true)});

  Future<void> deleteFamilyUnit(String unitId) =>
      _call('deleteFamilyUnit', {'familyUnitId': unitId});

  Future<void> setRootFamilyUnit(String? unitId) =>
      _call('setRootFamilyUnit', {'familyUnitId': unitId});

  Future<void> importTree(FamilyTreeData data, {required bool replace}) =>
      _call('importTree', {
        'mode': replace ? 'replace' : 'merge',
        'tree': data.toJson(),
      });

  Future<Map<String, dynamic>> _call(
      String name, Map<String, dynamic> data) async {
    final result = await _functions.httpsCallable(name).call(data);
    if (result.data is Map) {
      return Map<String, dynamic>.from(result.data as Map);
    }
    return const {};
  }

  Map<String, dynamic> _personPayload(Person person,
      {required bool includeId}) {
    return {
      if (includeId) 'id': person.id,
      ..._editablePersonPayload(person),
      'version': person.version,
    };
  }

  Map<String, dynamic> _editablePersonPayload(Person person) => {
        'name': person.name,
        'gender': genderToString(person.gender),
        'dateOfBirth': _date(person.dateOfBirth),
        'dateOfDeath': _date(person.dateOfDeath),
        'isAlive': person.isAlive,
        'contactNumber': person.contactNumber,
        'currentPlaceOfResidence': person.currentPlaceOfResidence,
      };

  Map<String, dynamic> _familyPayload(FamilyUnit unit,
          {required bool includeId}) =>
      {
        if (includeId) 'id': unit.id,
        'husbandId': unit.husbandId,
        'wifeId': unit.wifeId,
        'anniversaryDate': _date(unit.anniversaryDate),
        'childrenIds': unit.childrenIds,
      };

  String? _date(DateTime? value) => value?.toIso8601String().split('T').first;

  DateTime _dateTime(dynamic value) {
    if (value is Timestamp) return value.toDate();
    if (value is String) return DateTime.tryParse(value) ?? DateTime.now();
    return DateTime.now();
  }
}
