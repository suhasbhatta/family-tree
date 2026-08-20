import type { LineageColor, Person, RelationshipResult } from '../types/family';
import { FamilyGraph } from './familyGraph';

interface Term {
  english: string;
  kannadaScript: string;
  kannadaLabel: string;
  color: LineageColor;
}

function term(english: string, kannadaScript: string, kannadaLabel: string, color: LineageColor): Term {
  return { english, kannadaScript, kannadaLabel, color };
}

const SELF = term('Self', 'ಸ್ವಂತ', 'Swanta', 'emerald');
const SPOUSE_M = term('Husband', 'ಗಂಡ', 'Ganda', 'emerald');
const SPOUSE_F = term('Wife', 'ಹೆಂಡತಿ', 'Hendathi', 'emerald');
const FATHER = term('Father', 'ಅಪ್ಪ', 'Appa', 'emerald');
const MOTHER = term('Mother', 'ಅಮ್ಮ', 'Amma', 'emerald');
const SON = term('Son', 'ಮಗ', 'Maga', 'emerald');
const DAUGHTER = term('Daughter', 'ಮಗಳು', 'Magalu', 'emerald');
const GRANDFATHER = term('Grandfather', 'ಅಜ್ಜ', 'Ajja', 'emerald');
const GRANDMOTHER = term('Grandmother', 'ಅಜ್ಜಿ', 'Ajji', 'emerald');
const GRANDSON = term('Grandson', 'ಮೊಮ್ಮಗ', 'Mommaga', 'emerald');
const GRANDDAUGHTER = term('Granddaughter', 'ಮೊಮ್ಮಗಳು', 'Mommagalu', 'emerald');
const ELDER_BROTHER = term('Elder Brother', 'ಅಣ್ಣ', 'Anna', 'emerald');
const YOUNGER_BROTHER = term('Younger Brother', 'ತಮ್ಮ', 'Tamma', 'emerald');
const ELDER_SISTER = term('Elder Sister', 'ಅಕ್ಕ', 'Akka', 'emerald');
const YOUNGER_SISTER = term('Younger Sister', 'ತಂಗಿ', 'Tangi', 'emerald');
const CHIKKAPPA = term("Father's Younger Brother", 'ಚಿಕ್ಕಪ್ಪ', 'Chikkappa', 'cyan');
const CHIKKAMMA = term("Father's Younger Brother's Wife / Mother's Younger Sister", 'ಚಿಕ್ಕಮ್ಮ', 'Chikkamma', 'magenta');
const DODDAPPA = term("Father's Elder Brother", 'ದೊಡ್ಡಪ್ಪ', 'Doddappa', 'cyan');
const DODDAMMA = term("Father's Elder Brother's Wife / Mother's Elder Sister", 'ದೊಡ್ಡಮ್ಮ', 'Doddamma', 'magenta');
const ATTE = term("Father's Sister", 'ಅತ್ತೆ', 'Atte', 'cyan');
const MAWA = term("Mother's Brother", 'ಮಾವ', 'Mawa', 'magenta');
const NEPHEW = term('Nephew', 'ಸೋದರ ಮಗ', 'Sodara Maga', 'emerald');
const NIECE = term('Niece', 'ಸೋದರ ಮಗಳು', 'Sodara Magalu', 'emerald');
const COUSIN_M_PATERNAL = term('Cousin (Paternal)', 'ಸೋದರಸಂಬಂಧಿ', 'Sodara Sambandhi', 'cyan');
const COUSIN_F_PATERNAL = term('Cousin (Paternal)', 'ಸೋದರಸಂಬಂಧಿ', 'Sodara Sambandhi', 'cyan');
const COUSIN_M_MATERNAL = term('Cousin (Maternal)', 'ಸೋದರಸಂಬಂಧಿ', 'Sodara Sambandhi', 'magenta');
const COUSIN_F_MATERNAL = term('Cousin (Maternal)', 'ಸೋದರಸಂಬಂಧಿ', 'Sodara Sambandhi', 'magenta');

function distantTerm(distance: number, ancestor: boolean): Term {
  const label = ancestor ? `${distance}x Great-Grandparent` : `${distance}x Great-Grandchild`;
  const kn = ancestor ? 'ಪೂರ್ವಜ' : 'ವಂಶಸ್ಥ';
  return term(label, kn, ancestor ? 'Poorvaja' : 'Vamshastha', 'emerald');
}

function buildResult(graph: FamilyGraph, fromId: string, toId: string, t: Term, path: string[]): RelationshipResult {
  const fromName = graph.get(fromId)?.name ?? fromId;
  const toName = graph.get(toId)?.name ?? toId;
  return {
    englishLabel: `${toName} is ${fromName}'s ${t.english}`,
    kannadaLabel: t.kannadaLabel,
    kannadaScript: t.kannadaScript,
    path,
    color: t.color,
  };
}

/** Resolves the Kannada-precise relationship describing "toPerson is fromPerson's ___". */
export function findRelationship(graph: FamilyGraph, fromId: string, toId: string): RelationshipResult | null {
  const from = graph.get(fromId);
  const to = graph.get(toId);
  if (!from || !to) return null;
  if (fromId === toId) return buildResult(graph, fromId, toId, SELF, [fromId]);

  const direct = resolveDirect(graph, from, to);
  if (direct) return buildResult(graph, fromId, toId, direct.termUsed, direct.path);

  const reversedDirect = resolveDirect(graph, to, from);
  if (reversedDirect) {
    const inverted = invert(reversedDirect.termUsed, graph, from, to);
    if (inverted) return buildResult(graph, fromId, toId, inverted, [...reversedDirect.path].reverse());
  }

  return null;
}

interface DirectResolution {
  path: string[];
  termUsed: Term;
}

function resolveDirect(graph: FamilyGraph, from: Person, to: Person): DirectResolution | null {
  // Direct spouse
  if (from.spouseIds.includes(to.id)) {
    const t = to.gender === 'M' ? SPOUSE_M : SPOUSE_F;
    return { path: [from.id, to.id], termUsed: t };
  }

  const bloodResult = resolveBlood(graph, from.id, to.id);
  if (bloodResult) return bloodResult;

  // "to" married into a blood relative of "from" (e.g. uncle's wife, aunt's husband)
  for (const spouseOfTo of graph.spousesOf(to.id)) {
    const viaBlood = resolveBlood(graph, from.id, spouseOfTo.id);
    if (viaBlood) {
      const marriedTerm = spouseEquivalent(viaBlood.termUsed, to.gender);
      if (marriedTerm) {
        return { path: [...viaBlood.path, to.id], termUsed: marriedTerm };
      }
    }
  }

  return null;
}

function resolveBlood(graph: FamilyGraph, fromId: string, toId: string): DirectResolution | null {
  const ancestorsFrom = graph.getAncestors(fromId);
  const ancestorsTo = graph.getAncestors(toId);

  // "to" is a blood ancestor of "from"
  const toAsAncestor = ancestorsFrom.get(toId);
  if (toAsAncestor && toAsAncestor.distance > 0) {
    return { path: toAsAncestor.path, termUsed: ancestorTerm(toAsAncestor.distance, graph.get(toId)!.gender) };
  }

  // "to" is a blood descendant of "from"
  const fromAsAncestor = ancestorsTo.get(fromId);
  if (fromAsAncestor && fromAsAncestor.distance > 0) {
    return {
      path: [...fromAsAncestor.path].reverse(),
      termUsed: descendantTerm(fromAsAncestor.distance, graph.get(toId)!.gender),
    };
  }

  // Nearest common blood ancestor
  let best: { commonId: string; up: number; down: number } | null = null;
  for (const [id, entryFrom] of ancestorsFrom) {
    if (id === fromId) continue;
    const entryTo = ancestorsTo.get(id);
    if (entryTo && entryTo.distance > 0) {
      const total = entryFrom.distance + entryTo.distance;
      if (!best || total < best.up + best.down) {
        best = { commonId: id, up: entryFrom.distance, down: entryTo.distance };
      }
    }
  }
  if (!best) return null;

  const pathFrom = ancestorsFrom.get(best.commonId)!.path;
  const pathTo = ancestorsTo.get(best.commonId)!.path;
  const fullPath = [...pathFrom, ...pathTo.slice(0, -1).reverse()];

  if (best.up === 1 && best.down === 1) {
    const t = siblingTerm(graph.get(fromId)!, graph.get(toId)!);
    return { path: fullPath, termUsed: t };
  }

  if (best.up === 2 && best.down === 1) {
    const parentOfFrom = graph.get(pathFrom[1])!;
    const commonAncestor = graph.get(best.commonId)!;
    const t = auntUncleTerm(parentOfFrom, commonAncestor, graph.get(toId)!);
    return { path: fullPath, termUsed: t };
  }

  if (best.up === 1 && best.down === 2) {
    const t = graph.get(toId)!.gender === 'M' ? NEPHEW : NIECE;
    return { path: fullPath, termUsed: t };
  }

  if (best.up === 2 && best.down === 2) {
    const parentOfFrom = graph.get(pathFrom[1])!;
    const paternal = parentOfFrom.gender === 'M';
    const t = graph.get(toId)!.gender === 'M'
      ? paternal ? COUSIN_M_PATERNAL : COUSIN_M_MATERNAL
      : paternal ? COUSIN_F_PATERNAL : COUSIN_F_MATERNAL;
    return { path: fullPath, termUsed: t };
  }

  // Fallback for deeper/rarer connections
  const t = term(
    `Extended Relative (${best.up}↑/${best.down}↓)`,
    'ದೂರದ ಸಂಬಂಧಿ',
    'Doorada Sambandhi',
    best.up <= best.down ? 'cyan' : 'magenta',
  );
  return { path: fullPath, termUsed: t };
}

function ancestorTerm(distance: number, gender: Person['gender']): Term {
  if (distance === 1) return gender === 'M' ? FATHER : MOTHER;
  if (distance === 2) return gender === 'M' ? GRANDFATHER : GRANDMOTHER;
  return distantTerm(distance, true);
}

function descendantTerm(distance: number, gender: Person['gender']): Term {
  if (distance === 1) return gender === 'M' ? SON : DAUGHTER;
  if (distance === 2) return gender === 'M' ? GRANDSON : GRANDDAUGHTER;
  return distantTerm(distance, false);
}

function siblingTerm(from: Person, to: Person): Term {
  const toIsElder = to.birthYear < from.birthYear;
  if (to.gender === 'M') return toIsElder ? ELDER_BROTHER : YOUNGER_BROTHER;
  return toIsElder ? ELDER_SISTER : YOUNGER_SISTER;
}

/** commonAncestor is the shared grandparent; connectingParent is from's blood parent on the path to them. */
function auntUncleTerm(connectingParent: Person, _commonAncestor: Person, relative: Person): Term {
  const paternalSide = connectingParent.gender === 'M';
  const relativeIsElder = relative.birthYear < connectingParent.birthYear;

  if (paternalSide) {
    if (relative.gender === 'M') return relativeIsElder ? DODDAPPA : CHIKKAPPA;
    return ATTE;
  }
  if (relative.gender === 'F') return relativeIsElder ? DODDAMMA : CHIKKAMMA;
  return MAWA;
}

function spouseEquivalent(bloodTerm: Term, spouseGender: Person['gender']): Term | null {
  if (bloodTerm === DODDAPPA) return DODDAMMA;
  if (bloodTerm === CHIKKAPPA) return CHIKKAMMA;
  if (bloodTerm === DODDAMMA) return term("Elder Aunt's Husband", 'ದೊಡ್ಡಮ್ಮನ ಪತಿ', 'Doddammana Pati', 'magenta');
  if (bloodTerm === CHIKKAMMA) return term("Younger Aunt's Husband", 'ಚಿಕ್ಕಮ್ಮನ ಪತಿ', 'Chikkammana Pati', 'magenta');
  if (bloodTerm === ATTE) return term("Atte's Husband", 'ಅತ್ತೆಯ ಪತಿ', 'Atteya Pati', 'cyan');
  if (bloodTerm === MAWA) return term("Mawa's Wife", 'ಮಾವನ ಪತ್ನಿ', 'Mavana Patni', 'magenta');
  if (bloodTerm === FATHER) return MOTHER;
  if (bloodTerm === MOTHER) return FATHER;
  if (bloodTerm === ELDER_BROTHER || bloodTerm === YOUNGER_BROTHER) {
    return spouseGender === 'F' ? term('Sister-in-law', 'ಅತ್ತಿಗೆ/ನಾದಿನಿ', 'Attige/Naadini', 'emerald') : null;
  }
  return null;
}

function invert(bloodTerm: Term, graph: FamilyGraph, newFrom: Person, newTo: Person): Term | null {
  if (bloodTerm === FATHER || bloodTerm === MOTHER) return newTo.gender === 'M' ? SON : DAUGHTER;
  if (bloodTerm === SON || bloodTerm === DAUGHTER) return newTo.gender === 'M' ? FATHER : MOTHER;
  if (bloodTerm === GRANDFATHER || bloodTerm === GRANDMOTHER) return newTo.gender === 'M' ? GRANDSON : GRANDDAUGHTER;
  if (bloodTerm === GRANDSON || bloodTerm === GRANDDAUGHTER) return newTo.gender === 'M' ? GRANDFATHER : GRANDMOTHER;
  if ([ELDER_BROTHER, YOUNGER_BROTHER, ELDER_SISTER, YOUNGER_SISTER].includes(bloodTerm)) {
    return siblingTerm(newFrom, newTo);
  }
  if ([DODDAPPA, CHIKKAPPA, DODDAMMA, CHIKKAMMA, ATTE, MAWA].includes(bloodTerm)) {
    return newTo.gender === 'M' ? NEPHEW : NIECE;
  }
  if (bloodTerm === NEPHEW || bloodTerm === NIECE) {
    void graph;
    return null; // ambiguous without recomputing side; leave unresolved
  }
  return null;
}
