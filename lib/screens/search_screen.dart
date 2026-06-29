import 'package:flutter/material.dart';
import '../models/person.dart';
import '../utils/app_state.dart';
import 'person_details_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _ctrl = TextEditingController();
  List<Person> _results = [];

  @override
  void initState() {
    super.initState();
    _results = AppState.instance.data.peopleList;
    _ctrl.addListener(_onQuery);
  }

  @override
  void dispose() {
    _ctrl.removeListener(_onQuery);
    _ctrl.dispose();
    super.dispose();
  }

  void _onQuery() {
    final q = _ctrl.text.toLowerCase();
    final all = AppState.instance.data.peopleList;
    setState(() {
      if (q.isEmpty) {
        _results = all;
      } else {
        _results = all.where((p) {
          return p.name.toLowerCase().contains(q) ||
              (p.contactNumber?.toLowerCase().contains(q) ?? false) ||
              (p.currentPlaceOfResidence?.toLowerCase().contains(q) ?? false);
        }).toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _ctrl,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Search by name, contact, or location...',
            border: InputBorder.none,
          ),
        ),
        actions: [
          if (_ctrl.text.isNotEmpty)
            IconButton(
                icon: const Icon(Icons.clear),
                onPressed: () {
                  _ctrl.clear();
                }),
        ],
      ),
      body: _results.isEmpty
          ? const Center(child: Text('No results found'))
          : ListView.builder(
              itemCount: _results.length,
              itemBuilder: (_, i) {
                final p = _results[i];
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: p.gender == Gender.male
                        ? Colors.blue.shade100
                        : Colors.pink.shade100,
                    child: Icon(
                      p.gender == Gender.male ? Icons.male : Icons.female,
                      color: p.gender == Gender.male
                          ? Colors.blue.shade600
                          : Colors.pink.shade400,
                      size: 18,
                    ),
                  ),
                  title: Text(p.name),
                  subtitle: Text(p.currentPlaceOfResidence ?? p.gender.name),
                  trailing: p.isAlive
                      ? null
                      : const Icon(Icons.sentiment_dissatisfied,
                          color: Colors.grey, size: 16),
                  onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) =>
                              PersonDetailsScreen(personId: p.id))),
                );
              },
            ),
    );
  }
}
