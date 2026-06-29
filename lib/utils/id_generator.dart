import 'package:uuid/uuid.dart';

final _uuid = Uuid();

String generateId(String prefix) => '${prefix}_${_uuid.v4().replaceAll('-', '').substring(0, 8)}';

String personId() => generateId('person');
String familyUnitId() => generateId('family');
