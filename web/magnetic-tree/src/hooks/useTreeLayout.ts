import { useMemo } from 'react';
import type { Person } from '../types/family';
import { computeTreeLayout } from '../lib/treeLayout';
import { computeUnits } from '../lib/units';
import type { Unit } from '../lib/units';

export interface ParentChildLink {
  /** Unit id (representative person id) of the parent couple/single. */
  parentUnitId: string;
  /** Unit id of the child (a child is never merged, even if they have their own spouse elsewhere). */
  childUnitId: string;
}

/** Deterministic generational tree layout: spouses merged into one unit/card per couple. */
export function useTreeLayout(people: Person[]) {
  const units = useMemo(() => computeUnits(people), [people]);
  const { positions, bounds } = useMemo(() => computeTreeLayout(people), [people]);

  const personToUnitId = useMemo(() => {
    const map = new Map<string, string>();
    units.forEach((u) => u.personIds.forEach((pid) => map.set(pid, u.id)));
    return map;
  }, [units]);

  const links = useMemo(() => {
    const result: ParentChildLink[] = [];
    const seen = new Set<string>();
    for (const p of people) {
      if (p.parentIds.length === 0) continue;
      const childUnitId = personToUnitId.get(p.id);
      const parentUnitId = personToUnitId.get(p.parentIds[0]);
      if (!childUnitId || !parentUnitId) continue;
      const key = `${parentUnitId}->${childUnitId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ parentUnitId, childUnitId });
    }
    return result;
  }, [people, personToUnitId]);

  return { units, positions, bounds, links };
}

export type { Unit };
