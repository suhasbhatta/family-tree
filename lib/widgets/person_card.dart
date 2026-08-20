import 'package:flutter/material.dart';
import '../models/person.dart';
import '../theme/magnetic_colors.dart';
import '../theme/glass.dart';
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
    final isMale = person.gender == Gender.male;

    return GlassPanel(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      padding: EdgeInsets.zero,
      borderRadius: BorderRadius.circular(16),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                GenderAvatar(isMale: isMale, radius: 18),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(person.name, style: theme.textTheme.titleMedium),
                          if (!person.isAlive) ...[
                            const SizedBox(width: 6),
                            const GlowBadge(
                                text: 'DECEASED',
                                color: MagneticColors.textMuted),
                          ],
                        ],
                      ),
                      if (!compact) ...[
                        const SizedBox(height: 2),
                        Text(
                          _subtitle(),
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ],
                  ),
                ),
                if (onEdit != null || onDelete != null)
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert,
                        color: MagneticColors.textMuted, size: 20),
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
      ),
    );
  }

  String _subtitle() {
    final parts = <String>[];
    if (person.dateOfBirth != null) {
      parts.add('b. ${du.formatDate(person.dateOfBirth)}');
    }
    if (person.dateOfDeath != null) {
      parts.add('d. ${du.formatDate(person.dateOfDeath)}');
    }
    if (person.currentPlaceOfResidence != null) {
      parts.add(person.currentPlaceOfResidence!);
    }
    return parts.join(' · ');
  }
}
