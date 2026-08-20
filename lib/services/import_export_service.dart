import 'dart:convert';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:file_saver/file_saver.dart';

import '../models/family_tree_data.dart';
import '../utils/app_state.dart';

enum ImportMode { replace, merge }

class ImportExportService {
  static ImportExportService? _instance;
  ImportExportService._();
  static ImportExportService get instance =>
      _instance ??= ImportExportService._();

  static const maxImportBytes = 512 * 1024;

  Future<void> shareExport() async {
    final json = const JsonEncoder.withIndent('  ')
        .convert(AppState.instance.data.toJson());
    await FileSaver.instance.saveFile(
      name: 'family_tree_export',
      bytes: Uint8List.fromList(utf8.encode(json)),
      fileExtension: 'json',
      mimeType: MimeType.json,
    );
  }

  Future<({bool success, String? error, FamilyTreeData? preview})>
      pickAndValidateImport() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['json'],
      allowMultiple: false,
      withData: true,
    );
    if (result == null || result.files.isEmpty) {
      return (success: false, error: 'No file selected', preview: null);
    }
    final bytes = result.files.single.bytes;
    if (bytes == null) {
      return (
        success: false,
        error: 'Could not read the selected file',
        preview: null
      );
    }
    if (bytes.length > maxImportBytes) {
      return (
        success: false,
        error: 'Import files must be 512 KB or smaller',
        preview: null,
      );
    }
    try {
      final decoded = jsonDecode(utf8.decode(bytes));
      if (decoded is! Map<String, dynamic> ||
          decoded['people'] is! List ||
          decoded['familyUnits'] is! List) {
        return (
          success: false,
          error: 'The file is not a valid family-tree export',
          preview: null,
        );
      }
      final validationError = _validateImport(decoded);
      if (validationError != null) {
        return (success: false, error: validationError, preview: null);
      }
      final preview = FamilyTreeData.fromJson(decoded);
      return (success: true, error: null, preview: preview);
    } catch (_) {
      return (
        success: false,
        error: 'The selected JSON file could not be parsed',
        preview: null,
      );
    }
  }

  Future<void> importData(FamilyTreeData imported, ImportMode mode) =>
      AppState.instance.importTree(
        imported,
        replace: mode == ImportMode.replace,
      );

  String? _validateImport(Map<String, dynamic> data) {
    final people = data['people'] as List;
    final units = data['familyUnits'] as List;
    if (people.length > 300 || units.length > 150) {
      return 'The import exceeds the supported tree size';
    }

    final personIds = <String>{};
    for (final value in people) {
      if (value is! Map<String, dynamic>) {
        return 'The import contains an invalid person record';
      }
      final id = value['id'];
      final name = value['name'];
      final gender = value['gender'];
      if (!_validId(id) || !personIds.add(id as String)) {
        return 'Every person must have a unique valid ID';
      }
      if (name is! String || name.trim().isEmpty || name.trim().length > 120) {
        return 'Every person must have a valid name';
      }
      if (gender is! String ||
          !const {'male', 'female', 'other', 'unknown'}.contains(gender)) {
        return 'A person has an unsupported gender value';
      }
      if (value['isAlive'] is! bool ||
          !_validDateOrNull(value['dateOfBirth']) ||
          !_validDateOrNull(value['dateOfDeath']) ||
          !_boundedStringOrNull(value['contactNumber'], 32) ||
          !_boundedStringOrNull(value['currentPlaceOfResidence'], 160)) {
        return 'A person contains invalid profile details';
      }
    }

    final unitIds = <String>{};
    for (final value in units) {
      if (value is! Map<String, dynamic>) {
        return 'The import contains an invalid family unit';
      }
      final id = value['id'];
      final husbandId = value['husbandId'];
      final wifeId = value['wifeId'];
      final children = value['childrenIds'];
      if (!_validId(id) || !unitIds.add(id as String)) {
        return 'Every family unit must have a unique valid ID';
      }
      if (!_knownPersonOrNull(husbandId, personIds) ||
          !_knownPersonOrNull(wifeId, personIds) ||
          (husbandId != null && husbandId == wifeId) ||
          !_validDateOrNull(value['anniversaryDate']) ||
          children is! List ||
          children.length > 100) {
        return 'A family unit contains invalid relationship details';
      }
      final childIds = <String>{};
      for (final childId in children) {
        if (childId is! String ||
            !personIds.contains(childId) ||
            !childIds.add(childId) ||
            childId == husbandId ||
            childId == wifeId) {
          return 'A family unit contains an invalid child reference';
        }
      }
    }

    final rootId = data['selectedRootFamilyUnitId'];
    if (rootId != null && (rootId is! String || !unitIds.contains(rootId))) {
      return 'The selected root family unit does not exist';
    }
    return null;
  }

  bool _validId(dynamic value) =>
      value is String && RegExp(r'^[A-Za-z0-9_-]{1,128}$').hasMatch(value);

  bool _knownPersonOrNull(dynamic value, Set<String> people) =>
      value == null || (value is String && people.contains(value));

  bool _boundedStringOrNull(dynamic value, int maximum) =>
      value == null || (value is String && value.trim().length <= maximum);

  bool _validDateOrNull(dynamic value) {
    if (value == null) return true;
    if (value is! String || !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value)) {
      return false;
    }
    final parsed = DateTime.tryParse(value);
    return parsed != null && parsed.toIso8601String().startsWith(value);
  }
}
