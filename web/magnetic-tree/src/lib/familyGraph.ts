import type { Person } from '../types/family';

export interface AncestorEntry {
  distance: number;
  /** Path from the starting person to this ancestor, inclusive of both ends. */
  path: string[];
}

export class FamilyGraph {
  readonly byId = new Map<string, Person>();

  constructor(people: Person[]) {
    people.forEach((p) => this.byId.set(p.id, p));
  }

  get(id: string): Person | undefined {
    return this.byId.get(id);
  }

  parentsOf(id: string): Person[] {
    const person = this.byId.get(id);
    if (!person) return [];
    return person.parentIds.map((pid) => this.byId.get(pid)).filter((p): p is Person => !!p);
  }

  childrenOf(id: string): Person[] {
    return Array.from(this.byId.values()).filter((p) => p.parentIds.includes(id));
  }

  spousesOf(id: string): Person[] {
    const person = this.byId.get(id);
    if (!person) return [];
    return person.spouseIds.map((sid) => this.byId.get(sid)).filter((p): p is Person => !!p);
  }

  siblingsOf(id: string): Person[] {
    const person = this.byId.get(id);
    if (!person || person.parentIds.length === 0) return [];
    const seen = new Set<string>();
    const result: Person[] = [];
    for (const parentId of person.parentIds) {
      for (const child of this.childrenOf(parentId)) {
        if (child.id !== id && !seen.has(child.id)) {
          seen.add(child.id);
          result.push(child);
        }
      }
    }
    return result;
  }

  /** BFS climb through blood parents only, up to maxDepth generations. */
  getAncestors(id: string, maxDepth = 6): Map<string, AncestorEntry> {
    const result = new Map<string, AncestorEntry>();
    result.set(id, { distance: 0, path: [id] });
    let frontier: string[] = [id];
    let depth = 0;
    while (frontier.length > 0 && depth < maxDepth) {
      depth += 1;
      const next: string[] = [];
      for (const currentId of frontier) {
        const current = result.get(currentId)!;
        for (const parent of this.parentsOf(currentId)) {
          if (!result.has(parent.id)) {
            result.set(parent.id, { distance: depth, path: [...current.path, parent.id] });
            next.push(parent.id);
          }
        }
      }
      frontier = next;
    }
    return result;
  }

  /** Every node reachable by blood or marriage, for fallback path-finding. */
  shortestGraphPath(fromId: string, toId: string): string[] | null {
    if (fromId === toId) return [fromId];
    const visited = new Set<string>([fromId]);
    const queue: string[][] = [[fromId]];
    while (queue.length > 0) {
      const path = queue.shift()!;
      const last = path[path.length - 1];
      const neighbors = [...this.parentsOf(last), ...this.childrenOf(last), ...this.spousesOf(last)];
      for (const neighbor of neighbors) {
        if (neighbor.id === toId) return [...path, neighbor.id];
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          queue.push([...path, neighbor.id]);
        }
      }
    }
    return null;
  }
}
