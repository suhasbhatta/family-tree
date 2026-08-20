import type { Person } from '../types/family';
import type { Vec2 } from './layoutConstants';
import { CARD_WIDTH, COUPLE_CARD_WIDTH, LEAF_GAP, ROOT_GAP, ROW_HEIGHT } from './layoutConstants';
import { computeUnits } from './units';

interface Group {
  id: string;
  /** All person ids rendered as one card (1 = single, 2 = couple). */
  personIds: string[];
  parentGroupId: string | null;
  childGroupIds: string[];
  depth: number;
}

export interface TreeLayoutResult {
  /** Keyed by unit id (== representative person id). */
  positions: Map<string, Vec2>;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export function computeTreeLayout(people: Person[]): TreeLayoutResult {
  const byId = new Map(people.map((p) => [p.id, p]));
  const units = computeUnits(people);

  const personToGroupId = new Map<string, string>();
  units.forEach((u) => u.personIds.forEach((pid) => personToGroupId.set(pid, u.id)));

  const groups = new Map<string, Group>();
  for (const unit of units) {
    groups.set(unit.id, { id: unit.id, personIds: unit.personIds, parentGroupId: null, childGroupIds: [], depth: 0 });
  }

  // Determine each group's primary blood-parent group (patrilineal preference on ties).
  for (const group of groups.values()) {
    let candidate: string | null = null;
    for (const memberId of group.personIds) {
      const person = byId.get(memberId)!;
      if (person.parentIds.length === 0) continue;
      const parentGroupId = personToGroupId.get(person.parentIds[0]);
      if (!parentGroupId || parentGroupId === group.id) continue;
      if (candidate === null) {
        candidate = parentGroupId;
      } else if (person.gender === 'M') {
        candidate = parentGroupId;
      }
    }
    group.parentGroupId = candidate;
  }

  for (const group of groups.values()) {
    if (group.parentGroupId) {
      const parentGroup = groups.get(group.parentGroupId);
      if (parentGroup && !parentGroup.childGroupIds.includes(group.id)) {
        parentGroup.childGroupIds.push(group.id);
      }
    }
  }

  const roots = [...groups.values()].filter((g) => !g.parentGroupId);

  // BFS depth assignment (guards against cycles from malformed data).
  const visited = new Set<string>();
  let frontier = roots.map((r) => r.id);
  let depth = 0;
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const gid of frontier) {
      if (visited.has(gid)) continue;
      visited.add(gid);
      groups.get(gid)!.depth = depth;
      next.push(...groups.get(gid)!.childGroupIds);
    }
    frontier = next;
    depth += 1;
  }

  const ownWidth = (group: Group) => (group.personIds.length > 1 ? COUPLE_CARD_WIDTH : CARD_WIDTH);

  const widthCache = new Map<string, number>();
  const subtreeWidth = (gid: string): number => {
    if (widthCache.has(gid)) return widthCache.get(gid)!;
    const group = groups.get(gid)!;
    let width = ownWidth(group);
    if (group.childGroupIds.length > 0) {
      const childrenWidth =
        group.childGroupIds.reduce((sum, cid) => sum + subtreeWidth(cid), 0) +
        LEAF_GAP * (group.childGroupIds.length - 1);
      width = Math.max(width, childrenWidth);
    }
    widthCache.set(gid, width);
    return width;
  };
  groups.forEach((g) => subtreeWidth(g.id));

  const positions = new Map<string, Vec2>();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const place = (gid: string, leftX: number) => {
    const group = groups.get(gid)!;
    const width = subtreeWidth(gid);
    const centerX = leftX + width / 2;
    const y = group.depth * ROW_HEIGHT;
    const halfOwn = ownWidth(group) / 2;

    positions.set(group.id, { x: centerX, y });
    minX = Math.min(minX, centerX - halfOwn);
    maxX = Math.max(maxX, centerX + halfOwn);
    minY = Math.min(minY, y - 60);
    maxY = Math.max(maxY, y + 60);

    if (group.childGroupIds.length > 0) {
      const childrenWidth =
        group.childGroupIds.reduce((sum, cid) => sum + subtreeWidth(cid), 0) +
        LEAF_GAP * (group.childGroupIds.length - 1);
      let childX = centerX - childrenWidth / 2;
      for (const cid of group.childGroupIds) {
        place(cid, childX);
        childX += subtreeWidth(cid) + LEAF_GAP;
      }
    }
  };

  let rootX = 0;
  for (const root of roots) {
    place(root.id, rootX);
    rootX += subtreeWidth(root.id) + ROOT_GAP;
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    maxX = 0;
    minY = 0;
    maxY = 0;
  }

  return { positions, bounds: { minX, maxX, minY, maxY } };
}
