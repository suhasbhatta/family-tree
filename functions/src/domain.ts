import {createHash} from 'node:crypto';

export const EDITABLE_PERSON_FIELDS = [
  'name',
  'gender',
  'dateOfBirth',
  'dateOfDeath',
  'isAlive',
  'contactNumber',
  'currentPlaceOfResidence',
] as const;

export type EditablePerson = {
  name: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  dateOfBirth: string | null;
  dateOfDeath: string | null;
  isAlive: boolean;
  contactNumber: string | null;
  currentPlaceOfResidence: string | null;
};

export function normalizePhone(value: unknown): string {
  if (typeof value !== 'string') throw new Error('invalid-phone');
  const normalized = value.trim().replace(/[\s()-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error('invalid-phone');
  }
  return normalized;
}

export function hashPhone(phoneE164: string): string {
  return createHash('sha256').update(phoneE164, 'utf8').digest('hex');
}

function cleanString(
  value: unknown,
  field: string,
  maxLength: number,
  nullable = false,
): string | null {
  if (value === null && nullable) return null;
  if (typeof value !== 'string') throw new Error(`invalid-${field}`);
  const cleaned = value.trim().normalize('NFC');
  if ((!nullable && cleaned.length === 0) || cleaned.length > maxLength) {
    throw new Error(`invalid-${field}`);
  }
  if ([...cleaned].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  })) {
    throw new Error(`invalid-${field}`);
  }
  return cleaned.length === 0 && nullable ? null : cleaned;
}

function cleanDate(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`invalid-${field}`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`invalid-${field}`);
  }
  const today = new Date().toISOString().slice(0, 10);
  if (value < '1800-01-01' || value > today) throw new Error(`invalid-${field}`);
  return value;
}

export function validateEditablePerson(value: unknown): EditablePerson {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid-person');
  }
  const input = value as Record<string, unknown>;
  const unknown = Object.keys(input).filter(
    (key) => !(EDITABLE_PERSON_FIELDS as readonly string[]).includes(key),
  );
  if (unknown.length > 0) throw new Error('unknown-person-field');
  const gender = input.gender;
  if (!['male', 'female', 'other', 'unknown'].includes(String(gender))) {
    throw new Error('invalid-gender');
  }
  if (typeof input.isAlive !== 'boolean') throw new Error('invalid-isAlive');
  const dateOfBirth = cleanDate(input.dateOfBirth, 'dateOfBirth');
  const dateOfDeath = cleanDate(input.dateOfDeath, 'dateOfDeath');
  if (input.isAlive && dateOfDeath !== null) throw new Error('alive-with-death-date');
  if (dateOfBirth && dateOfDeath && dateOfDeath < dateOfBirth) {
    throw new Error('death-before-birth');
  }
  const contact = cleanString(input.contactNumber, 'contactNumber', 20, true);
  if (contact && !/^[+0-9 ()-]+$/.test(contact)) {
    throw new Error('invalid-contactNumber');
  }
  return {
    name: cleanString(input.name, 'name', 100) as string,
    gender: gender as EditablePerson['gender'],
    dateOfBirth,
    dateOfDeath,
    isAlive: input.isAlive,
    contactNumber: contact,
    currentPlaceOfResidence: cleanString(
      input.currentPlaceOfResidence,
      'currentPlaceOfResidence',
      200,
      true,
    ),
  };
}

export type FamilyUnitInput = {
  husbandId: string | null;
  wifeId: string | null;
  anniversaryDate: string | null;
  childrenIds: string[];
};

export function validateFamilyUnit(value: unknown): FamilyUnitInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid-family-unit');
  }
  const input = value as Record<string, unknown>;
  const id = (field: string): string | null => {
    const raw = input[field];
    if (raw === null) return null;
    if (typeof raw !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(raw)) {
      throw new Error(`invalid-${field}`);
    }
    return raw;
  };
  if (!Array.isArray(input.childrenIds) || input.childrenIds.length > 100) {
    throw new Error('invalid-childrenIds');
  }
  const childrenIds = input.childrenIds.map((child) => {
    if (typeof child !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(child)) {
      throw new Error('invalid-child-id');
    }
    return child;
  });
  if (new Set(childrenIds).size !== childrenIds.length) {
    throw new Error('duplicate-child');
  }
  const husbandId = id('husbandId');
  const wifeId = id('wifeId');
  if (!husbandId && !wifeId) throw new Error('missing-spouse');
  if (husbandId && husbandId === wifeId) throw new Error('same-spouse');
  if (childrenIds.includes(husbandId ?? '') || childrenIds.includes(wifeId ?? '')) {
    throw new Error('spouse-is-child');
  }
  return {
    husbandId,
    wifeId,
    anniversaryDate: cleanDate(input.anniversaryDate, 'anniversaryDate'),
    childrenIds,
  };
}

export function validId(value: unknown, field = 'id'): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new Error(`invalid-${field}`);
  }
  return value;
}
