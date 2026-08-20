import 'package:flutter/material.dart';
import '../models/family_unit.dart';
import '../theme/magnetic_colors.dart';
import '../theme/glass.dart';
import '../theme/magnetic_scaffold.dart';
import '../utils/app_state.dart';
import '../utils/auth_service.dart';
import '../utils/date_utils.dart' as du;
import 'person_details_screen.dart';
import 'add_edit_family_unit_screen.dart';

class TreeViewScreen extends StatefulWidget {
  const TreeViewScreen({super.key});

  @override
  State<TreeViewScreen> createState() => _TreeViewScreenState();
}

class _TreeViewScreenState extends State<TreeViewScreen> {
  final Set<String> _collapsed = {};
  final TransformationController _transformCtrl = TransformationController();

  @override
  void dispose() {
    _transformCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: AppState.instance,
      builder: (context, _) {
        final data = AppState.instance.data;
        final rootId = data.selectedRootFamilyUnitId;
        final isAdmin = AuthService.instance.isAdmin;

        return MagneticScaffold(
          appBar: AppBar(
            title: const Text('Family Tree'),
            actions: [
              IconButton(
                icon: const Icon(Icons.center_focus_strong),
                tooltip: 'Reset view',
                onPressed: () => _transformCtrl.value = Matrix4.identity(),
              ),
              if (isAdmin)
                IconButton(
                  icon: const Icon(Icons.settings),
                  tooltip: 'Select root',
                  onPressed: _selectRoot,
                ),
            ],
          ),
          body: data.familyUnits.isEmpty
              ? _emptyState(context, isAdmin)
              : InteractiveViewer(
                  transformationController: _transformCtrl,
                  minScale: 0.3,
                  maxScale: 3.0,
                  boundaryMargin: const EdgeInsets.all(200),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(16, 100, 16, 32),
                    child:
                        rootId != null && data.familyUnits.containsKey(rootId)
                            ? _buildTree(rootId, 0, {}, isAdmin)
                            : _buildAllUnits(isAdmin),
                  ),
                ),
        );
      },
    );
  }

  Widget _emptyState(BuildContext context, bool isAdmin) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.hub_outlined,
              size: 64, color: MagneticColors.textMuted),
          const SizedBox(height: 16),
          const Text('No family units yet',
              style: TextStyle(color: MagneticColors.textSecondary)),
          if (isAdmin) ...[
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () async {
                await Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => const AddEditFamilyUnitScreen()));
                setState(() {});
              },
              icon: const Icon(Icons.add),
              label: const Text('Add Family Unit'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAllUnits(bool isAdmin) {
    final data = AppState.instance.data;
    // Find root units: those that have no parents
    final childrenOfUnit = <String>{};
    for (final fu in data.familyUnits.values) {
      childrenOfUnit.addAll(fu.childrenIds);
    }

    final rootUnits = data.familyUnits.values.where((fu) {
      final husbandIsChild =
          fu.husbandId != null && childrenOfUnit.contains(fu.husbandId);
      final wifeIsChild =
          fu.wifeId != null && childrenOfUnit.contains(fu.wifeId);
      return !husbandIsChild && !wifeIsChild;
    }).toList();

    if (rootUnits.isEmpty) {
      return Column(
        children: data.familyUnitList
            .map((fu) => _buildTree(fu.id, 0, {}, isAdmin))
            .toList(),
      );
    }

    return Column(
      children:
          rootUnits.map((fu) => _buildTree(fu.id, 0, {}, isAdmin)).toList(),
    );
  }

  Widget _buildTree(
      String unitId, int depth, Set<String> visited, bool isAdmin) {
    if (visited.contains(unitId) || depth > 12) {
      return const Padding(
        padding: EdgeInsets.all(8),
        child: Text('(cycle detected)',
            style: TextStyle(color: MagneticColors.rose)),
      );
    }
    visited = {...visited, unitId};
    final data = AppState.instance.data;
    final unit = data.familyUnits[unitId];
    if (unit == null) return const SizedBox();

    final isCollapsed = _collapsed.contains(unitId);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _FamilyUnitNode(
          unit: unit,
          data: data,
          isCollapsed: isCollapsed,
          onToggle: () => setState(() {
            if (isCollapsed) {
              _collapsed.remove(unitId);
            } else {
              _collapsed.add(unitId);
            }
          }),
          onEditTap: isAdmin
              ? () async {
                  await Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) =>
                              AddEditFamilyUnitScreen(existingUnit: unit)));
                  setState(() {});
                }
              : null,
        ),
        if (!isCollapsed && unit.childrenIds.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(left: 20),
            child: Container(
              decoration: const BoxDecoration(
                border: Border(
                  left: BorderSide(
                      color: MagneticColors.glassBorderStrong, width: 2),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: unit.childrenIds.expand((childId) {
                  final childUnits = data.familyUnits.values
                      .where((fu) =>
                          fu.husbandId == childId || fu.wifeId == childId)
                      .toList();

                  final widgets = <Widget>[];
                  // Show child person node
                  final childPerson = data.people[childId];
                  if (childPerson != null && childUnits.isEmpty) {
                    widgets.add(_TreeConnector(
                      child: _ChildLeafNode(
                        personId: childId,
                        data: data,
                        onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) =>
                                    PersonDetailsScreen(personId: childId))),
                      ),
                    ));
                  }
                  // Show child's family units
                  for (final cu in childUnits) {
                    if (!visited.contains(cu.id)) {
                      widgets.add(_TreeConnector(
                          child:
                              _buildTree(cu.id, depth + 1, visited, isAdmin)));
                    }
                  }
                  return widgets;
                }).toList(),
              ),
            ),
          ),
      ],
    );
  }

  Future<void> _selectRoot() async {
    final data = AppState.instance.data;
    final units = data.familyUnitList;
    final selected = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Select Root Family Unit'),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView(
            shrinkWrap: true,
            children: units.map((fu) {
              final h =
                  fu.husbandId != null ? data.people[fu.husbandId!] : null;
              final w = fu.wifeId != null ? data.people[fu.wifeId!] : null;
              final label = _coupleLabel(h?.name, w?.name);
              return ListTile(
                title: Text(label),
                onTap: () => Navigator.pop(ctx, fu.id),
              );
            }).toList(),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ],
      ),
    );
    if (selected != null) {
      await AppState.instance.setRootFamilyUnit(selected);
      setState(() {});
    }
  }

  String _coupleLabel(String? h, String? w) {
    if (h != null && w != null) return '$h & $w';
    if (h != null) return '$h & (unknown)';
    if (w != null) return '(unknown) & $w';
    return 'Unknown couple';
  }
}

class _FamilyUnitNode extends StatelessWidget {
  final FamilyUnit unit;
  final dynamic data;
  final bool isCollapsed;
  final VoidCallback onToggle;
  final VoidCallback? onEditTap;

  const _FamilyUnitNode({
    required this.unit,
    required this.data,
    required this.isCollapsed,
    required this.onToggle,
    required this.onEditTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final husband =
        unit.husbandId != null ? data.people[unit.husbandId!] : null;
    final wife = unit.wifeId != null ? data.people[unit.wifeId!] : null;

    return GlassPanel(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: EdgeInsets.zero,
      borderRadius: BorderRadius.circular(14),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onEditTap,
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          if (husband != null) ...[
                            _personChip(context, husband, true),
                          ] else
                            const Text('(unknown)',
                                style:
                                    TextStyle(color: MagneticColors.textMuted)),
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 8),
                            child: Icon(Icons.favorite,
                                size: 14, color: MagneticColors.rose),
                          ),
                          if (wife != null) ...[
                            _personChip(context, wife, false),
                          ] else
                            const Text('(unknown)',
                                style:
                                    TextStyle(color: MagneticColors.textMuted)),
                        ],
                      ),
                      if (unit.anniversaryDate != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          'Married: ${du.formatDate(unit.anniversaryDate)}',
                          style: theme.textTheme.labelSmall,
                        ),
                      ],
                      if (unit.childrenIds.isNotEmpty)
                        Text(
                          '${unit.childrenIds.length} child${unit.childrenIds.length == 1 ? "" : "ren"}',
                          style: const TextStyle(
                              color: MagneticColors.emerald, fontSize: 11),
                        ),
                    ],
                  ),
                ),
                if (unit.childrenIds.isNotEmpty)
                  IconButton(
                    icon: Icon(
                      isCollapsed
                          ? Icons.keyboard_arrow_down
                          : Icons.keyboard_arrow_up,
                      color: MagneticColors.cyan,
                    ),
                    onPressed: onToggle,
                    tooltip: isCollapsed ? 'Expand' : 'Collapse',
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _personChip(BuildContext context, dynamic person, bool isMale) {
    final color = MagneticColors.genderColor(isMale);
    return GestureDetector(
      onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
              builder: (_) => PersonDetailsScreen(personId: person.id))),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.4)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(person.name,
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: MagneticColors.textPrimary)),
            if (!person.isAlive) ...[
              const SizedBox(width: 4),
              const Icon(Icons.sentiment_dissatisfied,
                  size: 12, color: MagneticColors.textMuted),
            ],
          ],
        ),
      ),
    );
  }
}

class _TreeConnector extends StatelessWidget {
  final Widget child;

  const _TreeConnector({required this.child});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
            width: 16, height: 2, color: MagneticColors.glassBorderStrong),
        Flexible(child: child),
      ],
    );
  }
}

class _ChildLeafNode extends StatelessWidget {
  final String personId;
  final dynamic data;
  final VoidCallback onTap;

  const _ChildLeafNode({
    required this.personId,
    required this.data,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final person = data.people[personId];
    if (person == null) return const SizedBox();
    final isMale = person.gender.name == 'male';
    final color = MagneticColors.genderColor(isMale);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 2, horizontal: 4),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: MagneticColors.glassFill,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isMale ? Icons.male : Icons.female,
              size: 14,
              color: color,
            ),
            const SizedBox(width: 4),
            Text(person.name,
                style: const TextStyle(
                    fontSize: 13, color: MagneticColors.textPrimary)),
            if (!person.isAlive) ...[
              const SizedBox(width: 4),
              const Text('†',
                  style:
                      TextStyle(color: MagneticColors.textMuted, fontSize: 12)),
            ],
          ],
        ),
      ),
    );
  }
}
