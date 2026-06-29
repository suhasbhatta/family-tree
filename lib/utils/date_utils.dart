import 'package:intl/intl.dart';

final _fmt = DateFormat('dd MMM yyyy');

String formatDate(DateTime? d) => d != null ? _fmt.format(d) : '—';

String formatYear(DateTime? d) => d != null ? d.year.toString() : '—';
