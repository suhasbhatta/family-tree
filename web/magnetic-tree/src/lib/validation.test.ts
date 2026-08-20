import { describe, expect, it } from 'vitest';
import { parseTreeImport, validatePersonDraft } from './validation';

describe('validatePersonDraft', () => {
  it('trims profile text', () => expect(validatePersonDraft({ name: '  Asha  ', gender: 'female', dateOfBirth: null, dateOfDeath: null, isAlive: true, contactNumber: null, currentPlaceOfResidence: ' Mysuru ' }).currentPlaceOfResidence).toBe('Mysuru'));
  it('rejects inconsistent living status', () => expect(() => validatePersonDraft({ name: 'Asha', gender: 'female', dateOfBirth: null, dateOfDeath: '2020-01-01', isAlive: true, contactNumber: null, currentPlaceOfResidence: null })).toThrow(/living person/i));
});

describe('parseTreeImport', () => {
  it('rejects unknown family references', () => expect(() => parseTreeImport(JSON.stringify({ people: [{ id: 'p1', name: 'Asha', gender: 'female', isAlive: true }], familyUnits: [{ id: 'f1', husbandId: 'missing', wifeId: null, childrenIds: [] }] }))).toThrow(/unknown person/i));
  it('rejects duplicate IDs', () => expect(() => parseTreeImport(JSON.stringify({ people: [{ id: 'p1', name: 'A', gender: 'unknown', isAlive: true }, { id: 'p1', name: 'B', gender: 'unknown', isAlive: true }], familyUnits: [] }))).toThrow(/duplicate person/i));
});
