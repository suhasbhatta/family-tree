# family-tree

An offline-first mobile app for creating, viewing, and sharing a family tree. Everything is stored locally on your device — no cloud, no login, no internet required.

## Features

- **Full offline operation** — all data lives in a local JSON file on your device
- **Family tree view** — expandable/collapsible tree starting from a root family unit, with zoom and pan
- **People** — add, edit, delete with name, gender, DOB, DOD, contact, and residence
- **Family units** — model couples (husband + wife) and their children; supports multiple wives, missing spouses, and a person appearing in multiple units
- **Relationship finder** — pick any two people and the app derives all relationship paths (father, grandfather, uncle, son-in-law, sibling-in-law, etc.) with gender-aware labels
- **Derived identities** — person details screen shows every role a person plays across the whole tree
- **Search** — find people by name, contact number, or place of residence
- **Duplicate detection** — warns when you try to create a person with a similar name and DOB
- **Import / Export / Share** — export the full tree as a `.json` file, share it via Android's native share sheet, and import it on another device (replace or merge)

## Data model

```
Person
  id, name, gender (male/female/other/unknown)
  dateOfBirth, dateOfDeath, isAlive
  contactNumber, currentPlaceOfResidence

FamilyUnit
  id
  husbandId?, wifeId?          ← optional (unknown spouse allowed)
  anniversaryDate?
  childrenIds[]                ← references person IDs, no duplication
```

A person is stored once. They can be a child in one family unit and a husband/wife in another. Roles (father, son, uncle, grandfather…) are derived at runtime from the relationship graph, not stored.

## Building the APK

### Prerequisites

- [Flutter SDK](https://docs.flutter.dev/get-started/install) ≥ 3.0
- Android SDK with build tools (via Android Studio or `sdkmanager`)
- Java 11+

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/suhasbhatta/family-tree.git
cd family-tree

# 2. Fetch dependencies
flutter pub get

# 3. Run tests
flutter test

# 4. Build release APK
flutter build apk --release
```

The APK will be at:

```
build/app/outputs/flutter-apk/app-release.apk
```

Install on a device:

```bash
adb install build/app/outputs/flutter-apk/app-release.apk
```

Or copy the APK file directly to your Android device and open it (enable "Install from unknown sources" if needed).

## Permissions

The app requests **no internet permission**. The only implicit permissions used are:

- Storage access via Android's built-in document picker (for importing JSON files)
- Share sheet (for exporting)

## Project structure

```
lib/
  main.dart                          ← app entry, Material theme
  models/
    person.dart                      ← Person model + Gender enum
    family_unit.dart                 ← FamilyUnit model
    family_tree_data.dart            ← top-level data container
  services/
    local_storage_service.dart       ← read/write JSON to device storage
    import_export_service.dart       ← file picker, share sheet, merge logic
    relationship_service.dart        ← graph traversal, label derivation
    duplicate_detection_service.dart ← Levenshtein-based similarity check
  screens/
    home_screen.dart
    tree_view_screen.dart
    person_details_screen.dart
    add_edit_person_screen.dart
    add_edit_family_unit_screen.dart
    search_screen.dart
    relationship_finder_screen.dart
  widgets/
    person_card.dart
    family_unit_card.dart
  utils/
    app_state.dart                   ← ChangeNotifier singleton, all mutations
    date_utils.dart
    id_generator.dart                ← UUID-based local IDs
test/
  models/                            ← person, family_unit, family_tree_data tests
  services/                          ← relationship service, duplicate detection tests
```

## Export file format

```json
{
  "appVersion": 1,
  "selectedRootFamilyUnitId": "family_abc123",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-06-29T12:00:00.000Z",
  "people": [
    {
      "id": "person_abc123",
      "name": "Ramesh",
      "gender": "male",
      "dateOfBirth": "1970-01-01",
      "dateOfDeath": null,
      "isAlive": true,
      "contactNumber": "9999999999",
      "currentPlaceOfResidence": "Pune, Maharashtra"
    }
  ],
  "familyUnits": [
    {
      "id": "family_def456",
      "husbandId": "person_abc123",
      "wifeId": "person_xyz789",
      "anniversaryDate": "1995-02-10",
      "childrenIds": ["person_ghi012"]
    }
  ]
}
```

## Dependencies

| Package | Purpose |
|---|---|
| `path_provider` | Local document directory path |
| `share_plus` | Native Android share sheet |
| `file_picker` | Document picker for JSON import |
| `uuid` | Local ID generation |
| `intl` | Date formatting |
| `collection` | List/map utilities |

## Planned future improvements

- Photos per person
- Notes / biography
- Address history
- Multiple independent family trees
- Divorce / separation dates and marriage location
- Password-protected local file
- PDF export and print-friendly tree view
- Image export of tree diagram

## License

MIT
