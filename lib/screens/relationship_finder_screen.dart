import 'package:flutter/material.dart';
import '../models/person.dart';
import '../utils/app_state.dart';
import '../services/relationship_service.dart';

class RelationshipFinderScreen extends StatefulWidget {
  const RelationshipFinderScreen({super.key});

  @override
  State<RelationshipFinderScreen> createState() =>
      _RelationshipFinderScreenState();
}

class _RelationshipFinderScreenState
    extends State<RelationshipFinderScreen> {
  Person? _personA;
  Person? _personB;
  List<String>? _results;
  bool _searching = false;

  @override
  Widget build(BuildContext context) {
    final data = AppState.instance.data;

    return Scaffold(
      appBar: AppBar(title: const Text('Find Relationship')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Select two people to find how they are related.',
              style: TextStyle(color: Colors.grey),
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
              child: Icon(Icons.compare_arrows, color: Colors.grey),
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
                          strokeWidth: 2, color: Colors.white),
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
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: selected == null
              ? Colors.grey.shade200
              : (selected.gender == Gender.male
                  ? Colors.blue.shade100
                  : Colors.pink.shade100),
          child: Icon(
            selected == null
                ? Icons.person_outline
                : (selected.gender == Gender.male ? Icons.male : Icons.female),
            color: selected == null
                ? Colors.grey
                : (selected.gender == Gender.male
                    ? Colors.blue.shade600
                    : Colors.pink.shade400),
          ),
        ),
        title: Text(label,
            style: const TextStyle(fontSize: 12, color: Colors.grey)),
        subtitle: Text(
          selected?.name ?? 'Tap to select...',
          style: TextStyle(
            fontWeight:
                selected != null ? FontWeight.w600 : FontWeight.normal,
            color: selected != null ? null : Colors.grey,
          ),
        ),
        trailing: const Icon(Icons.search),
        onTap: () => _selectPerson(data, onSelect),
      ),
    );
  }

  Widget _resultsWidget() {
    final results = _results!;

    if (results.isEmpty ||
        (results.length == 1 && results.first == 'No known relationship found')) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.search_off, size: 40, color: Colors.grey),
              SizedBox(height: 8),
              Text('No relationship found between these two people.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey)),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.family_restroom, color: Colors.green),
                const SizedBox(width: 8),
                Text(
                  '${results.length} relationship${results.length == 1 ? "" : "s"} found',
                  style: const TextStyle(fontWeight: FontWeight.bold),
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
                          color: Theme.of(context)
                              .colorScheme
                              .primary
                              .withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Text('${i + 1}',
                            style: TextStyle(
                                fontSize: 11,
                                color:
                                    Theme.of(context).colorScheme.primary)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                          child: Text(results[i],
                              style: const TextStyle(fontSize: 14))),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
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
      if (mounted) setState(() {
        _results = results;
        _searching = false;
      });
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
        return ListTile(
          leading: Icon(p.gender == Gender.male ? Icons.male : Icons.female),
          title: Text(p.name),
          onTap: () => close(context, p),
        );
      },
    );
  }
}
