import type { FamilyUnit, Person, RelationshipResult } from '../types/family';

interface AncestorPath { distance: number; path: string[] }
type LinkKind = 'parent' | 'child' | 'spouse';
interface GraphLink { id: string; kind: LinkKind }

const gendered = (gender: Person['gender'] | undefined, male: string, female: string, neutral: string) => gender === 'male' ? male : gender === 'female' ? female : neutral;
const childTerm = (gender: Person['gender'] | undefined) => gendered(gender, 'ಮಗ (Maga)', 'ಮಗಳು (Magalu)', 'ಮಗು (Magu)');

function ordinal(value: number): string {
  const names = ['Zeroth', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
  if (value < names.length) return names[value];
  const suffix = value % 100 >= 11 && value % 100 <= 13 ? 'th' : value % 10 === 1 ? 'st' : value % 10 === 2 ? 'nd' : value % 10 === 3 ? 'rd' : 'th';
  return `${value}${suffix}`;
}

function ancestorLabel(distance: number, gender: Person['gender'] | undefined): string {
  if (distance === 1) return gendered(gender, 'Father', 'Mother', 'Parent');
  if (distance === 2) return gendered(gender, 'Grandfather', 'Grandmother', 'Grandparent');
  return `${'Great-'.repeat(distance - 2)}${gendered(gender, 'Grandfather', 'Grandmother', 'Grandparent')}`;
}

function descendantLabel(distance: number, gender: Person['gender'] | undefined): string {
  if (distance === 1) return gendered(gender, 'Son', 'Daughter', 'Child');
  if (distance === 2) return gendered(gender, 'Grandson', 'Granddaughter', 'Grandchild');
  return `${'Great-'.repeat(distance - 2)}${gendered(gender, 'Grandson', 'Granddaughter', 'Grandchild')}`;
}

function collateralLabel(subjectDistance: number, relativeDistance: number, gender: Person['gender'] | undefined): string {
  if (subjectDistance === 1 && relativeDistance === 1) return gendered(gender, 'Brother', 'Sister', 'Sibling');
  if (relativeDistance === 1) return `${'Great-'.repeat(Math.max(0, subjectDistance - 2))}${gendered(gender, 'Uncle', 'Aunt', 'Parent’s sibling')}`;
  if (subjectDistance === 1) return `${'Great-'.repeat(Math.max(0, relativeDistance - 2))}${gendered(gender, 'Nephew', 'Niece', 'Sibling’s child')}`;
  const degree = Math.min(subjectDistance, relativeDistance) - 1; const removed = Math.abs(subjectDistance - relativeDistance);
  return `${ordinal(degree)} cousin${removed ? ` ${removed === 1 ? 'once' : `${removed} times`} removed` : ''}`;
}

function buildParents(units: FamilyUnit[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const unit of units) {
    const parents = [unit.husbandId, unit.wifeId].filter((id): id is string => Boolean(id));
    for (const child of unit.childrenIds) result.set(child, [...new Set([...(result.get(child) ?? []), ...parents])]);
  }
  return result;
}

function ancestorPaths(personId: string, parents: Map<string, string[]>, maximumDepth: number): Map<string, AncestorPath> {
  const result = new Map<string, AncestorPath>([[personId, { distance: 0, path: [personId] }]]); const queue: string[] = [personId];
  while (queue.length) {
    const current = queue.shift()!; const currentPath = result.get(current)!;
    if (currentPath.distance >= maximumDepth) continue;
    for (const parent of parents.get(current) ?? []) {
      const distance = currentPath.distance + 1; const existing = result.get(parent);
      if (currentPath.path.includes(parent) || (existing && existing.distance <= distance)) continue;
      result.set(parent, { distance, path: [...currentPath.path, parent] }); queue.push(parent);
    }
  }
  return result;
}

function compareAge(first: Person | undefined, second: Person | undefined): 'older' | 'younger' | 'unknown' {
  if (!first?.dateOfBirth || !second?.dateOfBirth || first.dateOfBirth === second.dateOfBirth) return 'unknown';
  return first.dateOfBirth < second.dateOfBirth ? 'older' : 'younger';
}

function branchKind(subjectLineage: string[], relativeLineage: string[], peopleById: Map<string, Person>): 'cross' | 'parallel' | null {
  if (subjectLineage.length < 2 || relativeLineage.length < 2) return null;
  const subjectBranch = peopleById.get(subjectLineage[1]); const relativeBranch = peopleById.get(relativeLineage[1]);
  if (!subjectBranch || !relativeBranch || !['male', 'female'].includes(subjectBranch.gender) || !['male', 'female'].includes(relativeBranch.gender)) return null;
  return subjectBranch.gender === relativeBranch.gender ? 'parallel' : 'cross';
}

function kannadaTerm(subjectDistance: number, relativeDistance: number, subject: Person, relative: Person, subjectLineage: string[], relativeLineage: string[], peopleById: Map<string, Person>): string {
  if (relativeDistance === 0) {
    if (subjectDistance === 1) return gendered(relative.gender, 'ತಂದೆ (Tande)', 'ತಾಯಿ (Taayi)', 'ಪೋಷಕರು (Parent)');
    if (subjectDistance === 2) return gendered(relative.gender, 'ಅಜ್ಜ (Ajja)', 'ಅಜ್ಜಿ (Ajji)', 'ಅಜ್ಜ/ಅಜ್ಜಿ (Grandparent)');
    return gendered(relative.gender, 'ಮುತ್ತಜ್ಜ (Ancestor)', 'ಮುತ್ತಜ್ಜಿ (Ancestor)', 'ಪೂರ್ವಜರು (Ancestor)');
  }
  if (subjectDistance === 0) {
    if (relativeDistance === 1) return childTerm(relative.gender);
    if (relativeDistance === 2) return gendered(relative.gender, 'ಮೊಮ್ಮಗ (Mommaga)', 'ಮೊಮ್ಮಗಳು (Mommagaḷu)', 'ಮೊಮ್ಮಗು (Grandchild)');
    return gendered(relative.gender, 'ಮರಿ ಮೊಮ್ಮಗ (Descendant)', 'ಮರಿ ಮೊಮ್ಮಗಳು (Descendant)', 'ವಂಶಸ್ಥರು (Descendant)');
  }
  if (subjectDistance === 1 && relativeDistance === 1) {
    const age = compareAge(relative, subject);
    if (relative.gender === 'male') return age === 'older' ? 'ಅಣ್ಣ (Anna)' : age === 'younger' ? 'ತಮ್ಮ (Tamma)' : 'ಸಹೋದರ (Sahodara)';
    if (relative.gender === 'female') return age === 'older' ? 'ಅಕ್ಕ (Akka)' : age === 'younger' ? 'ತಂಗಿ (Tangi)' : 'ಸಹೋದರಿ (Sahodari)';
    return 'ಸಹೋದರ/ಸಹೋದರಿ (Sibling)';
  }
  const subjectBranch = peopleById.get(subjectLineage[1]); const relativeBranch = peopleById.get(relativeLineage[1]);
  if (subjectDistance === 2 && relativeDistance === 1 && subjectBranch) {
    if (relative.gender === 'female') return subjectBranch.gender === 'male' ? 'ಸೋದರತ್ತೆ (Sodaratte)' : compareAge(relative, subjectBranch) === 'older' ? 'ದೊಡ್ಡಮ್ಮ (Doddamma)' : compareAge(relative, subjectBranch) === 'younger' ? 'ಚಿಕ್ಕಮ್ಮ (Chikkamma)' : 'ತಾಯಿಯ ಸಹೋದರಿ (Mother’s sister)';
    if (relative.gender === 'male') return subjectBranch.gender === 'female' ? 'ಸೋದರಮಾವ (Sodaramava)' : compareAge(relative, subjectBranch) === 'older' ? 'ದೊಡ್ಡಪ್ಪ (Doddappa)' : compareAge(relative, subjectBranch) === 'younger' ? 'ಚಿಕ್ಕಪ್ಪ (Chikkappa)' : 'ತಂದೆಯ ಸಹೋದರ (Father’s brother)';
  }
  if (subjectDistance === 1 && relativeDistance === 2 && relativeBranch) {
    const relation = relativeBranch.gender === 'male' ? 'ಸೋದರನ' : relativeBranch.gender === 'female' ? 'ಸೋದರಿಯ' : 'ಸಹೋದರರ';
    return `${relation} ${childTerm(relative.gender)}`;
  }
  if (subjectDistance === 2 && relativeDistance === 2 && subjectBranch && relativeBranch) {
    if (subjectBranch.gender === 'male' && relativeBranch.gender === 'female') return `ಸೋದರತ್ತೆಯ ${childTerm(relative.gender)}`;
    if (subjectBranch.gender === 'female' && relativeBranch.gender === 'male') return `ಸೋದರಮಾವನ ${childTerm(relative.gender)}${relative.gender === 'male' ? ' / ಬಾವ (Baava)' : ''}`;
    if (subjectBranch.gender === 'male' && relativeBranch.gender === 'male') {
      const prefix = compareAge(relativeBranch, subjectBranch) === 'older' ? 'ದೊಡ್ಡಪ್ಪನ' : compareAge(relativeBranch, subjectBranch) === 'younger' ? 'ಚಿಕ್ಕಪ್ಪನ' : 'ತಂದೆಯ ಸಹೋದರನ';
      return `${prefix} ${childTerm(relative.gender)}`;
    }
    if (subjectBranch.gender === 'female' && relativeBranch.gender === 'female') {
      const prefix = compareAge(relativeBranch, subjectBranch) === 'older' ? 'ದೊಡ್ಡಮ್ಮನ' : compareAge(relativeBranch, subjectBranch) === 'younger' ? 'ಚಿಕ್ಕಮ್ಮನ' : 'ತಾಯಿಯ ಸಹೋದರಿಯ';
      return `${prefix} ${childTerm(relative.gender)}`;
    }
  }
  return 'ವಿಸ್ತೃತ ಸಂಬಂಧಿ (Extended relative)';
}

function directSpouse(from: Person, to: Person, units: FamilyUnit[]): RelationshipResult | null {
  const spouses = units.some((unit) => (unit.husbandId === from.id && unit.wifeId === to.id) || (unit.wifeId === from.id && unit.husbandId === to.id));
  if (!spouses) return null;
  return {
    label: gendered(to.gender, 'Husband', 'Wife', 'Spouse'), reverseLabel: gendered(from.gender, 'Husband', 'Wife', 'Spouse'), formalRelationship: 'Spouses', path: [from.id, to.id],
    mrcaIds: [], fromLineage: [from.id], toLineage: [to.id], fromDistance: null, toDistance: null,
    kannadaFromTo: gendered(to.gender, 'ಗಂಡ (Ganda)', 'ಹೆಂಡತಿ (Hendati)', 'ಜೀವನ ಸಂಗಾತಿ (Spouse)'), kannadaToFrom: gendered(from.gender, 'ಗಂಡ (Ganda)', 'ಹೆಂಡತಿ (Hendati)', 'ಜೀವನ ಸಂಗಾತಿ (Spouse)'),
    logic: `${from.name} and ${to.name} are recorded as partners in the same family unit.`,
  };
}

function describeAffinal(kinds: LinkKind[], gender: Person['gender']): string {
  if (kinds.length === 2 && kinds[0] === 'spouse' && kinds[1] === 'parent') return gendered(gender, 'Father-in-law', 'Mother-in-law', 'Parent-in-law');
  if (kinds.length === 2 && kinds[0] === 'child' && kinds[1] === 'spouse') return gendered(gender, 'Son-in-law', 'Daughter-in-law', 'Child-in-law');
  if (kinds.length === 2 && kinds[0] === 'parent' && kinds[1] === 'spouse') return gendered(gender, 'Stepfather', 'Stepmother', 'Stepparent');
  if (kinds.length === 2 && kinds[0] === 'spouse' && kinds[1] === 'child') return gendered(gender, 'Stepson', 'Stepdaughter', 'Stepchild');
  return `Relative by marriage (${kinds.length} connections)`;
}

function affinalPath(fromId: string, toId: string, peopleById: Map<string, Person>, units: FamilyUnit[]): { path: string[]; kinds: LinkKind[] } | null {
  const adjacency = new Map<string, GraphLink[]>();
  const add = (from: string, id: string, kind: LinkKind) => adjacency.set(from, [...(adjacency.get(from) ?? []), { id, kind }]);
  for (const unit of units) {
    const parents = [unit.husbandId, unit.wifeId].filter((id): id is string => Boolean(id));
    if (parents.length === 2) { add(parents[0], parents[1], 'spouse'); add(parents[1], parents[0], 'spouse'); }
    for (const parent of parents) for (const child of unit.childrenIds) { add(parent, child, 'child'); add(child, parent, 'parent'); }
  }
  const queue: Array<{ id: string; path: string[]; kinds: LinkKind[] }> = [{ id: fromId, path: [fromId], kinds: [] }]; const seen = new Set([fromId]);
  while (queue.length) {
    const current = queue.shift()!;
    for (const link of adjacency.get(current.id) ?? []) {
      if (!peopleById.has(link.id) || seen.has(link.id)) continue;
      const next = { id: link.id, path: [...current.path, link.id], kinds: [...current.kinds, link.kind] };
      if (link.id === toId) return next; seen.add(link.id); queue.push(next);
    }
  }
  return null;
}

function affinalRelationship(from: Person, to: Person, peopleById: Map<string, Person>, units: FamilyUnit[]): RelationshipResult | null {
  const forward = affinalPath(from.id, to.id, peopleById, units); const reverse = affinalPath(to.id, from.id, peopleById, units);
  if (!forward || !reverse || !forward.kinds.includes('spouse')) return null;
  const label = describeAffinal(forward.kinds, to.gender); const reverseLabel = describeAffinal(reverse.kinds, from.gender);
  return { label, reverseLabel, formalRelationship: `${label} / ${reverseLabel}`, path: forward.path, mrcaIds: [], fromLineage: [from.id], toLineage: [to.id], fromDistance: null, toDistance: null, kannadaFromTo: 'ವೈವಾಹಿಕ ಸಂಬಂಧಿ (Relative by marriage)', kannadaToFrom: 'ವೈವಾಹಿಕ ಸಂಬಂಧಿ (Relative by marriage)', logic: `${from.name} and ${to.name} are connected through a recorded spouse relationship rather than a shared known ancestor.` };
}

export function findRelationship(fromId: string, toId: string, people: Person[], units: FamilyUnit[]): RelationshipResult | null {
  const peopleById = new Map(people.map((person) => [person.id, person])); const from = peopleById.get(fromId); const to = peopleById.get(toId);
  if (!from || !to) return null;
  if (fromId === toId) return { label: 'Same person', reverseLabel: 'Same person', formalRelationship: 'Same person', path: [fromId], mrcaIds: [fromId], fromLineage: [fromId], toLineage: [toId], fromDistance: 0, toDistance: 0, kannadaFromTo: 'ಅದೇ ವ್ಯಕ್ತಿ (Same person)', kannadaToFrom: 'ಅದೇ ವ್ಯಕ್ತಿ (Same person)', logic: 'Both selections refer to the same family member.' };
  const spouse = directSpouse(from, to, units); if (spouse) return spouse;

  const parents = buildParents(units); const maximumDepth = Math.max(1, people.length);
  const fromAncestors = ancestorPaths(fromId, parents, maximumDepth); const toAncestors = ancestorPaths(toId, parents, maximumDepth);
  const common = [...fromAncestors.keys()].filter((id) => toAncestors.has(id)); if (!common.length) return affinalRelationship(from, to, peopleById, units);
  const score = (id: string) => fromAncestors.get(id)!.distance + toAncestors.get(id)!.distance;
  const bestScore = Math.min(...common.map(score)); const closest = common.filter((id) => score(id) === bestScore);
  const bestMaximum = Math.min(...closest.map((id) => Math.max(fromAncestors.get(id)!.distance, toAncestors.get(id)!.distance)));
  const mrcaIds = closest.filter((id) => Math.max(fromAncestors.get(id)!.distance, toAncestors.get(id)!.distance) === bestMaximum);
  const representative = mrcaIds[0]; const fromData = fromAncestors.get(representative)!; const toData = toAncestors.get(representative)!;
  const fromLineage = [...fromData.path].reverse(); const toLineage = [...toData.path].reverse(); const fromDistance = fromData.distance; const toDistance = toData.distance;
  // Cross/parallel classification is unambiguous here only for first cousins,
  // whose parents are the two sibling branches immediately below the MRCA.
  const kind = fromDistance === 2 && toDistance === 2 ? branchKind(fromLineage, toLineage, peopleById) : null;
  const label = toDistance === 0 ? ancestorLabel(fromDistance, to.gender) : fromDistance === 0 ? descendantLabel(toDistance, to.gender) : collateralLabel(fromDistance, toDistance, to.gender);
  const reverseLabel = fromDistance === 0 ? ancestorLabel(toDistance, from.gender) : toDistance === 0 ? descendantLabel(fromDistance, from.gender) : collateralLabel(toDistance, fromDistance, from.gender);
  const cousinDegree = fromDistance >= 2 && toDistance >= 2 ? Math.min(fromDistance, toDistance) - 1 : null; const removed = cousinDegree == null ? 0 : Math.abs(fromDistance - toDistance);
  const formalRelationship = cousinDegree == null ? fromDistance === 1 && toDistance === 1 ? 'Siblings' : `${label} / ${reverseLabel}` : `${ordinal(cousinDegree)} Cousins${removed ? ` ${removed === 1 ? 'Once' : `${removed} Times`} Removed` : ''}${kind ? ` (${kind === 'cross' ? 'Cross-cousins' : 'Parallel cousins'})` : ''}`;
  const mrcaNames = mrcaIds.map((id) => peopleById.get(id)?.name).filter(Boolean).join(' and ');
  const logic = toDistance === 0 || fromDistance === 0 ? `${mrcaNames} is the most recent common ancestor because one selected person descends directly from the other.` : `${from.name} and ${to.name} descend from ${mrcaNames} through ${peopleById.get(fromLineage[1])?.name ?? from.name} and ${peopleById.get(toLineage[1])?.name ?? to.name}, respectively.`;
  return {
    label, reverseLabel, formalRelationship, path: [...fromLineage].reverse().concat(toLineage.slice(1)), mrcaIds, fromLineage, toLineage, fromDistance, toDistance,
    kannadaFromTo: kannadaTerm(fromDistance, toDistance, from, to, fromLineage, toLineage, peopleById), kannadaToFrom: kannadaTerm(toDistance, fromDistance, to, from, toLineage, fromLineage, peopleById), logic,
    ...(kind === 'cross' ? { culturalNote: 'Kannada cross-cousin terminology and marriage customs vary by region, community, and family. Terms such as ಬಾವ may be used in some traditions; this genealogical result does not infer marriage eligibility.' } : {}),
  };
}

export function duplicateGroups(people: Person[]): Person[][] {
  const groups = new Map<string, Person[]>();
  for (const person of people) { const key = `${person.name.trim().toLocaleLowerCase()}|${person.dateOfBirth ?? ''}`; groups.set(key, [...(groups.get(key) ?? []), person]); }
  return [...groups.values()].filter((group) => group.length > 1);
}
