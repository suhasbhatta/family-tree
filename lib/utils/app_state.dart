import 'dart:async';

import 'package:flutter/foundation.dart';

import '../models/family_tree_data.dart';
import '../models/family_unit.dart';
import '../models/person.dart';
import '../services/firebase_tree_service.dart';
import 'auth_service.dart';
import 'id_generator.dart' as ids;

class AppState extends ChangeNotifier {
  static AppState? _instance;
  AppState._();
  static AppState get instance => _instance ??= AppState._();

  final FirebaseTreeService _service = FirebaseTreeService.instance;
  FamilyTreeData _data = FamilyTreeData.empty();
  StreamSubscription<dynamic>? _treeSubscription;
  bool _loaded = false;
  bool _reloading = false;
  String? _error;

  FamilyTreeData get data => _data;
  bool get loaded => _loaded;
  bool get isEmpty => _data.people.isEmpty && _data.familyUnits.isEmpty;
  String? get error => _error;

  Future<void> connect() async {
    if (!AuthService.instance.isAuthenticated || _treeSubscription != null) {
      return;
    }
    await reload();
    _treeSubscription = _service.watchTreeMetadata().skip(1).listen(
      (_) => reload(),
      onError: (_) {
        _error = 'Unable to refresh the shared family tree.';
        notifyListeners();
      },
    );
  }

  void disconnect() {
    _treeSubscription?.cancel();
    _treeSubscription = null;
    _data = FamilyTreeData.empty();
    _loaded = false;
    _error = null;
  }

  Future<void> reload() async {
    if (_reloading || !AuthService.instance.isAuthenticated) return;
    _reloading = true;
    try {
      _data = await _service.loadTree();
      _loaded = true;
      _error = null;
    } catch (_) {
      _error = 'Unable to load the family tree. Please try again.';
    } finally {
      _loaded = true;
      _reloading = false;
      notifyListeners();
    }
  }

  bool canEditPerson(String personId) => AuthService.instance.isAdmin;

  void _requireAdmin() {
    if (!AuthService.instance.isAdmin) {
      throw StateError('Only the family admin can perform this action.');
    }
  }

  Future<Person> addPerson({
    required String name,
    required Gender gender,
    DateTime? dateOfBirth,
    DateTime? dateOfDeath,
    bool isAlive = true,
    String? contactNumber,
    String? currentPlaceOfResidence,
  }) async {
    _requireAdmin();
    final created = await _service.addPerson(Person(
      id: ids.personId(),
      name: name,
      gender: gender,
      dateOfBirth: dateOfBirth,
      dateOfDeath: dateOfDeath,
      isAlive: isAlive,
      contactNumber: contactNumber,
      currentPlaceOfResidence: currentPlaceOfResidence,
    ));
    await reload();
    return created;
  }

  Future<void> updatePerson(Person person) async {
    final current = _data.people[person.id];
    if (current == null || !canEditPerson(person.id)) {
      throw StateError('You cannot edit this profile.');
    }
    await _service.updatePerson(person);
    await reload();
  }

  Future<void> deletePerson(String id) async {
    _requireAdmin();
    await _service.deletePerson(id);
    await reload();
  }

  Future<FamilyUnit> addFamilyUnit({
    String? husbandId,
    String? wifeId,
    DateTime? anniversaryDate,
    List<String>? childrenIds,
  }) async {
    _requireAdmin();
    final created = await _service.addFamilyUnit(FamilyUnit(
      id: ids.familyUnitId(),
      husbandId: husbandId,
      wifeId: wifeId,
      anniversaryDate: anniversaryDate,
      childrenIds: childrenIds ?? [],
    ));
    await reload();
    return created;
  }

  Future<void> updateFamilyUnit(FamilyUnit unit) async {
    _requireAdmin();
    await _service.updateFamilyUnit(unit);
    await reload();
  }

  Future<void> deleteFamilyUnit(String id) async {
    _requireAdmin();
    await _service.deleteFamilyUnit(id);
    await reload();
  }

  Future<void> setRootFamilyUnit(String? id) async {
    _requireAdmin();
    await _service.setRootFamilyUnit(id);
    await reload();
  }

  Future<void> importTree(FamilyTreeData imported,
      {required bool replace}) async {
    _requireAdmin();
    await _service.importTree(imported, replace: replace);
    await reload();
  }
}
