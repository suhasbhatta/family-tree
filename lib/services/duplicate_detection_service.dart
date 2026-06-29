import '../models/family_tree_data.dart';
import '../models/person.dart';

class DuplicateDetectionService {
  static List<Person> findPotentialDuplicates(
      FamilyTreeData data, Person candidate, {String? excludeId}) {
    return data.people.values.where((p) {
      if (p.id == candidate.id) return false;
      if (excludeId != null && p.id == excludeId) return false;
      return _isSimilar(p, candidate);
    }).toList();
  }

  static bool _isSimilar(Person existing, Person candidate) {
    final nameSimilar = _nameSimilarity(existing.name, candidate.name) > 0.8;
    if (!nameSimilar) return false;

    if (existing.dateOfBirth != null && candidate.dateOfBirth != null) {
      return existing.dateOfBirth!.year == candidate.dateOfBirth!.year &&
          existing.dateOfBirth!.month == candidate.dateOfBirth!.month &&
          existing.dateOfBirth!.day == candidate.dateOfBirth!.day;
    }

    if (existing.contactNumber != null &&
        candidate.contactNumber != null &&
        existing.contactNumber!.isNotEmpty &&
        candidate.contactNumber!.isNotEmpty) {
      return existing.contactNumber == candidate.contactNumber;
    }

    return nameSimilar;
  }

  static double _nameSimilarity(String a, String b) {
    final an = a.toLowerCase().trim();
    final bn = b.toLowerCase().trim();
    if (an == bn) return 1.0;
    if (an.isEmpty || bn.isEmpty) return 0.0;

    // Check if one contains the other
    if (an.contains(bn) || bn.contains(an)) return 0.9;

    // Levenshtein similarity
    final distance = _levenshtein(an, bn);
    final maxLen = an.length > bn.length ? an.length : bn.length;
    return 1.0 - (distance / maxLen);
  }

  static int _levenshtein(String s, String t) {
    if (s == t) return 0;
    if (s.isEmpty) return t.length;
    if (t.isEmpty) return s.length;
    final d = List.generate(
        s.length + 1, (i) => List.generate(t.length + 1, (j) => 0));
    for (int i = 0; i <= s.length; i++) d[i][0] = i;
    for (int j = 0; j <= t.length; j++) d[0][j] = j;
    for (int i = 1; i <= s.length; i++) {
      for (int j = 1; j <= t.length; j++) {
        final cost = s[i - 1] == t[j - 1] ? 0 : 1;
        d[i][j] = [
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + cost,
        ].reduce((a, b) => a < b ? a : b);
      }
    }
    return d[s.length][t.length];
  }
}
