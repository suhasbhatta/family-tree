import { useMemo, useState } from 'react';
import type { Person, PersonDraft } from '../types/family';
import type { RelativeKind } from '../components/NodeCard';
import { FamilyGraph } from '../lib/familyGraph';

let counter = 0;
function nextId() {
  counter += 1;
  return `p_new_${counter}`;
}

function birthYearFromDob(dob: string): number {
  const parsed = new Date(dob);
  if (dob && !Number.isNaN(parsed.getTime())) return parsed.getFullYear();
  return new Date().getFullYear();
}

export interface PendingAdd {
  anchorId: string;
  anchorName: string;
  kind: RelativeKind;
}

export function useFamilyTree(initial: Person[]) {
  const [people, setPeople] = useState<Person[]>(initial);
  const [pendingAdd, setPendingAdd] = useState<PendingAdd | null>(null);

  const graph = useMemo(() => new FamilyGraph(people), [people]);

  const requestAdd = (personId: string, kind: RelativeKind) => {
    const anchor = graph.get(personId);
    if (!anchor) return;
    if (kind === 'parent' && anchor.parentIds.length >= 2) return;
    setPendingAdd({ anchorId: personId, anchorName: anchor.name, kind });
  };

  const cancelAdd = () => setPendingAdd(null);

  const commitAdd = (draft: PersonDraft) => {
    if (!pendingAdd) return;
    const { anchorId, kind } = pendingAdd;

    setPeople((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      const anchor = byId.get(anchorId);
      if (!anchor) return prev;

      const newPerson: Person = {
        id: nextId(),
        name: draft.name.trim(),
        kannadaName: draft.kannadaName.trim(),
        gender: draft.gender,
        birthYear: birthYearFromDob(draft.dob),
        dob: draft.dob || undefined,
        placeOfResidence: draft.placeOfResidence.trim() || undefined,
        generation: anchor.generation,
        parentIds: [],
        spouseIds: [],
      };

      const list = [...prev];

      if (kind === 'spouse') {
        newPerson.spouseIds = [anchor.id];
        list.push(newPerson);
        return list.map((p) => (p.id === anchor.id ? { ...p, spouseIds: [...p.spouseIds, newPerson.id] } : p));
      }

      if (kind === 'child') {
        newPerson.generation = anchor.generation + 1;
        newPerson.parentIds = [anchor.id, ...anchor.spouseIds].slice(0, 2);
        list.push(newPerson);
        return list;
      }

      if (kind === 'parent') {
        newPerson.generation = anchor.generation - 1;
        list.push(newPerson);
        return list.map((p) => (p.id === anchor.id ? { ...p, parentIds: [...p.parentIds, newPerson.id] } : p));
      }

      if (kind === 'sibling') {
        newPerson.parentIds = [...anchor.parentIds];
        list.push(newPerson);
        return list;
      }

      return list;
    });

    setPendingAdd(null);
  };

  return { people, setPeople, graph, pendingAdd, requestAdd, cancelAdd, commitAdd };
}
