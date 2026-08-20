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
      final preview = FamilyTreeData.fromJson(decoded);
      if (preview.people.length > 300 || preview.familyUnits.length > 150) {
        return (
          success: false,
          error: 'The import exceeds the supported tree size',
          preview: null,
        );
      }
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
}
