import 'package:flutter/material.dart';
import '../models/person.dart';
import '../utils/date_utils.dart' as du;

class PersonCard extends StatelessWidget {
  final Person person;
  final VoidCallback? onTap;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final bool compact;

  const PersonCard({
    super.key,
    required this.person,
    this.onTap,
    this.onEdit,
    this.onDelete,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final genderIcon = _genderIcon(person.gender);
    final genderColor = _genderColor(person.gender, theme);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: genderColor.withOpacity(0.2),
                child: Icon(genderIcon, color: genderColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(person.name,
                            style: theme.textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.w600)),
                        if (!person.isAlive) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 1),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade300,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text('deceased',
                                style: theme.textTheme.labelSmall
                                    ?.copyWith(color: Colors.grey.shade700)),
                          ),
                        ],
                      ],
                    ),
                    if (!compact) ...[
                      const SizedBox(height: 2),
                      Text(
                        _subtitle(),
                        style: theme.textTheme.bodySmall
                            ?.copyWith(color: Colors.grey.shade600),
                      ),
                    ],
                  ],
                ),
              ),
              if (onEdit != null || onDelete != null)
                PopupMenuButton<String>(
                  onSelected: (v) {
                    if (v == 'edit') onEdit?.call();
                    if (v == 'delete') onDelete?.call();
                  },
                  itemBuilder: (_) => [
                    if (onEdit != null)
                      const PopupMenuItem(value: 'edit', child: Text('Edit')),
                    if (onDelete != null)
                      const PopupMenuItem(
                          value: 'delete', child: Text('Delete')),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  String _subtitle() {
    final parts = <String>[];
    if (person.dateOfBirth != null) parts.add('b. ${du.formatDate(person.dateOfBirth)}');
    if (person.dateOfDeath != null) parts.add('d. ${du.formatDate(person.dateOfDeath)}');
    if (person.currentPlaceOfResidence != null) {
      parts.add(person.currentPlaceOfResidence!);
    }
    return parts.join(' · ');
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

  Color _genderColor(Gender g, ThemeData theme) {
    switch (g) {
      case Gender.male:
        return Colors.blue.shade600;
      case Gender.female:
        return Colors.pink.shade400;
      default:
        return theme.colorScheme.primary;
    }
  }
}
