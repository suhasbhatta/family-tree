import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hashPhone,
  normalizePhone,
  validateEditablePerson,
  validateFamilyUnit,
} from '../src/domain.js';

test('normalizes and hashes E.164 phone numbers without retaining the number', () => {
  const phone = normalizePhone('+91 99999-99999');
  assert.equal(phone, '+919999999999');
  assert.match(hashPhone(phone), /^[a-f0-9]{64}$/);
});

test('rejects malformed phone numbers', () => {
  assert.throws(() => normalizePhone('9999999999'));
  assert.throws(() => normalizePhone('+0123'));
});

test('validates and normalizes editable person fields', () => {
  const person = validateEditablePerson({
    name: '  Ananya  ',
    gender: 'female',
    dateOfBirth: '2002-04-03',
    dateOfDeath: null,
    isAlive: true,
    contactNumber: '+91 99999 99999',
    currentPlaceOfResidence: ' Bengaluru ',
  });
  assert.equal(person.name, 'Ananya');
  assert.equal(person.currentPlaceOfResidence, 'Bengaluru');
});

test('rejects mass assignment and inconsistent dates', () => {
  assert.throws(() => validateEditablePerson({
    name: 'A', gender: 'unknown', dateOfBirth: null, dateOfDeath: null,
    isAlive: true, contactNumber: null, currentPlaceOfResidence: null,
    unexpectedField: 'blocked',
  }));
  assert.throws(() => validateEditablePerson({
    name: 'A', gender: 'unknown', dateOfBirth: '2020-01-01',
    dateOfDeath: '2019-01-01', isAlive: false,
    contactNumber: null, currentPlaceOfResidence: null,
  }));
});

test('validates family unit invariants', () => {
  assert.deepEqual(validateFamilyUnit({
    husbandId: 'p1', wifeId: 'p2', anniversaryDate: null,
    childrenIds: ['p3'],
  }).childrenIds, ['p3']);
  assert.throws(() => validateFamilyUnit({
    husbandId: 'p1', wifeId: 'p1', anniversaryDate: null,
    childrenIds: [],
  }));
  assert.throws(() => validateFamilyUnit({
    husbandId: 'p1', wifeId: 'p2', anniversaryDate: null,
    childrenIds: ['p1'],
  }));
});
