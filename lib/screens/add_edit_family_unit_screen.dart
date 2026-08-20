import 'package:flutter/material.dart';
import '../models/family_unit.dart';
import '../models/person.dart';
import '../theme/magnetic_colors.dart';
import '../theme/glass.dart';
import '../theme/magnetic_scaffold.dart';
import '../utils/app_state.dart';
import '../utils/date_utils.dart' as du;
import 'add_edit_person_screen.dart';

class AddEditFamilyUnitScreen extends StatefulWidget {
  final FamilyUnit? existingUnit;

  const AddEditFamilyUnitScreen({super.key, this.existingUnit});

  @override
  State<AddEditFamilyUnitScreen> createState() =>
      _AddEditFamilyUnitScreenState();
}

class _AddEditFamilyUnitScreenState extends State<AddEditFamilyUnitScreen> {
  String? _husbandId;
  String? _wifeId;
  DateTime? _anniversary;
  List<String> _childrenIds = [];

  bool get _isEdit => widget.existingUnit != null;

  @override
  void initState() {
    super.initState();
    final u = widget.existingUnit;
    if (u != null) {
      _husbandId = u.husbandId;
      _wifeId = u.wifeId;
      _anniversary = u.anniversaryDate;
      _childrenIds = List.from(u.childrenIds);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: AppState.instance,
      builder: (context, _) {
        final data = AppState.instance.data;
        return MagneticScaffold(
          appBar: AppBar(
            title: Text(_isEdit ? 'Edit Family Unit' : 'Add Family Unit'),
            actions: [
              TextButton(onPressed: _save, child: const Text('Save')),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 100, 16, 16),
            children: [
              _sectionHeader('Couple'),
              _personSelector(
                label: 'Husband',
                selectedId: _husbandId,
                isMale: true,
                onSelect: (id) => setState(() => _husbandId = id),
                onClear: () => setState(() => _husbandId = null),
                data: data,
              ),
              const SizedBox(height: 8),
              _personSelector(
                label: 'Wife',
                selectedId: _wifeId,
                isMale: false,
                onSelect: (id) => setState(() => _wifeId = id),
                onClear: () => setState(() => _wifeId = null),
                data: data,
              ),
              const SizedBox(height: 16),
              _sectionHeader('Anniversary'),
              _datePicker('Anniversary Date', _anniversary,
                  (d) => setState(() => _anniversary = d)),
              const SizedBox(height: 16),
              _sectionHeader('Children (${_childrenIds.length})'),
              ..._childrenIds.map((cId) {
                final p = data.people[cId];
                final isMale = p?.gender == Gender.male;
                return GlassPanel(
                  margin: const EdgeInsets.only(bottom: 6),
                  padding: EdgeInsets.zero,
                  child: ListTile(
                    dense: true,
                    leading: Icon(
                      isMale ? Icons.male : Icons.female,
                      color: MagneticColors.genderColor(isMale),
                    ),
                    title: Text(p?.name ?? '(unknown)'),
                    trailing: IconButton(
                      icon: const Icon(Icons.remove_circle_outline,
                          color: MagneticColors.rose),
                      onPressed: () => setState(() => _childrenIds.remove(cId)),
                    ),
                  ),
                );
              }),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.person_add_outlined),
                      label: const Text('Add Existing Child'),
                      onPressed: () => _selectExistingChild(data),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.add),
                      label: const Text('Create New Child'),
                      onPressed: _createNewChild,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: _save,
                icon: const Icon(Icons.save),
                label: Text(_isEdit ? 'Update Family' : 'Create Family'),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _sectionHeader(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(text,
          style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: MagneticColors.textPrimary)),
    );
  }

  Widget _personSelector({
    required String label,
    required String? selectedId,
    required bool isMale,
    required void Function(String) onSelect,
    required VoidCallback onClear,
    required dynamic data,
  }) {
    final person = selectedId != null ? data.people[selectedId] : null;
    final color = MagneticColors.genderColor(isMale);

    return GlassPanel(
      padding: EdgeInsets.zero,
      child: ListTile(
        leading: Icon(isMale ? Icons.male : Icons.female, color: color),
        title: Text(label),
        subtitle: Text(person?.name ?? 'Not selected'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (selectedId != null)
              IconButton(icon: const Icon(Icons.clear), onPressed: onClear),
            IconButton(
              icon: const Icon(Icons.search),
              onPressed: () => _selectPerson(data, label, onSelect),
            ),
          ],
        ),
      ),
    );
  }

  Widget _datePicker(
      String label, DateTime? current, void Function(DateTime?) onPick) {
    return InkWell(
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: current ?? DateTime(2000),
          firstDate: DateTime(1800),
          lastDate: DateTime.now(),
        );
        if (picked != null) onPick(picked);
      },
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: const Icon(Icons.calendar_today_outlined),
          suffixIcon: current != null
              ? IconButton(
                  icon: const Icon(Icons.clear), onPressed: () => onPick(null))
              : null,
        ),
        child: Text(
          current != null ? du.formatDate(current) : 'Tap to select (optional)',
          style: TextStyle(
              color: current != null
                  ? MagneticColors.textPrimary
                  : MagneticColors.textMuted),
        ),
      ),
    );
  }

  Future<void> _selectPerson(
      dynamic data, String role, void Function(String) onSelect) async {
    final people = (data.people.values.toList() as List<Person>)
      ..sort((a, b) => a.name.compareTo(b.name));

    final selected = await showSearch<Person?>(
      context: context,
      delegate: _PersonSearchDelegate(people),
    );
    if (selected != null) onSelect(selected.id);
  }

  Future<void> _selectExistingChild(dynamic data) async {
    final people = (data.people.values.toList() as List<Person>)
        .where((p) => !_childrenIds.contains(p.id))
        .toList()
      ..sort((a, b) => a.name.compareTo(b.name));

    final selected = await showSearch<Person?>(
      context: context,
      delegate: _PersonSearchDelegate(people),
    );
    if (selected != null && !_childrenIds.contains(selected.id)) {
      setState(() => _childrenIds.add(selected.id));
    }
  }

  Future<void> _createNewChild() async {
    await Navigator.push(context,
        MaterialPageRoute(builder: (_) => const AddEditPersonScreen()));
    // Pick the most recently added person
    final data = AppState.instance.data;
    final newPerson = data.peopleList.isNotEmpty ? data.peopleList.last : null;
    if (newPerson != null && !_childrenIds.contains(newPerson.id)) {
      setState(() => _childrenIds.add(newPerson.id));
    }
  }

  Future<void> _save() async {
    if (_husbandId == null && _wifeId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Please select at least a husband or wife')));
      return;
    }

    if (_isEdit) {
      final updated = widget.existingUnit!.copyWith(
        husbandId: _husbandId,
        wifeId: _wifeId,
        clearHusband: _husbandId == null,
        clearWife: _wifeId == null,
        anniversaryDate: _anniversary,
        clearAnniversary: _anniversary == null,
        childrenIds: _childrenIds,
      );
      await AppState.instance.updateFamilyUnit(updated);
    } else {
      await AppState.instance.addFamilyUnit(
        husbandId: _husbandId,
        wifeId: _wifeId,
        anniversaryDate: _anniversary,
        childrenIds: _childrenIds,
      );
    }

    if (mounted) Navigator.pop(context);
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
  Widget buildResults(BuildContext context) => _buildList(context);

  @override
  Widget buildSuggestions(BuildContext context) => _buildList(context);

  Widget _buildList(BuildContext context) {
    final filtered = people
        .where((p) => p.name.toLowerCase().contains(query.toLowerCase()))
        .toList();
    return ListView.builder(
      itemCount: filtered.length,
      itemBuilder: (_, i) {
        final p = filtered[i];
        final isMale = p.gender == Gender.male;
        return ListTile(
          leading: Icon(
            isMale ? Icons.male : Icons.female,
            color: MagneticColors.genderColor(isMale),
          ),
          title: Text(p.name),
          subtitle: Text(p.gender.name),
          onTap: () => close(context, p),
        );
      },
    );
  }
}
