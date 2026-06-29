import 'package:flutter/material.dart';
import '../models/person.dart';
import '../utils/app_state.dart';
import '../utils/date_utils.dart' as du;
import '../services/duplicate_detection_service.dart';

class AddEditPersonScreen extends StatefulWidget {
  final Person? existingPerson;

  const AddEditPersonScreen({super.key, this.existingPerson});

  @override
  State<AddEditPersonScreen> createState() => _AddEditPersonScreenState();
}

class _AddEditPersonScreenState extends State<AddEditPersonScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _contactCtrl = TextEditingController();
  final _residenceCtrl = TextEditingController();

  Gender _gender = Gender.unknown;
  DateTime? _dob;
  DateTime? _dod;
  bool _isAlive = true;

  bool get _isEdit => widget.existingPerson != null;

  @override
  void initState() {
    super.initState();
    final p = widget.existingPerson;
    if (p != null) {
      _nameCtrl.text = p.name;
      _gender = p.gender;
      _dob = p.dateOfBirth;
      _dod = p.dateOfDeath;
      _isAlive = p.isAlive;
      _contactCtrl.text = p.contactNumber ?? '';
      _residenceCtrl.text = p.currentPlaceOfResidence ?? '';
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _contactCtrl.dispose();
    _residenceCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Edit Person' : 'Add Person'),
        actions: [
          TextButton(
            onPressed: _save,
            child: const Text('Save'),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameCtrl,
              decoration: const InputDecoration(
                labelText: 'Name *',
                prefixIcon: Icon(Icons.person_outline),
                border: OutlineInputBorder(),
              ),
              textCapitalization: TextCapitalization.words,
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Name is required' : null,
            ),
            const SizedBox(height: 16),
            _genderSelector(),
            const SizedBox(height: 16),
            _aliveToggle(),
            const SizedBox(height: 16),
            _datePicker('Date of Birth', _dob, (d) => setState(() => _dob = d)),
            const SizedBox(height: 16),
            if (!_isAlive)
              _datePicker(
                  'Date of Death', _dod, (d) => setState(() => _dod = d)),
            if (!_isAlive) const SizedBox(height: 16),
            TextFormField(
              controller: _contactCtrl,
              decoration: const InputDecoration(
                labelText: 'Contact Number',
                prefixIcon: Icon(Icons.phone_outlined),
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _residenceCtrl,
              decoration: const InputDecoration(
                labelText: 'Current Place of Residence',
                prefixIcon: Icon(Icons.location_on_outlined),
                border: OutlineInputBorder(),
              ),
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _save,
              icon: const Icon(Icons.save),
              label: Text(_isEdit ? 'Update Person' : 'Add Person'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _genderSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Gender', style: TextStyle(color: Colors.grey, fontSize: 12)),
        const SizedBox(height: 4),
        SegmentedButton<Gender>(
          segments: const [
            ButtonSegment(value: Gender.male, label: Text('Male'), icon: Icon(Icons.male)),
            ButtonSegment(value: Gender.female, label: Text('Female'), icon: Icon(Icons.female)),
            ButtonSegment(value: Gender.other, label: Text('Other')),
            ButtonSegment(value: Gender.unknown, label: Text('Unknown')),
          ],
          selected: {_gender},
          onSelectionChanged: (s) => setState(() => _gender = s.first),
          showSelectedIcon: false,
        ),
      ],
    );
  }

  Widget _aliveToggle() {
    return Card(
      child: SwitchListTile(
        title: const Text('Currently Alive'),
        subtitle: Text(_isAlive ? 'Person is alive' : 'Person is deceased'),
        value: _isAlive,
        onChanged: (v) {
          setState(() {
            _isAlive = v;
            if (v) _dod = null;
          });
        },
      ),
    );
  }

  Widget _datePicker(
      String label, DateTime? current, void Function(DateTime?) onPick) {
    return InkWell(
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: current ?? DateTime(1980),
          firstDate: DateTime(1800),
          lastDate: DateTime.now(),
          helpText: 'Select $label',
        );
        if (picked != null) onPick(picked);
      },
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: const Icon(Icons.calendar_today_outlined),
          border: const OutlineInputBorder(),
          suffixIcon: current != null
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () => onPick(null),
                )
              : null,
        ),
        child: Text(
          current != null ? du.formatDate(current) : 'Tap to select',
          style: TextStyle(
              color: current != null ? null : Colors.grey.shade500),
        ),
      ),
    );
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final name = _nameCtrl.text.trim();
    final contact = _contactCtrl.text.trim();
    final residence = _residenceCtrl.text.trim();

    // Check duplicates
    final candidate = Person(
      id: widget.existingPerson?.id ?? '',
      name: name,
      gender: _gender,
      dateOfBirth: _dob,
      dateOfDeath: _isAlive ? null : _dod,
      isAlive: _isAlive,
      contactNumber: contact.isEmpty ? null : contact,
      currentPlaceOfResidence: residence.isEmpty ? null : residence,
    );

    final dupes = DuplicateDetectionService.findPotentialDuplicates(
      AppState.instance.data,
      candidate,
      excludeId: widget.existingPerson?.id,
    );

    if (dupes.isNotEmpty && mounted) {
      final proceed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Possible Duplicate'),
          content: Text(
            'Similar people found:\n${dupes.map((p) => '• ${p.name}').join('\n')}\n\nSave anyway?',
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancel')),
            FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Save Anyway')),
          ],
        ),
      );
      if (proceed != true) return;
    }

    if (_isEdit) {
      final updated = widget.existingPerson!.copyWith(
        name: name,
        gender: _gender,
        dateOfBirth: _dob,
        dateOfDeath: _isAlive ? null : _dod,
        clearDateOfDeath: _isAlive,
        isAlive: _isAlive,
        contactNumber: contact.isEmpty ? null : contact,
        clearContact: contact.isEmpty,
        currentPlaceOfResidence: residence.isEmpty ? null : residence,
        clearResidence: residence.isEmpty,
      );
      await AppState.instance.updatePerson(updated);
    } else {
      await AppState.instance.addPerson(
        name: name,
        gender: _gender,
        dateOfBirth: _dob,
        dateOfDeath: _isAlive ? null : _dod,
        isAlive: _isAlive,
        contactNumber: contact.isEmpty ? null : contact,
        currentPlaceOfResidence: residence.isEmpty ? null : residence,
      );
    }

    if (mounted) Navigator.pop(context);
  }
}
