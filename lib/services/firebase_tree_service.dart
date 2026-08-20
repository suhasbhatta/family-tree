import 'dart:async';
import 'dart:math' as math;

import 'package:cloud_firestore/cloud_firestore.dart';

import '../config/firebase_config.dart';
import '../models/family_tree_data.dart';
import '../models/family_unit.dart';
import '../models/person.dart';
import '../utils/auth_service.dart';

class FirebaseTreeService {
  FirebaseTreeService._();
  static final instance = FirebaseTreeService._();

  FirebaseFirestore get _db => FirebaseFirestore.instance;
  String get _treeId => FirebaseConfig.treeId;
  String get _actorUid {
    final uid = AuthService.instance.uid;
    if (uid == null || !AuthService.instance.isAdmin) {
      throw StateError('Administrator access is required.');
    }
    return uid;
  }

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
      people[doc.id] = Person.fromJson({...doc.data(), 'id': doc.id});
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
    final uid = _actorUid;
    await _ensureTree();
    final personRef = _treeRef.collection('people').doc(person.id);
    final privateRef = _treeRef.collection('personPrivate').doc(person.id);
    await _db.runTransaction((transaction) async {
      final existing = await transaction.get(personRef);
      if (existing.exists) throw StateError('Person already exists.');
      transaction.set(personRef, {
        ..._publicPerson(person, version: 1),
        'createdAt': FieldValue.serverTimestamp(),
      });
      transaction.set(privateRef, _privatePerson(person));
      transaction.set(
          _treeRef,
          {
            'updatedAt': FieldValue.serverTimestamp(),
          },
          SetOptions(merge: true));
      transaction.set(
        _auditRef(),
        _audit(uid, 'person.created', 'person', person.id),
      );
    });
    return person.copyWith(version: 1);
  }

  Future<void> updatePerson(Person person) async {
    final uid = _actorUid;
    await _ensureTree();
    final personRef = _treeRef.collection('people').doc(person.id);
    final privateRef = _treeRef.collection('personPrivate').doc(person.id);
    await _db.runTransaction((transaction) async {
      final existing = await transaction.get(personRef);
      if (!existing.exists) throw StateError('Person not found.');
      final storedVersion = existing.data()?['version'] as int? ?? 0;
      if (storedVersion != person.version) {
        throw StateError(
            'This person was changed by another administrator. Reload and try again.');
      }
      transaction.update(
          personRef, _publicPerson(person, version: storedVersion + 1));
      transaction.set(privateRef, _privatePerson(person));
      transaction.set(
          _treeRef,
          {
            'updatedAt': FieldValue.serverTimestamp(),
          },
          SetOptions(merge: true));
      transaction.set(
        _auditRef(),
        _audit(uid, 'person.updated', 'person', person.id),
      );
    });
  }

  Future<void> deletePerson(String personId) async {
    final uid = _actorUid;
    await _ensureTree();
    final units = await _treeRef.collection('familyUnits').get();
    final batch = _db.batch();
    batch.delete(_treeRef.collection('people').doc(personId));
    batch.delete(_treeRef.collection('personPrivate').doc(personId));
    for (final unit in units.docs) {
      final data = unit.data();
      final previousChildren =
          List<String>.from(data['childrenIds'] as List? ?? const []);
      final children = previousChildren.where((id) => id != personId).toList();
      if (data['husbandId'] == personId ||
          data['wifeId'] == personId ||
          children.length != previousChildren.length) {
        batch.update(unit.reference, {
          'husbandId': data['husbandId'] == personId
              ? null
              : data['husbandId'] as String?,
          'wifeId':
              data['wifeId'] == personId ? null : data['wifeId'] as String?,
          'childrenIds': children,
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }
    }
    batch.set(
        _treeRef,
        {
          'updatedAt': FieldValue.serverTimestamp(),
        },
        SetOptions(merge: true));
    batch.set(_auditRef(), _audit(uid, 'person.deleted', 'person', personId));
    await batch.commit();
  }

  Future<FamilyUnit> addFamilyUnit(FamilyUnit unit) async {
    final uid = _actorUid;
    await _ensureTree();
    await _verifyPeopleExist(unit.allMemberIds);
    final ref = _treeRef.collection('familyUnits').doc(unit.id);
    final existing = await ref.get();
    if (existing.exists) throw StateError('Family unit already exists.');
    final batch = _db.batch();
    batch.set(ref, {
      ..._familyData(unit),
      'createdAt': FieldValue.serverTimestamp(),
    });
    batch.set(
        _treeRef,
        {
          'updatedAt': FieldValue.serverTimestamp(),
        },
        SetOptions(merge: true));
    batch.set(
        _auditRef(), _audit(uid, 'family_unit.created', 'familyUnit', unit.id));
    await batch.commit();
    return unit;
  }

  Future<void> updateFamilyUnit(FamilyUnit unit) async {
    final uid = _actorUid;
    await _ensureTree();
    await _verifyPeopleExist(unit.allMemberIds);
    final ref = _treeRef.collection('familyUnits').doc(unit.id);
    if (!(await ref.get()).exists) throw StateError('Family unit not found.');
    final batch = _db.batch();
    batch.update(ref, _familyData(unit));
    batch.set(
        _treeRef,
        {
          'updatedAt': FieldValue.serverTimestamp(),
        },
        SetOptions(merge: true));
    batch.set(
        _auditRef(), _audit(uid, 'family_unit.updated', 'familyUnit', unit.id));
    await batch.commit();
  }

  Future<void> deleteFamilyUnit(String unitId) async {
    final uid = _actorUid;
    await _ensureTree();
    final ref = _treeRef.collection('familyUnits').doc(unitId);
    if (!(await ref.get()).exists) throw StateError('Family unit not found.');
    final tree = await _treeRef.get();
    final batch = _db.batch();
    batch.delete(ref);
    batch.set(
        _treeRef,
        {
          if (tree.data()?['selectedRootFamilyUnitId'] == unitId)
            'selectedRootFamilyUnitId': null,
          'updatedAt': FieldValue.serverTimestamp(),
        },
        SetOptions(merge: true));
    batch.set(
        _auditRef(), _audit(uid, 'family_unit.deleted', 'familyUnit', unitId));
    await batch.commit();
  }

  Future<void> setRootFamilyUnit(String? unitId) async {
    final uid = _actorUid;
    await _ensureTree();
    if (unitId != null &&
        !(await _treeRef.collection('familyUnits').doc(unitId).get()).exists) {
      throw StateError('Family unit not found.');
    }
    final batch = _db.batch();
    batch.set(
        _treeRef,
        {
          'selectedRootFamilyUnitId': unitId,
          'updatedAt': FieldValue.serverTimestamp(),
        },
        SetOptions(merge: true));
    batch.set(_auditRef(), _audit(uid, 'tree.root_changed', 'tree', _treeId));
    await batch.commit();
  }

  Future<void> importTree(FamilyTreeData data, {required bool replace}) async {
    final uid = _actorUid;
    if (data.people.length > 300 || data.familyUnits.length > 150) {
      throw StateError('Import exceeds the supported tree size.');
    }
    await _ensureTree();
    final existingPeople = await _treeRef.collection('people').get();
    final existingUnits = await _treeRef.collection('familyUnits').get();
    final allowedPeople = replace
        ? data.people.keys.toSet()
        : {...existingPeople.docs.map((doc) => doc.id), ...data.people.keys};
    for (final unit in data.familyUnits.values) {
      if (unit.allMemberIds.any((id) => !allowedPeople.contains(id))) {
        throw StateError('A family unit references an unknown person.');
      }
    }
    if (data.selectedRootFamilyUnitId != null) {
      final allowedUnits = replace
          ? data.familyUnits.keys.toSet()
          : {
              ...existingUnits.docs.map((doc) => doc.id),
              ...data.familyUnits.keys
            };
      if (!allowedUnits.contains(data.selectedRootFamilyUnitId)) {
        throw StateError('The selected root family unit does not exist.');
      }
    }

    if (replace) {
      final deletionOperations = <void Function(WriteBatch)>[];
      for (final doc in existingPeople.docs) {
        deletionOperations.add((batch) => batch.delete(doc.reference));
        deletionOperations.add((batch) =>
            batch.delete(_treeRef.collection('personPrivate').doc(doc.id)));
      }
      for (final doc in existingUnits.docs) {
        deletionOperations.add((batch) => batch.delete(doc.reference));
      }
      // A Firestore batch cannot delete and recreate the same document. Commit
      // the validated replacement deletions before starting the create batches.
      await _commitOperations(deletionOperations);
    }

    final operations = <void Function(WriteBatch)>[];
    final peopleById = {for (final doc in existingPeople.docs) doc.id: doc};
    for (final person in data.people.values) {
      final previous = replace ? null : peopleById[person.id];
      final previousVersion = previous?.data()['version'] as int? ?? 0;
      final createdAt = previous?.data()['createdAt'];
      operations.add((batch) => batch.set(
            _treeRef.collection('people').doc(person.id),
            {
              ..._publicPerson(person, version: previousVersion + 1),
              'createdAt': createdAt ?? FieldValue.serverTimestamp(),
            },
          ));
      operations.add((batch) => batch.set(
            _treeRef.collection('personPrivate').doc(person.id),
            _privatePerson(person),
          ));
    }

    final unitsById = {for (final doc in existingUnits.docs) doc.id: doc};
    for (final unit in data.familyUnits.values) {
      final previous = replace ? null : unitsById[unit.id];
      final createdAt = previous?.data()['createdAt'];
      operations.add((batch) => batch.set(
            _treeRef.collection('familyUnits').doc(unit.id),
            {
              ..._familyData(unit),
              'createdAt': createdAt ?? FieldValue.serverTimestamp(),
            },
          ));
    }
    operations.add((batch) => batch.set(
        _treeRef,
        {
          'schemaVersion': 2,
          'selectedRootFamilyUnitId': data.selectedRootFamilyUnitId,
          'updatedAt': FieldValue.serverTimestamp(),
        },
        SetOptions(merge: true)));
    operations.add((batch) => batch.set(
          _auditRef(),
          _audit(uid, replace ? 'tree.import_replaced' : 'tree.import_merged',
              'tree', _treeId),
        ));
    await _commitOperations(operations);
  }

  Future<void> _ensureTree() async {
    await _db.runTransaction((transaction) async {
      final tree = await transaction.get(_treeRef);
      if (!tree.exists) {
        transaction.set(_treeRef, {
          'schemaVersion': 2,
          'selectedRootFamilyUnitId': null,
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }
    });
  }

  Future<void> _verifyPeopleExist(Iterable<String> ids) async {
    final uniqueIds = ids.toSet();
    final snapshots = await Future.wait(
      uniqueIds.map((id) => _treeRef.collection('people').doc(id).get()),
    );
    if (snapshots.any((snapshot) => !snapshot.exists)) {
      throw StateError('Family unit references an unknown person.');
    }
  }

  Future<void> _commitOperations(
      List<void Function(WriteBatch)> operations) async {
    for (var start = 0; start < operations.length; start += 400) {
      final batch = _db.batch();
      final end = math.min(start + 400, operations.length);
      for (final operation in operations.sublist(start, end)) {
        operation(batch);
      }
      await batch.commit();
    }
  }

  DocumentReference<Map<String, dynamic>> _auditRef() =>
      _db.collection('auditEvents').doc();

  Map<String, dynamic> _audit(
          String uid, String action, String resourceType, String resourceId) =>
      {
        'treeId': _treeId,
        'actorUid': uid,
        'action': action,
        'resourceType': resourceType,
        'resourceId': resourceId,
        'createdAt': FieldValue.serverTimestamp(),
      };

  Map<String, dynamic> _publicPerson(Person person, {required int version}) => {
        'name': person.name.trim(),
        'gender': genderToString(person.gender),
        'dateOfBirth': _date(person.dateOfBirth),
        'dateOfDeath': _date(person.dateOfDeath),
        'isAlive': person.isAlive,
        'currentPlaceOfResidence': person.currentPlaceOfResidence?.trim(),
        'version': version,
        'updatedAt': FieldValue.serverTimestamp(),
      };

  Map<String, dynamic> _privatePerson(Person person) => {
        'contactNumber': person.contactNumber?.trim(),
        'updatedAt': FieldValue.serverTimestamp(),
      };

  Map<String, dynamic> _familyData(FamilyUnit unit) => {
        'husbandId': unit.husbandId,
        'wifeId': unit.wifeId,
        'anniversaryDate': _date(unit.anniversaryDate),
        'childrenIds': unit.childrenIds.toSet().toList(),
        'updatedAt': FieldValue.serverTimestamp(),
      };

  String? _date(DateTime? value) => value?.toIso8601String().split('T').first;

  DateTime _dateTime(dynamic value) {
    if (value is Timestamp) return value.toDate();
    if (value is String) return DateTime.tryParse(value) ?? DateTime.now();
    return DateTime.now();
  }
}
