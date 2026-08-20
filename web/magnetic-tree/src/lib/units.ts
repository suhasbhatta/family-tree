import type { Person } from '../types/family';

export interface Unit {
  /** Representative id = first member's person id. Stable and unique. */
  id: string;
  personIds: string[];
}

/** Groups spouses into a single display unit via union-find over spouseIds. */
export function computeUnits(people: Person[]): Unit[] {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  people.forEach((p) => parent.set(p.id, p.id));
  people.forEach((p) => {
    for (const spouseId of p.spouseIds) {
      if (parent.has(spouseId)) union(p.id, spouseId);
    }
  });

  const groups = new Map<string, string[]>();
  for (const p of people) {
    const root = find(p.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(p.id);
  }

  return [...groups.values()].map((personIds) => ({ id: personIds[0], personIds }));
}
