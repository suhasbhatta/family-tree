import 'package:flutter/material.dart';
import '../models/family_unit.dart';
import '../models/family_tree_data.dart';
import '../theme/magnetic_colors.dart';
import '../theme/glass.dart';
import '../utils/date_utils.dart' as du;

class FamilyUnitCard extends StatelessWidget {
  final FamilyUnit unit;
  final FamilyTreeData data;
  final VoidCallback? onTap;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final VoidCallback? onSetRoot;

  const FamilyUnitCard({
    super.key,
    required this.unit,
    required this.data,
    this.onTap,
    this.onEdit,
    this.onDelete,
    this.onSetRoot,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final husband =
        unit.husbandId != null ? data.people[unit.husbandId!] : null;
    final wife = unit.wifeId != null ? data.people[unit.wifeId!] : null;
    final isRoot = data.selectedRootFamilyUnitId == unit.id;

    return GlassPanel(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      padding: EdgeInsets.zero,
      borderRadius: BorderRadius.circular(16),
      glowColor: isRoot ? MagneticColors.emerald : null,
      borderColor: isRoot
          ? MagneticColors.emerald.withValues(alpha: 0.5)
          : MagneticColors.glassBorder,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.link,
                        color: MagneticColors.cyan, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _coupleLabel(husband?.name, wife?.name),
                        style: theme.textTheme.titleMedium,
                      ),
                    ),
                    if (isRoot) ...[
                      const GlowBadge(
                          text: 'ROOT', color: MagneticColors.emerald),
                      const SizedBox(width: 4),
                    ],
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert,
                          color: MagneticColors.textMuted, size: 20),
                      onSelected: (v) {
                        if (v == 'edit') onEdit?.call();
                        if (v == 'delete') onDelete?.call();
                        if (v == 'root') onSetRoot?.call();
                      },
                      itemBuilder: (_) => [
                        if (onEdit != null)
                          const PopupMenuItem(
                              value: 'edit', child: Text('Edit')),
                        if (onSetRoot != null && !isRoot)
                          const PopupMenuItem(
                              value: 'root', child: Text('Set as root')),
                        if (onDelete != null)
                          const PopupMenuItem(
                              value: 'delete', child: Text('Delete')),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 12,
                  children: [
                    if (unit.anniversaryDate != null)
                      _chip(
                          Icons.favorite,
                          'Married ${du.formatDate(unit.anniversaryDate)}',
                          MagneticColors.rose),
                    _chip(
                        Icons.child_care,
                        '${unit.childrenIds.length} child${unit.childrenIds.length == 1 ? "" : "ren"}',
                        MagneticColors.emerald),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _coupleLabel(String? h, String? w) {
    if (h != null && w != null) return '$h & $w';
    if (h != null) return '$h & (wife unknown)';
    if (w != null) return '(husband unknown) & $w';
    return '(Unknown couple)';
  }

  Widget _chip(IconData icon, String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(label,
            style: const TextStyle(
                fontSize: 12, color: MagneticColors.textSecondary)),
      ],
    );
  }
}
