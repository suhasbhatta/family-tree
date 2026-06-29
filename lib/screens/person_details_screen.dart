import 'package:flutter/material.dart';
import '../models/person.dart';
import '../utils/app_state.dart';
import '../utils/date_utils.dart' as du;
import '../services/relationship_service.dart';
import 'add_edit_person_screen.dart';

class PersonDetailsScreen extends StatelessWidget {
  final String personId;

  const PersonDetailsScreen({super.key, required this.personId});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: AppState.instance,
      builder: (context, _) {
        final data = AppState.instance.data;
        final person = data.people[personId];

        if (person == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Person Details')),
            body: const Center(child: Text('Person not found')),
          );
        }

        final relService = RelationshipService(data);
        final identities = relService.getPersonIdentities(personId);

        return Scaffold(
          appBar: AppBar(
            title: Text(person.name),
            actions: [
              IconButton(
                icon: const Icon(Icons.edit),
                onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) =>
                            AddEditPersonScreen(existingPerson: person))),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline),
                onPressed: () => _confirmDelete(context, person),
              ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _headerCard(context, person),
              const SizedBox(height: 12),
              _infoCard(person),
              if (identities.isNotEmpty) ...[
                const SizedBox(height: 12),
                _identitiesCard(context, identities, data),
              ],
              const SizedBox(height: 12),
              _familyUnitsCard(context, person, relService),
            ],
          ),
        );
      },
    );
  }

  Widget _headerCard(BuildContext context, Person person) {
    final theme = Theme.of(context);
    final genderColor = _genderColor(person.gender);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            CircleAvatar(
              radius: 36,
              backgroundColor: genderColor.withOpacity(0.15),
              child: Icon(_genderIcon(person.gender),
                  size: 40, color: genderColor),
            ),
            const SizedBox(height: 12),
            Text(person.name,
                style: theme.textTheme.headlineSmall
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _badge(person.gender.name.toUpperCase(),
                    genderColor.withOpacity(0.15), genderColor),
                const SizedBox(width: 8),
                _badge(
                  person.isAlive ? 'ALIVE' : 'DECEASED',
                  person.isAlive
                      ? Colors.green.shade50
                      : Colors.grey.shade200,
                  person.isAlive
                      ? Colors.green.shade700
                      : Colors.grey.shade600,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoCard(Person person) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Details',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const Divider(),
            _infoRow(Icons.cake_outlined, 'Date of Birth',
                du.formatDate(person.dateOfBirth)),
            if (!person.isAlive)
              _infoRow(Icons.sentiment_dissatisfied_outlined, 'Date of Death',
                  du.formatDate(person.dateOfDeath)),
            if (person.contactNumber != null && person.contactNumber!.isNotEmpty)
              _infoRow(Icons.phone_outlined, 'Contact',
                  person.contactNumber!),
            if (person.currentPlaceOfResidence != null &&
                person.currentPlaceOfResidence!.isNotEmpty)
              _infoRow(Icons.location_on_outlined, 'Residence',
                  person.currentPlaceOfResidence!),
          ],
        ),
      ),
    );
  }

  Widget _identitiesCard(BuildContext context,
      Map<String, List<Person>> identities, dynamic data) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Relationships',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const Divider(),
            ...identities.entries.map((entry) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(entry.key,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            color: Colors.grey,
                            fontSize: 13)),
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: entry.value
                          .map((p) => GestureDetector(
                                onTap: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                        builder: (_) => PersonDetailsScreen(
                                            personId: p.id))),
                                child: Chip(
                                  label: Text(p.name),
                                  avatar: Icon(
                                    _genderIcon(p.gender),
                                    size: 14,
                                  ),
                                ),
                              ))
                          .toList(),
                    ),
                    const SizedBox(height: 8),
                  ],
                )),
          ],
        ),
      ),
    );
  }

  Widget _familyUnitsCard(
      BuildContext context, Person person, RelationshipService relService) {
    final units = relService.getFamilyUnitsForPerson(person.id);
    if (units.isEmpty) return const SizedBox();
    final data = AppState.instance.data;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Family Units',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const Divider(),
            ...units.map((fu) {
              final h = fu.husbandId != null ? data.people[fu.husbandId!] : null;
              final w = fu.wifeId != null ? data.people[fu.wifeId!] : null;
              String role = 'Member';
              if (fu.husbandId == person.id) role = 'Husband';
              if (fu.wifeId == person.id) role = 'Wife';
              if (fu.childrenIds.contains(person.id)) role = 'Child';

              return ListTile(
                dense: true,
                leading: const Icon(Icons.family_restroom, size: 18),
                title: Text(_coupleLabel(h?.name, w?.name)),
                subtitle: Text('Role: $role · ${fu.childrenIds.length} children'),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: Colors.grey),
          const SizedBox(width: 8),
          Text('$label: ', style: const TextStyle(color: Colors.grey)),
          Expanded(
              child: Text(value,
                  style: const TextStyle(fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }

  Widget _badge(String text, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration:
          BoxDecoration(color: bg, borderRadius: BorderRadius.circular(4)),
      child: Text(text,
          style: TextStyle(
              color: fg, fontSize: 11, fontWeight: FontWeight.w600)),
    );
  }

  IconData _genderIcon(Gender g) {
    switch (g) {
      case Gender.male:
        return Icons.male;
      case Gender.female:
        return Icons.female;
      default:
        return Icons.person;
    }
  }

  Color _genderColor(Gender g) {
    switch (g) {
      case Gender.male:
        return Colors.blue.shade600;
      case Gender.female:
        return Colors.pink.shade400;
      default:
        return Colors.purple.shade400;
    }
  }

  String _coupleLabel(String? h, String? w) {
    if (h != null && w != null) return '$h & $w';
    if (h != null) return '$h & (unknown)';
    if (w != null) return '(unknown) & $w';
    return 'Unknown';
  }

  void _confirmDelete(BuildContext context, Person person) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Person'),
        content: Text(
            'Are you sure you want to delete "${person.name}"? '
            'This will also remove them from all family units.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirm == true) {
      await AppState.instance.deletePerson(person.id);
      if (context.mounted) Navigator.pop(context);
    }
  }
}
