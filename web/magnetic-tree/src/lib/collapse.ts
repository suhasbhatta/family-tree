import type { Person } from '../types/family';

export function buildChildrenMap(people: Person[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const p of people) {
    for (const parentId of p.parentIds) {
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId)!.push(p.id);
    }
  }
  return map;
}

/** Descendants (and their spouses) of every collapsed node, transitively. */
export function computeHiddenIds(
  people: Person[],
  collapsedIds: Set<string>,
  childrenOf: Map<string, string[]>,
): Set<string> {
  if (collapsedIds.size === 0) return new Set();
  const byId = new Map(people.map((p) => [p.id, p]));
  const hidden = new Set<string>();
  const queue: string[] = [];
  for (const id of collapsedIds) {
    queue.push(...(childrenOf.get(id) ?? []));
  }
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (hidden.has(id)) continue;
    hidden.add(id);
    const person = byId.get(id);
    if (person) {
      for (const spouseId of person.spouseIds) {
        if (!hidden.has(spouseId)) queue.push(spouseId);
      }
    }
    queue.push(...(childrenOf.get(id) ?? []));
  }
  return hidden;
}

export function countDescendants(id: string, childrenOf: Map<string, string[]>): number {
  const seen = new Set<string>();
  const queue = [...(childrenOf.get(id) ?? [])];
  while (queue.length > 0) {
    const childId = queue.shift()!;
    if (seen.has(childId)) continue;
    seen.add(childId);
    queue.push(...(childrenOf.get(childId) ?? []));
  }
  return seen.size;
}
