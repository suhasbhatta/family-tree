import 'package:flutter/material.dart';
import '../theme/magnetic_colors.dart';
import '../theme/glass.dart';
import '../theme/magnetic_scaffold.dart';
import '../utils/app_state.dart';
import '../utils/auth_service.dart';
import '../services/import_export_service.dart';
import 'tree_view_screen.dart';
import 'add_edit_family_unit_screen.dart';
import 'add_edit_person_screen.dart';
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
    final theme = Theme.of(context);

    return AnimatedBuilder(
      animation: AuthService.instance,
      builder: (context, _) {
        final isAdmin = AuthService.instance.isAdmin;
        return MagneticScaffold(
          appBar: AppBar(
            title: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  alignment: Alignment.center,
                  margin: const EdgeInsets.only(right: 10),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: MagneticColors.cyan.withValues(alpha: 0.14),
                    border: Border.all(
                        color: MagneticColors.cyan.withValues(alpha: 0.5)),
                  ),
                  child: const Icon(Icons.hub_outlined,
                      size: 18, color: MagneticColors.cyan),
                ),
                const Text('Magnetic Family Tree'),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.search),
                tooltip: 'Search people',
                onPressed: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const SearchScreen())),
              ),
              if (isAdmin)
                IconButton(
                  icon: const Icon(Icons.share),
                  tooltip: 'Export backup',
                  onPressed: _exportShare,
                ),
              IconButton(
                icon: const Icon(Icons.logout),
                tooltip: 'Sign out',
                onPressed: AuthService.instance.logout,
              ),
            ],
          ),
          body: AnimatedBuilder(
            animation: state,
            builder: (context, _) {
              final d = state.data;
              if (!state.loaded) {
                return const Center(child: CircularProgressIndicator());
              }
              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (state.error != null) ...[
                    GlassPanel(
                      borderColor: MagneticColors.rose,
                      child: Row(
                        children: [
                          const Icon(Icons.cloud_off_outlined,
                              color: MagneticColors.rose),
                          const SizedBox(width: 10),
                          Expanded(child: Text(state.error!)),
                          IconButton(
                            tooltip: 'Retry',
                            onPressed: state.reload,
                            icon: const Icon(Icons.refresh),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  _statsCard(d.people.length, d.familyUnits.length),
                  const SizedBox(height: 16),
                  _actionButton(
                    context,
                    icon: Icons.account_tree,
                    label: 'View Family Tree',
                    subtitle: d.familyUnits.isEmpty
                        ? 'No families yet'
                        : 'Root: ${_rootLabel(d)}',
                    color: MagneticColors.cyan,
                    onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const TreeViewScreen())),
                  ),
                  if (isAdmin) ...[
                    const SizedBox(height: 8),
                    _actionButton(
                      context,
                      icon: Icons.person_add,
                      label: 'Add Person',
                      subtitle: 'Add a person without a family unit yet',
                      color: MagneticColors.magenta,
                      onTap: () async {
                        await Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const AddEditPersonScreen()));
                        setState(() {});
                      },
                    ),
                    const SizedBox(height: 8),
                    _actionButton(
                      context,
                      icon: Icons.people,
                      label: 'Add Family Unit',
                      subtitle: 'Create a couple and their children',
                      color: MagneticColors.emerald,
                      onTap: () async {
                        await Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) =>
                                    const AddEditFamilyUnitScreen()));
                        setState(() {});
                      },
                    ),
                  ],
                  const SizedBox(height: 8),
                  _actionButton(
                    context,
                    icon: Icons.compare_arrows,
                    label: 'Find Relationship',
                    subtitle: 'Discover how two people are related',
                    color: MagneticColors.amber,
                    onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const RelationshipFinderScreen())),
                  ),
                  if (isAdmin) ...[
                    const SizedBox(height: 8),
                    _actionButton(
                      context,
                      icon: Icons.upload_file,
                      label: 'Import Tree',
                      subtitle: 'Open a JSON backup file',
                      color: MagneticColors.rose,
                      onTap: _importTree,
                    ),
                  ],
                  if (isAdmin) ...[
                    const SizedBox(height: 8),
                    _actionButton(
                      context,
                      icon: Icons.download,
                      label: 'Export Tree',
                      subtitle: 'Download a full private JSON backup',
                      color: MagneticColors.cyan,
                      onTap: _exportShare,
                    ),
                  ],
                  if (!state.isEmpty) ...[
                    const SizedBox(height: 24),
                    Text('Family Units', style: theme.textTheme.titleLarge),
                    const SizedBox(height: 8),
                    ...d.familyUnitList.take(5).map((fu) {
                      final h =
                          fu.husbandId != null ? d.people[fu.husbandId!] : null;
                      final w = fu.wifeId != null ? d.people[fu.wifeId!] : null;
                      return GlassPanel(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: EdgeInsets.zero,
                        child: ListTile(
                          leading: const Icon(Icons.link,
                              color: MagneticColors.cyan),
                          title: Text(_coupleLabel(h?.name, w?.name)),
                          subtitle: Text('${fu.childrenIds.length} children'),
                          trailing: const Icon(Icons.chevron_right,
                              color: MagneticColors.textMuted),
                          onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) => const TreeViewScreen())),
                        ),
                      );
                    }),
                  ],
                ],
              );
            },
          ),
        );
      },
    );
  }

  Widget _statsCard(int people, int families) {
    return GlassPanel(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _stat(people.toString(), 'People', Icons.person, MagneticColors.cyan),
          Container(
              height: 40, width: 1, color: MagneticColors.glassBorderStrong),
          _stat(families.toString(), 'Families', Icons.link,
              MagneticColors.magenta),
        ],
      ),
    );
  }

  Widget _stat(String value, String label, IconData icon, Color color) {
    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 4),
            Text(value,
                style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: MagneticColors.textPrimary)),
          ],
        ),
        Text(label,
            style:
                const TextStyle(color: MagneticColors.textMuted, fontSize: 12)),
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
    return GlassPanel(
      padding: EdgeInsets.zero,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: color.withValues(alpha: 0.4)),
              ),
              child: Icon(icon, color: color),
            ),
            title: Text(label,
                style: const TextStyle(fontWeight: FontWeight.w700)),
            subtitle: Text(subtitle),
            trailing: const Icon(Icons.chevron_right,
                color: MagneticColors.textMuted),
          ),
        ),
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
    if (!mounted) return;
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
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Import successful!')));
      setState(() {});
    }
  }
}
