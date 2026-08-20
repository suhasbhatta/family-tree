export type Gender = 'M' | 'F';

export interface Person {
  id: string;
  name: string;
  kannadaName: string;
  gender: Gender;
  birthYear: number;
  /** ISO date string (yyyy-mm-dd), when known precisely. */
  dob?: string;
  placeOfResidence?: string;
  /** Generation index, 0 = eldest generation in the tree. Used for layout rows. */
  generation: number;
  /** Biological parent ids (0, 1, or 2 entries). */
  parentIds: string[];
  /** Spouse ids (usually 0 or 1 entry, but supports remarriage). */
  spouseIds: string[];
  title?: string;
}

export interface PersonDraft {
  name: string;
  kannadaName: string;
  gender: Gender;
  dob: string;
  placeOfResidence: string;
}

export type LineageColor = 'cyan' | 'magenta' | 'emerald';

export interface RelationshipResult {
  /** "toPerson is fromPerson's ___" */
  englishLabel: string;
  kannadaLabel: string;
  kannadaScript: string;
  /** Ordered node ids tracing the connection for the neon path animation. */
  path: string[];
  color: LineageColor;
}
