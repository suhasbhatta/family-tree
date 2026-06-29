import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import '../models/family_tree_data.dart';

class LocalStorageService {
  static const _fileName = 'family_tree.json';
  static LocalStorageService? _instance;

  LocalStorageService._();
  static LocalStorageService get instance =>
      _instance ??= LocalStorageService._();

  FamilyTreeData? _cache;
  FamilyTreeData get data => _cache ?? FamilyTreeData.empty();

  Future<File> get _file async {
    final dir = await getApplicationDocumentsDirectory();
    return File('${dir.path}/$_fileName');
  }

  Future<FamilyTreeData> load() async {
    try {
      final f = await _file;
      if (!await f.exists()) {
        _cache = FamilyTreeData.empty();
        return _cache!;
      }
      final raw = await f.readAsString();
      final json = jsonDecode(raw) as Map<String, dynamic>;
      _cache = FamilyTreeData.fromJson(json);
      return _cache!;
    } catch (_) {
      _cache = FamilyTreeData.empty();
      return _cache!;
    }
  }

  Future<void> save([FamilyTreeData? treeData]) async {
    final td = treeData ?? _cache;
    if (td == null) return;
    _cache = td;
    final f = await _file;
    final json = jsonEncode(td.toJson());
    await f.writeAsString(json);
  }

  Future<void> saveRaw(String jsonString, {bool merge = false}) async {
    if (merge) {
      final imported = FamilyTreeData.fromJson(
          jsonDecode(jsonString) as Map<String, dynamic>);
      final current = await load();
      _mergeInto(current, imported);
      await save(current);
    } else {
      final imported = FamilyTreeData.fromJson(
          jsonDecode(jsonString) as Map<String, dynamic>);
      _cache = imported;
      await save(imported);
    }
  }

  void _mergeInto(FamilyTreeData current, FamilyTreeData imported) {
    for (final p in imported.people.values) {
      if (!current.people.containsKey(p.id)) {
        current.people[p.id] = p;
      } else {
        final existing = current.people[p.id]!;
        if (_personDataDiffers(existing, p)) {
          // Generate new ID for the imported person to avoid conflicts
          final newId = '${p.id}_imported';
          final renamed = _personWithNewId(p, newId);
          current.people[newId] = renamed;
          // Update references in imported family units
          for (final fu in imported.familyUnits.values) {
            if (fu.husbandId == p.id) fu.husbandId = newId;
            if (fu.wifeId == p.id) fu.wifeId = newId;
            final idx = fu.childrenIds.indexOf(p.id);
            if (idx >= 0) fu.childrenIds[idx] = newId;
          }
        }
      }
    }

    for (final fu in imported.familyUnits.values) {
      if (!current.familyUnits.containsKey(fu.id)) {
        current.familyUnits[fu.id] = fu;
      } else {
        final existing = current.familyUnits[fu.id]!;
        if (_familyUnitDiffers(existing, fu)) {
          current.familyUnits['${fu.id}_imported'] = fu;
        }
      }
    }

    current.touch();
  }

  bool _personDataDiffers(dynamic a, dynamic b) {
    return a.name != b.name ||
        a.dateOfBirth?.toIso8601String() != b.dateOfBirth?.toIso8601String();
  }

  bool _familyUnitDiffers(dynamic a, dynamic b) {
    return a.husbandId != b.husbandId || a.wifeId != b.wifeId;
  }

  dynamic _personWithNewId(dynamic p, String newId) {
    return p.copyWith(id: newId);
  }

  Future<String> exportJson() async {
    final td = await load();
    return jsonEncode(td.toJson());
  }

  Future<String> get exportFilePath async {
    final dir = await getTemporaryDirectory();
    return '${dir.path}/family_tree_export.json';
  }
}
