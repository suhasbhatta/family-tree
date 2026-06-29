import 'package:flutter/material.dart';
import '../utils/app_state.dart';
import '../services/import_export_service.dart';
import '../services/local_storage_service.dart';
import 'tree_view_screen.dart';
import 'add_edit_family_unit_screen.dart';
import 'search_screen.dart';
import 'relationship_finder_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    final state = AppState.instance;
    final data = state.data;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('family-tree'),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            tooltip: 'Search people',
            onPressed: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const SearchScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.share),
            tooltip: 'Export / Share',
            onPressed: _exportShare,
          ),
        ],
      ),
      body: AnimatedBuilder(
        animation: state,
        builder: (context, _) {
          final d = state.data;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _statsCard(d.people.length, d.familyUnits.length, theme),
              const SizedBox(height: 16),
              _actionButton(
                context,
                icon: Icons.account_tree,
                label: 'View Family Tree',
                subtitle: d.familyUnits.isEmpty
                    ? 'No families yet'
                    : 'Root: ${_rootLabel(d)}',
                color: theme.colorScheme.primary,
                onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => const TreeViewScreen())),
              ),
              const SizedBox(height: 8),
              _actionButton(
                context,
                icon: Icons.people,
                label: 'Add Family Unit',
                subtitle: 'Create a couple and their children',
                color: Colors.green.shade600,
                onTap: () async {
                  await Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) =>
                              const AddEditFamilyUnitScreen()));
                  setState(() {});
                },
              ),
              const SizedBox(height: 8),
              _actionButton(
                context,
                icon: Icons.compare_arrows,
                label: 'Find Relationship',
                subtitle: 'Discover how two people are related',
                color: Colors.purple.shade600,
                onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => const RelationshipFinderScreen())),
              ),
              const SizedBox(height: 8),
              _actionButton(
                context,
                icon: Icons.upload_file,
                label: 'Import Tree',
                subtitle: 'Open a JSON backup file',
                color: Colors.orange.shade600,
                onTap: _importTree,
              ),
              const SizedBox(height: 8),
              _actionButton(
                context,
                icon: Icons.download,
                label: 'Export Tree',
                subtitle: 'Save or share as JSON file',
                color: Colors.teal.shade600,
                onTap: _exportShare,
              ),
              if (!state.isEmpty) ...[
                const SizedBox(height: 24),
                Text('Family Units',
                    style: theme.textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ...d.familyUnitList.take(5).map((fu) {
                  final h = fu.husbandId != null ? d.people[fu.husbandId!] : null;
                  final w = fu.wifeId != null ? d.people[fu.wifeId!] : null;
                  return ListTile(
                    leading: const Icon(Icons.family_restroom),
                    title: Text(_coupleLabel(h?.name, w?.name)),
                    subtitle: Text('${fu.childrenIds.length} children'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const TreeViewScreen())),
                  );
                }),
              ],
            ],
          );
        },
      ),
    );
  }

  Widget _statsCard(int people, int families, ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _stat(people.toString(), 'People', Icons.person, theme),
            Container(height: 40, width: 1, color: Colors.grey.shade300),
            _stat(families.toString(), 'Families', Icons.family_restroom, theme),
          ],
        ),
      ),
    );
  }

  Widget _stat(String value, String label, IconData icon, ThemeData theme) {
    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: theme.colorScheme.primary),
            const SizedBox(width: 4),
            Text(value,
                style: theme.textTheme.headlineSmall
                    ?.copyWith(fontWeight: FontWeight.bold)),
          ],
        ),
        Text(label, style: theme.textTheme.bodySmall),
      ],
    );
  }

  Widget _actionButton(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color),
        ),
        title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }

  String _rootLabel(dynamic d) {
    final rootId = d.selectedRootFamilyUnitId;
    if (rootId == null) return 'not set';
    final fu = d.familyUnits[rootId];
    if (fu == null) return 'not set';
    final h = fu.husbandId != null ? d.people[fu.husbandId!] : null;
    final w = fu.wifeId != null ? d.people[fu.wifeId!] : null;
    return _coupleLabel(h?.name, w?.name);
  }

  String _coupleLabel(String? h, String? w) {
    if (h != null && w != null) return '$h & $w';
    if (h != null) return '$h & ...';
    if (w != null) return '... & $w';
    return 'Unknown';
  }

  Future<void> _exportShare() async {
    try {
      await ImportExportService.instance.shareExport();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Export failed: $e')));
      }
    }
  }

  Future<void> _importTree() async {
    final result = await ImportExportService.instance.pickAndValidateImport();
    if (!result.success || result.preview == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(result.error ?? 'Import failed')));
      }
      return;
    }

    final preview = result.preview!;
    final mode = await showDialog<ImportMode>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Import Family Tree'),
        content: Text(
          'Found ${preview.people.length} people and '
          '${preview.familyUnits.length} family units.\n\n'
          'How would you like to import?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, ImportMode.merge),
            child: const Text('Merge'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, ImportMode.replace),
            child: const Text('Replace'),
          ),
        ],
      ),
    );

    if (mode == null) return;

    await ImportExportService.instance.importData(preview, mode);
    await AppState.instance.reload();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Import successful!')));
      setState(() {});
    }
  }
}
