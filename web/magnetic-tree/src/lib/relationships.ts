import type { FamilyUnit, Person, RelationshipResult } from '../types/family';

type LinkKind = 'parent' | 'child' | 'spouse';
interface Link { id: string; kind: LinkKind }

export function findRelationship(fromId: string, toId: string, people: Person[], units: FamilyUnit[]): RelationshipResult | null {
  if (fromId === toId) return { label: 'Same person', path: [fromId] };
  const adjacency = new Map<string, Link[]>();
  const add = (from: string, to: string, kind: LinkKind) => adjacency.set(from, [...(adjacency.get(from) ?? []), { id: to, kind }]);
  for (const unit of units) {
    const parents = [unit.husbandId, unit.wifeId].filter((id): id is string => Boolean(id));
    if (parents.length === 2) { add(parents[0], parents[1], 'spouse'); add(parents[1], parents[0], 'spouse'); }
    for (const parent of parents) for (const child of unit.childrenIds) { add(parent, child, 'child'); add(child, parent, 'parent'); }
  }
  const queue: Array<{ id: string; path: string[]; kinds: LinkKind[] }> = [{ id: fromId, path: [fromId], kinds: [] }];
  const seen = new Set([fromId]);
  while (queue.length) {
    const current = queue.shift()!;
    for (const link of adjacency.get(current.id) ?? []) {
      if (seen.has(link.id)) continue;
      const path = [...current.path, link.id];
      const kinds = [...current.kinds, link.kind];
      if (link.id === toId) return { label: describe(kinds, people.find((p) => p.id === toId)?.gender), path };
      seen.add(link.id); queue.push({ id: link.id, path, kinds });
    }
  }
  return null;
}

function describe(kinds: LinkKind[], gender?: Person['gender']): string {
  const male = gender === 'male';
  if (kinds.length === 1) return kinds[0] === 'spouse' ? (male ? 'Husband' : 'Wife') : kinds[0] === 'parent' ? (male ? 'Father' : 'Mother') : (male ? 'Son' : 'Daughter');
  if (kinds.every((kind) => kind === 'parent')) return kinds.length === 2 ? (male ? 'Grandfather' : 'Grandmother') : `${kinds.length - 2}× great-${male ? 'grandfather' : 'grandmother'}`;
  if (kinds.every((kind) => kind === 'child')) return kinds.length === 2 ? (male ? 'Grandson' : 'Granddaughter') : `${kinds.length - 2}× great-${male ? 'grandson' : 'granddaughter'}`;
  if (kinds.length === 2 && kinds[0] === 'parent' && kinds[1] === 'child') return male ? 'Brother' : 'Sister';
  if (kinds.length === 3 && kinds[0] === 'parent' && kinds[1] === 'parent' && kinds[2] === 'child') return male ? 'Uncle' : 'Aunt';
  if (kinds.length === 3 && kinds[0] === 'parent' && kinds[1] === 'child' && kinds[2] === 'child') return male ? 'Nephew' : 'Niece';
  if (kinds.length === 4 && kinds.slice(0, 2).every((kind) => kind === 'parent') && kinds.slice(2).every((kind) => kind === 'child')) return 'Cousin';
  return `Extended relative (${kinds.length} connections)`;
}

export function duplicateGroups(people: Person[]): Person[][] {
  const groups = new Map<string, Person[]>();
  for (const person of people) { const key = `${person.name.trim().toLocaleLowerCase()}|${person.dateOfBirth ?? ''}`; groups.set(key, [...(groups.get(key) ?? []), person]); }
  return [...groups.values()].filter((group) => group.length > 1);
}
