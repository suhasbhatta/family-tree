import 'package:flutter/foundation.dart';
import '../models/family_tree_data.dart';
import '../models/person.dart';
import '../models/family_unit.dart';
import '../services/local_storage_service.dart';
import '../utils/id_generator.dart' as ids;

class AppState extends ChangeNotifier {
  static AppState? _instance;
  AppState._();
  static AppState get instance => _instance ??= AppState._();

  FamilyTreeData _data = FamilyTreeData.empty();
  bool _loaded = false;

  FamilyTreeData get data => _data;
  bool get loaded => _loaded;
  bool get isEmpty =>
      _data.people.isEmpty && _data.familyUnits.isEmpty;

  Future<void> init() async {
    _data = await LocalStorageService.instance.load();
    _loaded = true;
    notifyListeners();
  }

  Future<void> reload() async {
    _data = await LocalStorageService.instance.load();
    notifyListeners();
  }

  Future<void> _save() async {
    await LocalStorageService.instance.save(_data);
    notifyListeners();
  }

  // Person operations
  Future<Person> addPerson({
    required String name,
    required Gender gender,
    DateTime? dateOfBirth,
    DateTime? dateOfDeath,
    bool isAlive = true,
    String? contactNumber,
    String? currentPlaceOfResidence,
  }) async {
    final p = Person(
      id: ids.personId(),
      name: name,
      gender: gender,
      dateOfBirth: dateOfBirth,
      dateOfDeath: dateOfDeath,
      isAlive: isAlive,
      contactNumber: contactNumber,
      currentPlaceOfResidence: currentPlaceOfResidence,
    );
    _data.addOrUpdatePerson(p);
    await _save();
    return p;
  }

  Future<void> updatePerson(Person p) async {
    _data.addOrUpdatePerson(p);
    await _save();
  }

  Future<void> deletePerson(String id) async {
    _data.removePerson(id);
    await _save();
  }

  // FamilyUnit operations
  Future<FamilyUnit> addFamilyUnit({
    String? husbandId,
    String? wifeId,
    DateTime? anniversaryDate,
    List<String>? childrenIds,
  }) async {
    final fu = FamilyUnit(
      id: ids.familyUnitId(),
      husbandId: husbandId,
      wifeId: wifeId,
      anniversaryDate: anniversaryDate,
      childrenIds: childrenIds ?? [],
    );
    _data.addOrUpdateFamilyUnit(fu);
    await _save();
    return fu;
  }

  Future<void> updateFamilyUnit(FamilyUnit fu) async {
    _data.addOrUpdateFamilyUnit(fu);
    await _save();
  }

  Future<void> deleteFamilyUnit(String id) async {
    _data.removeFamilyUnit(id);
    await _save();
  }

  Future<void> setRootFamilyUnit(String? id) async {
    _data.selectedRootFamilyUnitId = id;
    _data.touch();
    await _save();
  }

  void replaceData(FamilyTreeData newData) {
    _data = newData;
    notifyListeners();
  }
}
