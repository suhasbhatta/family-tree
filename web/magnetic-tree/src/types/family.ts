export type Gender = 'male' | 'female' | 'other' | 'unknown';

export interface Person {
  id: string;
  version: number;
  name: string;
  gender: Gender;
  dateOfBirth: string | null;
  dateOfDeath: string | null;
  isAlive: boolean;
  contactNumber: string | null;
  currentPlaceOfResidence: string | null;
}

export interface FamilyUnit {
  id: string;
  husbandId: string | null;
  wifeId: string | null;
  anniversaryDate: string | null;
  childrenIds: string[];
}

export interface FamilyTreeData {
  appVersion: number;
  selectedRootFamilyUnitId: string | null;
  createdAt: string;
  updatedAt: string;
  people: Person[];
  familyUnits: FamilyUnit[];
}

export type PersonDraft = Omit<Person, 'id' | 'version'>;
export type FamilyUnitDraft = Omit<FamilyUnit, 'id'>;

export interface RelationshipResult {
  label: string;
  path: string[];
}
