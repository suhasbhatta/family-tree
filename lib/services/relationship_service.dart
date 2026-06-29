import '../models/family_tree_data.dart';
import '../models/family_unit.dart';
import '../models/person.dart';

// Graph edge types used for path traversal
enum EdgeType { spouse, parent, child }

class GraphEdge {
  final String fromId;
  final String toId;
  final EdgeType type;
  final String? familyUnitId;

  const GraphEdge({
    required this.fromId,
    required this.toId,
    required this.type,
    this.familyUnitId,
  });
}

class RelationshipPath {
  final List<GraphEdge> edges;
  final String description;

  const RelationshipPath({required this.edges, required this.description});
}

class RelationshipService {
  final FamilyTreeData _data;

  RelationshipService(this._data);

  // Build full bidirectional graph
  Map<String, List<GraphEdge>> buildGraph() {
    final graph = <String, List<GraphEdge>>{};

    void addEdge(GraphEdge e) {
      graph.putIfAbsent(e.fromId, () => []).add(e);
    }

    for (final unit in _data.familyUnits.values) {
      final hId = unit.husbandId;
      final wId = unit.wifeId;

      if (hId != null && wId != null) {
        addEdge(GraphEdge(
            fromId: hId, toId: wId, type: EdgeType.spouse, familyUnitId: unit.id));
        addEdge(GraphEdge(
            fromId: wId, toId: hId, type: EdgeType.spouse, familyUnitId: unit.id));
      }

      for (final childId in unit.childrenIds) {
        if (hId != null) {
          addEdge(GraphEdge(
              fromId: hId, toId: childId, type: EdgeType.child, familyUnitId: unit.id));
          addEdge(GraphEdge(
              fromId: childId, toId: hId, type: EdgeType.parent, familyUnitId: unit.id));
        }
        if (wId != null) {
          addEdge(GraphEdge(
              fromId: wId, toId: childId, type: EdgeType.child, familyUnitId: unit.id));
          addEdge(GraphEdge(
              fromId: childId, toId: wId, type: EdgeType.parent, familyUnitId: unit.id));
        }
      }
    }

    return graph;
  }

  List<String> getSpouseIds(String personId) {
    final result = <String>[];
    for (final unit in _data.familyUnits.values) {
      if (unit.husbandId == personId && unit.wifeId != null) {
        result.add(unit.wifeId!);
      } else if (unit.wifeId == personId && unit.husbandId != null) {
        result.add(unit.husbandId!);
      }
    }
    return result;
  }

  List<String> getChildIds(String personId) {
    final result = <String>{};
    for (final unit in _data.familyUnits.values) {
      if (unit.husbandId == personId || unit.wifeId == personId) {
        result.addAll(unit.childrenIds);
      }
    }
    return result.toList();
  }

  List<String> getParentIds(String personId) {
    final result = <String>{};
    for (final unit in _data.familyUnits.values) {
      if (unit.childrenIds.contains(personId)) {
        if (unit.husbandId != null) result.add(unit.husbandId!);
        if (unit.wifeId != null) result.add(unit.wifeId!);
      }
    }
    return result.toList();
  }

  List<String> getSiblingIds(String personId) {
    final result = <String>{};
    for (final unit in _data.familyUnits.values) {
      if (unit.childrenIds.contains(personId)) {
        for (final child in unit.childrenIds) {
          if (child != personId) result.add(child);
        }
      }
    }
    return result.toList();
  }

  List<FamilyUnit> getFamilyUnitsForPerson(String personId) {
    return _data.familyUnits.values.where((u) {
      return u.husbandId == personId ||
          u.wifeId == personId ||
          u.childrenIds.contains(personId);
    }).toList();
  }

  // Returns all relationship descriptions between two people
  List<String> findRelationships(String aId, String bId,
      {int maxDepth = 10}) {
    if (aId == bId) return ['Same person'];
    final graph = buildGraph();
    final paths = _findAllPaths(graph, aId, bId, maxDepth);
    final descriptions = <String>{};
    for (final path in paths) {
      final desc = _describePathFrom(aId, path);
      if (desc != null) descriptions.add(desc);
    }
    if (descriptions.isEmpty) return ['No known relationship found'];
    final sorted = descriptions.toList()
      ..sort((a, b) => a.length.compareTo(b.length));
    return sorted;
  }

  List<List<GraphEdge>> _findAllPaths(
      Map<String, List<GraphEdge>> graph, String start, String end, int maxDepth) {
    final results = <List<GraphEdge>>[];
    final visited = <String>{};

    void dfs(String current, List<GraphEdge> path) {
      if (path.length > maxDepth) return;
      if (current == end) {
        results.add(List.from(path));
        return;
      }
      visited.add(current);
      for (final edge in graph[current] ?? []) {
        if (!visited.contains(edge.toId)) {
          path.add(edge);
          dfs(edge.toId, path);
          path.removeLast();
        }
      }
      visited.remove(current);
    }

    dfs(start, []);
    return results;
  }

  String? _describePathFrom(String startId, List<GraphEdge> path) {
    if (path.isEmpty) return null;

    final startPerson = _data.people[startId];
    final endId = path.last.toId;
    final endPerson = _data.people[endId];
    if (startPerson == null || endPerson == null) return null;

    final label = _pathToLabel(startId, path);
    if (label == null) return null;

    return '${startPerson.name} is $label of ${endPerson.name}';
  }

  String? _pathToLabel(String startId, List<GraphEdge> edges) {
    if (edges.isEmpty) return null;

    // Direct relationships
    if (edges.length == 1) {
      final e = edges.first;
      final target = _data.people[e.toId];
      if (target == null) return null;
      switch (e.type) {
        case EdgeType.spouse:
          return _spouseLabel(target.gender);
        case EdgeType.child:
          return _childLabel(target.gender);
        case EdgeType.parent:
          return _parentLabel(target.gender);
      }
    }

    if (edges.length == 2) {
      final e1 = edges[0];
      final e2 = edges[1];
      final mid = _data.people[e1.toId];
      final end = _data.people[e2.toId];
      if (mid == null || end == null) return null;

      // parent → parent = grandparent
      if (e1.type == EdgeType.parent && e2.type == EdgeType.parent) {
        return _grandparentLabel(end.gender);
      }
      // child → child = grandchild
      if (e1.type == EdgeType.child && e2.type == EdgeType.child) {
        return _grandchildLabel(end.gender);
      }
      // sibling: child → child via same parent path
      if (e1.type == EdgeType.parent && e2.type == EdgeType.child) {
        return _siblingLabel(end.gender);
      }
      // uncle/aunt: parent → sibling
      if (e1.type == EdgeType.parent && e2.type == EdgeType.spouse) {
        return 'step-${_parentLabel(end.gender)}';
      }
      // spouse → child = step-child
      if (e1.type == EdgeType.spouse && e2.type == EdgeType.child) {
        return 'step-${_childLabel(end.gender)}';
      }
      // child → spouse = child-in-law
      if (e1.type == EdgeType.child && e2.type == EdgeType.spouse) {
        return _childInLawLabel(end.gender);
      }
      // spouse → parent = parent-in-law
      if (e1.type == EdgeType.spouse && e2.type == EdgeType.parent) {
        return _parentInLawLabel(end.gender);
      }
      // parent → spouse = parent's spouse (step-parent)
      if (e1.type == EdgeType.parent && e2.type == EdgeType.spouse) {
        return 'step-${_parentLabel(end.gender)}';
      }
    }

    if (edges.length == 3) {
      final e1 = edges[0];
      final e2 = edges[1];
      final e3 = edges[2];
      final end = _data.people[e3.toId];
      if (end == null) return null;

      // parent → parent → child = uncle/aunt
      if (e1.type == EdgeType.parent &&
          e2.type == EdgeType.child &&
          e3.type == EdgeType.child) {
        final mid2 = _data.people[e2.toId];
        if (mid2 != null) return _uncleAuntLabel(mid2.gender);
      }
      // child → child → parent = nephew/niece relationship reversed
      if (e1.type == EdgeType.parent &&
          e2.type == EdgeType.parent &&
          e3.type == EdgeType.child) {
        return _nephewNieceLabel(end.gender);
      }
      // grandchild via child→child
      if (e1.type == EdgeType.child && e2.type == EdgeType.child &&
          e3.type == EdgeType.child) {
        return 'great-grandchild';
      }
      // grandparent
      if (e1.type == EdgeType.parent && e2.type == EdgeType.parent &&
          e3.type == EdgeType.parent) {
        return _greatGrandparentLabel(end.gender);
      }
      // sibling-in-law: spouse → sibling
      if (e1.type == EdgeType.spouse &&
          e2.type == EdgeType.parent &&
          e3.type == EdgeType.child) {
        return _siblingInLawLabel(end.gender);
      }
      // sibling-in-law: sibling → spouse
      if (e1.type == EdgeType.parent &&
          e2.type == EdgeType.child &&
          e3.type == EdgeType.spouse) {
        return _siblingInLawLabel(end.gender);
      }
      // spouse's child
      if (e1.type == EdgeType.child && e2.type == EdgeType.spouse &&
          e3.type == EdgeType.parent) {
        return _parentInLawLabel(end.gender);
      }
    }

    if (edges.length == 4) {
      final e1 = edges[0];
      final e2 = edges[1];
      final e3 = edges[2];
      final e4 = edges[3];
      final end = _data.people[e4.toId];
      if (end == null) return null;

      // great-grandparent
      if (e1.type == EdgeType.parent && e2.type == EdgeType.parent &&
          e3.type == EdgeType.parent && e4.type == EdgeType.parent) {
        return _greatGrandparentLabel(end.gender);
      }
      // first cousin
      if (e1.type == EdgeType.parent && e2.type == EdgeType.parent &&
          e3.type == EdgeType.child && e4.type == EdgeType.child) {
        return 'first cousin';
      }
    }

    // Fallback for longer paths
    return _buildFallbackLabel(edges);
  }

  String _buildFallbackLabel(List<GraphEdge> edges) {
    final parts = <String>[];
    for (final e in edges) {
      switch (e.type) {
        case EdgeType.parent:
          parts.add('parent');
          break;
        case EdgeType.child:
          parts.add('child');
          break;
        case EdgeType.spouse:
          parts.add('spouse');
          break;
      }
    }
    return parts.join("'s ");
  }

  String _parentLabel(Gender g) {
    switch (g) {
      case Gender.male:
        return 'father';
      case Gender.female:
        return 'mother';
      default:
        return 'parent';
    }
  }

  String _childLabel(Gender g) {
    switch (g) {
      case Gender.male:
        return 'son';
      case Gender.female:
        return 'daughter';
      default:
        return 'child';
    }
  }

  String _spouseLabel(Gender g) {
    switch (g) {
      case Gender.male:
        return 'husband';
      case Gender.female:
        return 'wife';
      default:
        return 'spouse';
    }
  }

  String _siblingLabel(Gender g) {
    switch (g) {
      case Gender.male:
        return 'brother';
      case Gender.female:
        return 'sister';
      default:
        return 'sibling';
    }
  }

  String _grandparentLabel(Gender g) {
    switch (g) {
      case Gender.male:
        return 'grandfather';
      case Gender.female:
        return 'grandmother';
      default:
        return 'grandparent';
    }
  }

  String _grandchildLabel(Gender g) {
    switch (g) {
      case Gender.male:
        return 'grandson';
      case Gender.female:
        return 'granddaughter';
      default:
        return 'grandchild';
    }
  }

  String _uncleAuntLabel(Gender g) {
    switch (g) {
      case Gender.male:
        return 'uncle';
      case Gender.female:
        return 'aunt';
      default:
        return "parent's sibling";
    }
  }

  String _nephewNieceLabel(Gender g) {
    switch (g) {
      case Gender.male:
        return 'nephew';
      case Gender.female:
        return 'niece';
      default:
        return "sibling's child";
    }
  }

  String _childInLawLabel(Gender g) {
    switch (g) {
      case Gender.male:
        return 'son-in-law';
      case Gender.female:
        return 'daughter-in-law';
      default:
        return 'child-in-law';
    }
  }

  String _parentInLawLabel(Gender g) {
    switch (g) {
      case Gender.male:
        return 'father-in-law';
      case Gender.female:
        return 'mother-in-law';
      default:
        return 'parent-in-law';
    }
  }

  String _siblingInLawLabel(Gender g) {
    switch (g) {
      case Gender.male:
        return 'brother-in-law';
      case Gender.female:
        return 'sister-in-law';
      default:
        return 'sibling-in-law';
    }
  }

  String _greatGrandparentLabel(Gender g) {
    switch (g) {
      case Gender.male:
        return 'great-grandfather';
      case Gender.female:
        return 'great-grandmother';
      default:
        return 'great-grandparent';
    }
  }

  // Derived identities for a person (all roles they play)
  Map<String, List<Person>> getPersonIdentities(String personId) {
    final result = <String, List<Person>>{};

    void add(String role, String otherId) {
      final p = _data.people[otherId];
      if (p != null) result.putIfAbsent(role, () => []).add(p);
    }

    // Spouses
    for (final unit in _data.familyUnits.values) {
      if (unit.husbandId == personId && unit.wifeId != null) {
        add('Wife of', unit.wifeId!);
      }
      if (unit.wifeId == personId && unit.husbandId != null) {
        add('Husband of', unit.husbandId!);
      }
      if (unit.husbandId == personId || unit.wifeId == personId) {
        for (final c in unit.childrenIds) {
          final child = _data.people[c];
          if (child == null) continue;
          switch (child.gender) {
            case Gender.male:
              add('Father of', c);
              break;
            case Gender.female:
              add('Mother of', c);
              break;
            default:
              add('Parent of', c);
          }
        }
      }
      if (unit.childrenIds.contains(personId)) {
        if (unit.husbandId != null) {
          final father = _data.people[unit.husbandId!];
          if (father != null) {
            switch (father.gender) {
              case Gender.male:
                add('Son/Daughter of', unit.husbandId!);
                break;
              default:
                add('Child of', unit.husbandId!);
            }
          }
        }
        if (unit.wifeId != null) {
          final mother = _data.people[unit.wifeId!];
          if (mother != null) {
            switch (mother.gender) {
              case Gender.female:
                add('Son/Daughter of', unit.wifeId!);
                break;
              default:
                add('Child of', unit.wifeId!);
            }
          }
        }
        // Siblings
        for (final sib in unit.childrenIds) {
          if (sib == personId) continue;
          final sibPerson = _data.people[sib];
          if (sibPerson == null) continue;
          switch (sibPerson.gender) {
            case Gender.male:
              add('Brother/Sister of', sib);
              break;
            case Gender.female:
              add('Brother/Sister of', sib);
              break;
            default:
              add('Sibling of', sib);
          }
        }
      }
    }

    // Grandchildren/Grandparents
    final children = getChildIds(personId);
    for (final childId in children) {
      final grandchildren = getChildIds(childId);
      for (final gcId in grandchildren) {
        final gc = _data.people[gcId];
        if (gc == null) continue;
        switch (gc.gender) {
          case Gender.male:
            add('Grandfather/Grandmother of', gcId);
            break;
          default:
            add('Grandparent of', gcId);
        }
      }
    }

    return result;
  }
}
