import type { FamilyTreeData, FamilyUnit, Gender, Person, PersonDraft } from '../types/family';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const GENDERS = new Set<Gender>(['male', 'female', 'other', 'unknown']);

function nullableText(value: unknown, max: number): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new Error('Expected text.');
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`Text must be ${max} characters or fewer.`);
  return normalized || null;
}

function nullableDate(value: unknown): string | null {
  const date = nullableText(value, 10);
  if (date === null) return null;
  if (!DATE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new Error('Dates must use YYYY-MM-DD.');
  return date;
}

export function validId(value: unknown, label = 'ID'): string {
  if (typeof value !== 'string' || !ID.test(value)) throw new Error(`${label} may contain only letters, numbers, hyphens, and underscores.`);
  return value;
}

export function validatePersonDraft(value: PersonDraft): PersonDraft {
  const name = nullableText(value.name, 120);
  if (!name) throw new Error('Name is required.');
  if (!GENDERS.has(value.gender)) throw new Error('Choose a valid gender.');
  const dateOfBirth = nullableDate(value.dateOfBirth);
  const dateOfDeath = nullableDate(value.dateOfDeath);
  if (dateOfBirth && dateOfDeath && dateOfDeath < dateOfBirth) throw new Error('Date of death cannot be before date of birth.');
  if (value.isAlive && dateOfDeath) throw new Error('A living person cannot have a date of death.');
  return { name, gender: value.gender, dateOfBirth, dateOfDeath, isAlive: Boolean(value.isAlive), contactNumber: nullableText(value.contactNumber, 32), currentPlaceOfResidence: nullableText(value.currentPlaceOfResidence, 160) };
}

function readPerson(raw: unknown): Person {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid person record.');
  const item = raw as Record<string, unknown>;
  const draft = validatePersonDraft({ name: String(item.name ?? ''), gender: item.gender as Gender, dateOfBirth: item.dateOfBirth as string | null, dateOfDeath: item.dateOfDeath as string | null, isAlive: item.isAlive !== false, contactNumber: item.contactNumber as string | null, currentPlaceOfResidence: item.currentPlaceOfResidence as string | null });
  return { id: validId(item.id, 'Person ID'), version: Number.isInteger(item.version) ? Number(item.version) : 0, ...draft };
}

function readUnit(raw: unknown): FamilyUnit {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid family unit.');
  const item = raw as Record<string, unknown>;
  const husbandId = item.husbandId == null ? null : validId(item.husbandId, 'Person ID');
  const wifeId = item.wifeId == null ? null : validId(item.wifeId, 'Person ID');
  if (!Array.isArray(item.childrenIds) || item.childrenIds.length > 100) throw new Error('Invalid children list.');
  const childrenIds = [...new Set(item.childrenIds.map((id) => validId(id, 'Child ID')))];
  if (!husbandId && !wifeId) throw new Error('A family unit needs at least one parent.');
  return { id: validId(item.id, 'Family unit ID'), husbandId, wifeId, anniversaryDate: nullableDate(item.anniversaryDate), childrenIds };
}

export function parseTreeImport(text: string): FamilyTreeData {
  if (new Blob([text]).size > 512 * 1024) throw new Error('Import files must be 512 KB or smaller.');
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('Choose a valid JSON family-tree export.'); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid tree document.');
  const item = raw as Record<string, unknown>;
  if (!Array.isArray(item.people) || !Array.isArray(item.familyUnits)) throw new Error('The export needs people and familyUnits lists.');
  if (item.people.length > 300 || item.familyUnits.length > 150) throw new Error('Import exceeds the supported tree size.');
  const people = item.people.map(readPerson);
  const familyUnits = item.familyUnits.map(readUnit);
  const personIds = new Set(people.map((person) => person.id));
  if (personIds.size !== people.length) throw new Error('Duplicate person IDs are not allowed.');
  const unitIds = new Set(familyUnits.map((unit) => unit.id));
  if (unitIds.size !== familyUnits.length) throw new Error('Duplicate family-unit IDs are not allowed.');
  for (const unit of familyUnits) for (const id of [unit.husbandId, unit.wifeId, ...unit.childrenIds]) if (id && !personIds.has(id)) throw new Error(`Family unit ${unit.id} references an unknown person.`);
  const selectedRootFamilyUnitId = item.selectedRootFamilyUnitId == null ? null : validId(item.selectedRootFamilyUnitId, 'Root ID');
  if (selectedRootFamilyUnitId && !unitIds.has(selectedRootFamilyUnitId)) throw new Error('The selected root family unit does not exist.');
  return { appVersion: 2, selectedRootFamilyUnitId, createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(), updatedAt: new Date().toISOString(), people, familyUnits };
}
