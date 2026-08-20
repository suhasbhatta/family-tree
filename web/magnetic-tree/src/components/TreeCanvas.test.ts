import { describe, expect, it } from 'vitest';
import type { FamilyTreeData, Person } from '../types/family';
import { buildTreeGraph } from '../lib/treeGraph';

const person = (id: string, name: string): Person => ({ id, name, version: 1, gender: 'unknown', dateOfBirth: null, dateOfDeath: null, isAlive: true, contactNumber: null, currentPlaceOfResidence: null });

describe('buildTreeGraph', () => {
  it('keeps each sibling branch and its children in a separate subtree', () => {
    const tree: FamilyTreeData = {
      appVersion: 2, selectedRootFamilyUnitId: 'root', createdAt: '', updatedAt: '',
      people: [
        person('root1', 'Root One'), person('root2', 'Root Two'),
        person('a', 'Asha'), person('ap', 'Asha Partner'), person('a1', 'Zoe'), person('a2', 'Aaron'),
        person('b', 'Bharat'), person('bp', 'Bharat Partner'), person('b1', 'Yuri'), person('b2', 'Bella'),
        person('c', 'Chandra'), person('cp', 'Chandra Partner'), person('c1', 'Xena'), person('c2', 'Carol'),
      ],
      familyUnits: [
        { id: 'root', husbandId: 'root1', wifeId: 'root2', anniversaryDate: null, childrenIds: ['a', 'b', 'c'] },
        { id: 'a-family', husbandId: 'a', wifeId: 'ap', anniversaryDate: null, childrenIds: ['a1', 'a2'] },
        { id: 'b-family', husbandId: 'b', wifeId: 'bp', anniversaryDate: null, childrenIds: ['b1', 'b2'] },
        { id: 'c-family', husbandId: 'c', wifeId: 'cp', anniversaryDate: null, childrenIds: ['c1', 'c2'] },
      ],
    };
    const built = buildTreeGraph(tree, null, [], () => {}); const byId = new Map(built.nodes.map((node) => [node.id, node]));
    const xs = (ids: string[]) => ids.map((id) => byId.get(`person:${id}`)!.position.x);
    const aChildren = xs(['a1', 'a2']); const bChildren = xs(['b1', 'b2']); const cChildren = xs(['c1', 'c2']);

    expect(Math.max(...aChildren)).toBeLessThan(Math.min(...bChildren));
    expect(Math.max(...bChildren)).toBeLessThan(Math.min(...cChildren));
    expect(byId.get('unit:a-family')!.position.x).toBeCloseTo((aChildren[0] + aChildren[1]) / 2);
    expect(built.edges.filter((edge) => edge.source === 'unit:a-family').map((edge) => edge.target).sort()).toEqual(['person:a1', 'person:a2']);
    expect(built.edges.filter((edge) => edge.source === 'unit:b-family').map((edge) => edge.target).sort()).toEqual(['person:b1', 'person:b2']);
    expect(built.edges.filter((edge) => edge.source === 'unit:c-family').map((edge) => edge.target).sort()).toEqual(['person:c1', 'person:c2']);
  });
});
