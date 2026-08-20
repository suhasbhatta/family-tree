import { describe, expect, it } from 'vitest';
import { duplicateGroups, findRelationship } from './relationships';
import type { FamilyUnit, Person } from '../types/family';

const person = (id: string, name: string, gender: Person['gender'], dateOfBirth: string | null = null): Person => ({ id, name, gender, dateOfBirth, dateOfDeath: null, isAlive: true, contactNumber: null, currentPlaceOfResidence: null, version: 1 });
const people = [person('grandpa', 'Grandpa', 'male'), person('grandma', 'Grandma', 'female'), person('mother', 'Mother', 'female'), person('uncle', 'Uncle', 'male'), person('child', 'Child', 'female')];
const units: FamilyUnit[] = [
  { id: 'grandparents', husbandId: 'grandpa', wifeId: 'grandma', anniversaryDate: null, childrenIds: ['mother', 'uncle'] },
  { id: 'parents', husbandId: null, wifeId: 'mother', anniversaryDate: null, childrenIds: ['child'] },
];

describe('findRelationship', () => {
  it('finds grandparents in the correct direction', () => expect(findRelationship('child', 'grandpa', people, units)?.label).toBe('Grandfather'));
  it('finds an uncle through the shared grandparents', () => expect(findRelationship('child', 'uncle', people, units)?.label).toBe('Uncle'));
  it('returns null for an unconnected profile', () => expect(findRelationship('child', 'outsider', [...people, person('outsider', 'Outsider', 'unknown')], units)).toBeNull());

  it('explains both directions of a Kannada cross-cousin relationship', () => {
    const family = [
      person('rama', 'Rama', 'male'), person('seetha', 'Seetha', 'female'),
      person('suresh', 'Suresh', 'male', '1960-01-01'), person('kavitha', 'Kavitha', 'female', '1965-01-01'),
      person('anand', 'Anand', 'male'), person('divya', 'Divya', 'female'),
    ];
    const familyUnits: FamilyUnit[] = [
      { id: 'roots', husbandId: 'rama', wifeId: 'seetha', anniversaryDate: null, childrenIds: ['suresh', 'kavitha'] },
      { id: 'suresh-family', husbandId: 'suresh', wifeId: null, anniversaryDate: null, childrenIds: ['anand'] },
      { id: 'kavitha-family', husbandId: null, wifeId: 'kavitha', anniversaryDate: null, childrenIds: ['divya'] },
    ];
    const result = findRelationship('anand', 'divya', family, familyUnits)!;

    expect(result.mrcaIds).toEqual(['rama', 'seetha']);
    expect(result.fromLineage).toEqual(['rama', 'suresh', 'anand']);
    expect(result.toLineage).toEqual(['rama', 'kavitha', 'divya']);
    expect([result.fromDistance, result.toDistance]).toEqual([2, 2]);
    expect(result.formalRelationship).toBe('First Cousins (Cross-cousins)');
    expect(result.kannadaFromTo).toContain('ಸೋದರತ್ತೆಯ');
    expect(result.kannadaToFrom).toContain('ಸೋದರಮಾವನ');
    expect(result.kannadaToFrom).toContain('ಬಾವ');
  });

  it('calculates cousin degree and removal from MRCA distances', () => {
    const ids = ['root', 'left1', 'left2', 'a', 'right1', 'right2', 'right3', 'b'];
    const family = ids.map((id) => person(id, id, 'unknown'));
    const familyUnits: FamilyUnit[] = [
      { id: 'r', husbandId: 'root', wifeId: null, anniversaryDate: null, childrenIds: ['left1', 'right1'] },
      { id: 'l1', husbandId: 'left1', wifeId: null, anniversaryDate: null, childrenIds: ['left2'] },
      { id: 'l2', husbandId: 'left2', wifeId: null, anniversaryDate: null, childrenIds: ['a'] },
      { id: 'r1', husbandId: 'right1', wifeId: null, anniversaryDate: null, childrenIds: ['right2'] },
      { id: 'r2', husbandId: 'right2', wifeId: null, anniversaryDate: null, childrenIds: ['right3'] },
      { id: 'r3', husbandId: 'right3', wifeId: null, anniversaryDate: null, childrenIds: ['b'] },
    ];
    const result = findRelationship('a', 'b', family, familyUnits)!;
    expect([result.fromDistance, result.toDistance]).toEqual([3, 4]);
    expect(result.formalRelationship).toBe('Second Cousins Once Removed');
    expect(result.label).toBe('Second cousin once removed');
  });

  it('uses birth dates for older and younger sibling terms', () => {
    const siblings = [person('parent', 'Parent', 'unknown'), person('older', 'Older', 'female', '1980-01-01'), person('younger', 'Younger', 'male', '1990-01-01')];
    const siblingUnit: FamilyUnit[] = [{ id: 'siblings', husbandId: 'parent', wifeId: null, anniversaryDate: null, childrenIds: ['older', 'younger'] }];
    const result = findRelationship('younger', 'older', siblings, siblingUnit)!;
    expect(result.kannadaFromTo).toBe('ಅಕ್ಕ (Akka)');
    expect(result.kannadaToFrom).toBe('ತಮ್ಮ (Tamma)');
  });

  it('preserves an explicit parent-in-law relationship through a spouse', () => {
    const family = [person('wife', 'Wife', 'female'), person('husband', 'Husband', 'male'), person('father', 'Father', 'male')];
    const familyUnits: FamilyUnit[] = [
      { id: 'origin', husbandId: 'father', wifeId: null, anniversaryDate: null, childrenIds: ['wife'] },
      { id: 'couple', husbandId: 'husband', wifeId: 'wife', anniversaryDate: null, childrenIds: [] },
    ];
    expect(findRelationship('husband', 'father', family, familyUnits)?.label).toBe('Father-in-law');
  });
});

describe('duplicateGroups', () => {
  it('normalizes names and uses date of birth', () => expect(duplicateGroups([person('a', ' Asha ', 'female', '1990-01-01'), person('b', 'asha', 'female', '1990-01-01')])).toHaveLength(1));
});
