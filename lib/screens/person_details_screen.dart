import 'package:flutter/material.dart';
import '../models/person.dart';
import '../theme/magnetic_colors.dart';
import '../theme/glass.dart';
import '../theme/magnetic_scaffold.dart';
import '../utils/app_state.dart';
import '../utils/auth_service.dart';
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
          return MagneticScaffold(
            appBar: AppBar(title: const Text('Person Details')),
            body: const Center(
                child: Text('Person not found',
                    style: TextStyle(color: MagneticColors.textSecondary))),
          );
        }

        final relService = RelationshipService(data);
        final identities = relService.getPersonIdentities(personId);

        final isAdmin = AuthService.instance.isAdmin;
        final canEdit = AppState.instance.canEditPerson(personId);

        return MagneticScaffold(
          appBar: AppBar(
            title: Text(person.name),
            actions: [
              if (canEdit)
                IconButton(
                  icon: const Icon(Icons.edit),
                  tooltip: 'Edit profile',
                  onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) =>
                              AddEditPersonScreen(existingPerson: person))),
                ),
              if (isAdmin)
                IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => _confirmDelete(context, person),
                ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 100, 16, 16),
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
    final isMale = person.gender == Gender.male;
    final genderColor = MagneticColors.genderColor(isMale);

    return GlassPanel(
      padding: const EdgeInsets.all(24),
      glowColor: genderColor,
      child: Column(
        children: [
          GenderAvatar(isMale: isMale, radius: 36),
          const SizedBox(height: 14),
          Text(person.name, style: theme.textTheme.headlineSmall),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              GlowBadge(
                text: person.gender.name.toUpperCase(),
                color: genderColor,
              ),
              const SizedBox(width: 8),
              GlowBadge(
                text: person.isAlive ? 'ALIVE' : 'DECEASED',
                color: person.isAlive
                    ? MagneticColors.emerald
                    : MagneticColors.textMuted,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _infoCard(Person person) {
    return GlassPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Details',
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: MagneticColors.textPrimary)),
          const Divider(),
          _infoRow(Icons.cake_outlined, 'Date of Birth',
              du.formatDate(person.dateOfBirth)),
          if (!person.isAlive)
            _infoRow(Icons.sentiment_dissatisfied_outlined, 'Date of Death',
                du.formatDate(person.dateOfDeath)),
          if (person.contactNumber != null && person.contactNumber!.isNotEmpty)
            _infoRow(Icons.phone_outlined, 'Contact', person.contactNumber!),
          if (person.currentPlaceOfResidence != null &&
              person.currentPlaceOfResidence!.isNotEmpty)
            _infoRow(Icons.location_on_outlined, 'Residence',
                person.currentPlaceOfResidence!),
        ],
      ),
    );
  }

  Widget _identitiesCard(BuildContext context,
      Map<String, List<Person>> identities, dynamic data) {
    return GlassPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Relationships',
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: MagneticColors.textPrimary)),
          const Divider(),
          ...identities.entries.map((entry) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(entry.key,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          color: MagneticColors.textMuted,
                          fontSize: 13)),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: entry.value
                        .map((p) => _relationChip(context, p))
                        .toList(),
                  ),
                  const SizedBox(height: 8),
                ],
              )),
        ],
      ),
    );
  }

  Widget _relationChip(BuildContext context, Person p) {
    final isMale = p.gender == Gender.male;
    final color = MagneticColors.genderColor(isMale);
    return GestureDetector(
      onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
              builder: (_) => PersonDetailsScreen(personId: p.id))),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.4)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(isMale ? Icons.male : Icons.female, size: 14, color: color),
            const SizedBox(width: 6),
            Text(p.name,
                style: const TextStyle(
                    fontSize: 12, color: MagneticColors.textPrimary)),
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

    return GlassPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Family Units',
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: MagneticColors.textPrimary)),
          const Divider(),
          ...units.map((fu) {
            final h = fu.husbandId != null ? data.people[fu.husbandId!] : null;
            final w = fu.wifeId != null ? data.people[fu.wifeId!] : null;
            String role = 'Member';
            if (fu.husbandId == person.id) role = 'Husband';
            if (fu.wifeId == person.id) role = 'Wife';
            if (fu.childrenIds.contains(person.id)) role = 'Child';

            return ListTile(
              contentPadding: EdgeInsets.zero,
              dense: true,
              leading:
                  const Icon(Icons.link, size: 18, color: MagneticColors.cyan),
              title: Text(_coupleLabel(h?.name, w?.name)),
              subtitle: Text('Role: $role · ${fu.childrenIds.length} children'),
            );
          }),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: MagneticColors.textMuted),
          const SizedBox(width: 8),
          Text('$label: ',
              style: const TextStyle(color: MagneticColors.textMuted)),
          Expanded(
              child: Text(value,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      color: MagneticColors.textPrimary))),
        ],
      ),
    );
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
        content: Text('Are you sure you want to delete "${person.name}"? '
            'This will also remove them from all family units.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: MagneticColors.rose),
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
