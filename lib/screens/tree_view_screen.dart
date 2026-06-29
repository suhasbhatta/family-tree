import 'package:flutter/material.dart';
import '../models/family_unit.dart';
import '../utils/app_state.dart';
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

        return Scaffold(
          appBar: AppBar(
            title: const Text('Family Tree'),
            actions: [
              IconButton(
                icon: const Icon(Icons.fit_screen),
                tooltip: 'Reset view',
                onPressed: () =>
                    _transformCtrl.value = Matrix4.identity(),
              ),
              IconButton(
                icon: const Icon(Icons.settings),
                tooltip: 'Select root',
                onPressed: _selectRoot,
              ),
            ],
          ),
          body: data.familyUnits.isEmpty
              ? _emptyState(context)
              : InteractiveViewer(
                  transformationController: _transformCtrl,
                  minScale: 0.3,
                  maxScale: 3.0,
                  boundaryMargin: const EdgeInsets.all(200),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: rootId != null && data.familyUnits.containsKey(rootId)
                        ? _buildTree(rootId, 0, {})
                        : _buildAllUnits(),
                  ),
                ),
        );
      },
    );
  }

  Widget _emptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.account_tree_outlined, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text('No family units yet'),
          const SizedBox(height: 8),
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
      ),
    );
  }

  Widget _buildAllUnits() {
    final data = AppState.instance.data;
    // Find root units: those that have no parents
    final childrenOfUnit = <String>{};
    for (final fu in data.familyUnits.values) {
      childrenOfUnit.addAll(fu.childrenIds);
    }

    final rootUnits = data.familyUnits.values.where((fu) {
      final husbandIsChild = fu.husbandId != null &&
          childrenOfUnit.contains(fu.husbandId);
      final wifeIsChild = fu.wifeId != null &&
          childrenOfUnit.contains(fu.wifeId);
      return !husbandIsChild && !wifeIsChild;
    }).toList();

    if (rootUnits.isEmpty) {
      return Column(
        children: data.familyUnitList
            .map((fu) => _buildTree(fu.id, 0, {}))
            .toList(),
      );
    }

    return Column(
      children: rootUnits.map((fu) => _buildTree(fu.id, 0, {})).toList(),
    );
  }

  Widget _buildTree(String unitId, int depth, Set<String> visited) {
    if (visited.contains(unitId) || depth > 12) {
      return Padding(
        padding: const EdgeInsets.all(8),
        child: Text('(cycle detected)', style: TextStyle(color: Colors.red.shade300)),
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
          onEditTap: () async {
            await Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) =>
                        AddEditFamilyUnitScreen(existingUnit: unit)));
            setState(() {});
          },
        ),
        if (!isCollapsed && unit.childrenIds.isNotEmpty)
          Padding(
            padding: EdgeInsets.only(left: 24.0 + depth * 8),
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
                  widgets.add(_ChildLeafNode(
                    personId: childId,
                    data: data,
                    onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) =>
                                PersonDetailsScreen(personId: childId))),
                  ));
                }
                // Show child's family units
                for (final cu in childUnits) {
                  if (!visited.contains(cu.id)) {
                    widgets.add(_buildTree(cu.id, depth + 1, visited));
                  }
                }
                return widgets;
              }).toList(),
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
              final h = fu.husbandId != null ? data.people[fu.husbandId!] : null;
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
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
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
  final VoidCallback onEditTap;

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
    final husband = unit.husbandId != null ? data.people[unit.husbandId!] : null;
    final wife = unit.wifeId != null ? data.people[unit.wifeId!] : null;

    return GestureDetector(
      onTap: onEditTap,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Colors.blue.shade50,
              Colors.pink.shade50,
            ],
          ),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
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
                          Icon(Icons.male, size: 14, color: Colors.blue.shade600),
                          const SizedBox(width: 4),
                          _personChip(context, husband),
                        ] else
                          const Text('(unknown)', style: TextStyle(color: Colors.grey)),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 8),
                          child: Icon(Icons.favorite, size: 14, color: Colors.red),
                        ),
                        if (wife != null) ...[
                          Icon(Icons.female, size: 14, color: Colors.pink.shade400),
                          const SizedBox(width: 4),
                          _personChip(context, wife),
                        ] else
                          const Text('(unknown)', style: TextStyle(color: Colors.grey)),
                      ],
                    ),
                    if (unit.anniversaryDate != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        'Married: ${du.formatDate(unit.anniversaryDate)}',
                        style: theme.textTheme.labelSmall
                            ?.copyWith(color: Colors.grey.shade600),
                      ),
                    ],
                    if (unit.childrenIds.isNotEmpty)
                      Text(
                        '${unit.childrenIds.length} child${unit.childrenIds.length == 1 ? "" : "ren"}',
                        style: theme.textTheme.labelSmall
                            ?.copyWith(color: Colors.green.shade700),
                      ),
                  ],
                ),
              ),
              if (unit.childrenIds.isNotEmpty)
                IconButton(
                  icon: Icon(
                      isCollapsed ? Icons.expand_more : Icons.expand_less),
                  onPressed: onToggle,
                  tooltip: isCollapsed ? 'Expand' : 'Collapse',
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _personChip(BuildContext context, dynamic person) {
    return GestureDetector(
      onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
              builder: (_) => PersonDetailsScreen(personId: person.id))),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(person.name,
                style: const TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w600)),
            if (!person.isAlive) ...[
              const SizedBox(width: 4),
              const Icon(Icons.sentiment_dissatisfied,
                  size: 12, color: Colors.grey),
            ],
          ],
        ),
      ),
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
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 2, horizontal: 4),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              person.gender.name == 'male' ? Icons.male : Icons.female,
              size: 14,
              color: person.gender.name == 'male'
                  ? Colors.blue.shade600
                  : Colors.pink.shade400,
            ),
            const SizedBox(width: 4),
            Text(person.name,
                style: const TextStyle(fontSize: 13)),
            if (!person.isAlive) ...[
              const SizedBox(width: 4),
              Text('†',
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
            ],
          ],
        ),
      ),
    );
  }
}
