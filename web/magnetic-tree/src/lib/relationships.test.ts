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
});

describe('duplicateGroups', () => {
  it('normalizes names and uses date of birth', () => expect(duplicateGroups([person('a', ' Asha ', 'female', '1990-01-01'), person('b', 'asha', 'female', '1990-01-01')])).toHaveLength(1));
});
