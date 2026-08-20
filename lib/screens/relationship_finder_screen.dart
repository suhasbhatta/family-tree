import 'package:flutter/material.dart';
import '../models/person.dart';
import '../theme/magnetic_colors.dart';
import '../theme/glass.dart';
import '../theme/magnetic_scaffold.dart';
import '../utils/app_state.dart';
import '../services/relationship_service.dart';

class RelationshipFinderScreen extends StatefulWidget {
  const RelationshipFinderScreen({super.key});

  @override
  State<RelationshipFinderScreen> createState() =>
      _RelationshipFinderScreenState();
}

class _RelationshipFinderScreenState extends State<RelationshipFinderScreen> {
  Person? _personA;
  Person? _personB;
  List<String>? _results;
  bool _searching = false;

  @override
  Widget build(BuildContext context) {
    final data = AppState.instance.data;

    return MagneticScaffold(
      appBar: AppBar(title: const Text('Find Relationship')),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(16, 100, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Select two people to find how they are related.',
              style: TextStyle(color: MagneticColors.textSecondary),
            ),
            const SizedBox(height: 16),
            _personPicker('Person A', _personA, (p) {
              setState(() {
                _personA = p;
                _results = null;
              });
            }, data),
            const SizedBox(height: 12),
            const Center(
              child: Icon(Icons.compare_arrows, color: MagneticColors.cyan),
            ),
            const SizedBox(height: 12),
            _personPicker('Person B', _personB, (p) {
              setState(() {
                _personB = p;
                _results = null;
              });
            }, data),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: (_personA != null && _personB != null && !_searching)
                  ? _findRelationship
                  : null,
              icon: _searching
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: MagneticColors.void_),
                    )
                  : const Icon(Icons.search),
              label: Text(_searching ? 'Searching...' : 'Find Relationship'),
            ),
            const SizedBox(height: 20),
            if (_results != null) Expanded(child: _resultsWidget()),
          ],
        ),
      ),
    );
  }

  Widget _personPicker(String label, Person? selected,
      void Function(Person) onSelect, dynamic data) {
    final isMale = selected?.gender == Gender.male;
    return GlassPanel(
      padding: EdgeInsets.zero,
      child: ListTile(
        leading: selected == null
            ? const CircleAvatar(
                backgroundColor: MagneticColors.glassFill,
                child:
                    Icon(Icons.person_outline, color: MagneticColors.textMuted),
              )
            : GenderAvatar(isMale: isMale, radius: 18),
        title: Text(label,
            style:
                const TextStyle(fontSize: 12, color: MagneticColors.textMuted)),
        subtitle: Text(
          selected?.name ?? 'Tap to select...',
          style: TextStyle(
            fontWeight: selected != null ? FontWeight.w600 : FontWeight.normal,
            color: selected != null
                ? MagneticColors.textPrimary
                : MagneticColors.textMuted,
          ),
        ),
        trailing: const Icon(Icons.search, color: MagneticColors.textMuted),
        onTap: () => _selectPerson(data, onSelect),
      ),
    );
  }

  Widget _resultsWidget() {
    final results = _results!;

    if (results.isEmpty ||
        (results.length == 1 &&
            results.first == 'No known relationship found')) {
      return const GlassPanel(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off, size: 40, color: MagneticColors.textMuted),
            SizedBox(height: 8),
            Text('No relationship found between these two people.',
                textAlign: TextAlign.center,
                style: TextStyle(color: MagneticColors.textSecondary)),
          ],
        ),
      );
    }

    return GlassPanel(
      glowColor: MagneticColors.emerald,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.hub_outlined, color: MagneticColors.emerald),
              const SizedBox(width: 8),
              Text(
                '${results.length} relationship${results.length == 1 ? "" : "s"} found',
                style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: MagneticColors.textPrimary),
              ),
            ],
          ),
          const Divider(),
          Expanded(
            child: ListView.separated(
              itemCount: results.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: MagneticColors.cyan.withValues(alpha: 0.14),
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: MagneticColors.cyan.withValues(alpha: 0.4)),
                      ),
                      child: Text('${i + 1}',
                          style: const TextStyle(
                              fontSize: 11, color: MagneticColors.cyan)),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                        child: Text(results[i],
                            style: const TextStyle(
                                fontSize: 14,
                                color: MagneticColors.textPrimary))),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _selectPerson(
      dynamic data, void Function(Person) onSelect) async {
    final people = (data.people.values.toList() as List<Person>)
      ..sort((a, b) => a.name.compareTo(b.name));

    final selected = await showSearch<Person?>(
      context: context,
      delegate: _PersonSearchDelegate(people),
    );
    if (selected != null) onSelect(selected);
  }

  Future<void> _findRelationship() async {
    if (_personA == null || _personB == null) return;
    setState(() => _searching = true);

    // Run in next microtask to allow UI update
    await Future.microtask(() {
      final service = RelationshipService(AppState.instance.data);
      final results =
          service.findRelationships(_personA!.id, _personB!.id, maxDepth: 10);
      if (mounted) {
        setState(() {
          _results = results;
          _searching = false;
        });
      }
    });
  }
}

class _PersonSearchDelegate extends SearchDelegate<Person?> {
  final List<Person> people;
  _PersonSearchDelegate(this.people);

  @override
  List<Widget> buildActions(BuildContext context) => [
        IconButton(icon: const Icon(Icons.clear), onPressed: () => query = ''),
      ];

  @override
  Widget buildLeading(BuildContext context) => IconButton(
        icon: const Icon(Icons.arrow_back),
        onPressed: () => close(context, null),
      );

  @override
  Widget buildResults(BuildContext context) => _list(context);

  @override
  Widget buildSuggestions(BuildContext context) => _list(context);

  Widget _list(BuildContext context) {
    final filtered = people
        .where((p) => p.name.toLowerCase().contains(query.toLowerCase()))
        .toList();
    return ListView.builder(
      itemCount: filtered.length,
      itemBuilder: (_, i) {
        final p = filtered[i];
        final isMale = p.gender == Gender.male;
        return ListTile(
          leading: Icon(isMale ? Icons.male : Icons.female,
              color: MagneticColors.genderColor(isMale)),
          title: Text(p.name),
          onTap: () => close(context, p),
        );
      },
    );
  }
}
