import 'dart:convert';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../models/family_tree_data.dart';
import 'local_storage_service.dart';

enum ImportMode { replace, merge }

class ImportExportService {
  static ImportExportService? _instance;
  ImportExportService._();
  static ImportExportService get instance =>
      _instance ??= ImportExportService._();

  Future<String> exportToFile() async {
    final json = await LocalStorageService.instance.exportJson();
    final dir = await getTemporaryDirectory();
    final filePath = '${dir.path}/family_tree_export.json';
    await File(filePath).writeAsString(json);
    return filePath;
  }

  Future<void> shareExport() async {
    final filePath = await exportToFile();
    await Share.shareXFiles(
      [XFile(filePath, mimeType: 'application/json')],
      subject: 'Family Tree Export',
    );
  }

  Future<({bool success, String? error, FamilyTreeData? preview})>
      pickAndValidateImport() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['json'],
      allowMultiple: false,
    );

    if (result == null || result.files.isEmpty) {
      return (success: false, error: 'No file selected', preview: null);
    }

    final path = result.files.first.path;
    if (path == null) {
      return (success: false, error: 'Could not read file path', preview: null);
    }

    try {
      final content = await File(path).readAsString();
      final decoded = jsonDecode(content);
      if (decoded is! Map<String, dynamic>) {
        return (success: false, error: 'Invalid JSON format', preview: null);
      }
      if (!decoded.containsKey('people') || !decoded.containsKey('familyUnits')) {
        return (
          success: false,
          error: 'JSON missing required fields (people, familyUnits)',
          preview: null
        );
      }
      final preview = FamilyTreeData.fromJson(decoded);
      return (success: true, error: null, preview: preview);
    } catch (e) {
      return (success: false, error: 'Parse error: $e', preview: null);
    }
  }

  Future<void> importFromPath(String path, ImportMode mode) async {
    final content = await File(path).readAsString();
    await LocalStorageService.instance.saveRaw(
      content,
      merge: mode == ImportMode.merge,
    );
  }

  Future<void> importData(FamilyTreeData imported, ImportMode mode) async {
    final storage = LocalStorageService.instance;
    if (mode == ImportMode.replace) {
      await storage.save(imported);
    } else {
      final jsonStr = jsonEncode(imported.toJson());
      await storage.saveRaw(jsonStr, merge: true);
    }
  }
}
