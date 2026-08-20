import { sampleFamily } from '../src/data/sampleFamily';
import { FamilyGraph } from '../src/lib/familyGraph';
import { findRelationship } from '../src/lib/relationshipEngine';

const graph = new FamilyGraph(sampleFamily);

const cases: [string, string, string][] = [
  ['p_arjun', 'p_ranganatha', 'Ajja (paternal grandfather)'],
  ['p_arjun', 'p_saraswati', 'Ajji (paternal grandmother)'],
  ['p_arjun', 'p_basavaraj', 'Ajja (maternal grandfather)'],
  ['p_arjun', 'p_suresh', 'Chikkappa (father\'s younger brother)'],
  ['p_arjun', 'p_meera', 'Chikkamma (chikkappa\'s wife)'],
  ['p_arjun', 'p_gopala', 'Doddappa (father\'s elder brother)'],
  ['p_arjun', 'p_radha', 'Doddamma (doddappa\'s wife)'],
  ['p_arjun', 'p_vijaya', 'Atte (father\'s sister)'],
  ['p_arjun', 'p_manjunath', 'Mawa (mother\'s brother)'],
  ['p_arjun', 'p_sunanda', 'Doddamma (mother\'s elder sister)'],
  ['p_arjun', 'p_kavitha', 'Chikkamma (mother\'s younger sister)'],
  ['p_arjun', 'p_rohit', 'Anna (elder brother)'],
  ['p_arjun', 'p_sneha', 'Akka (elder sister)'],
  ['p_arjun', 'p_divya', 'Tangi (younger sister)'],
  ['p_arjun', 'p_deepak', 'cousin (paternal, doddappa\'s son) -> should read as brother-ish? Actually cousin'],
  ['p_arjun', 'p_pooja', 'cousin (maternal, atte\'s daughter)'],
  ['p_arjun', 'p_krishna', 'Appa (father) reverse of son'],
  ['p_arjun', 'p_lakshmi', 'Amma (mother)'],
  ['p_arjun', 'p_deepak', 'cousin check'],
  ['p_ranganatha', 'p_arjun', 'Grandson (mommaga) reverse test'],
  ['p_krishna', 'p_suresh', 'Tamma (younger brother) reverse'],
  ['p_suresh', 'p_krishna', 'Anna (elder brother) reverse'],
];

for (const [from, to, expected] of cases) {
  const result = findRelationship(graph, from, to);
  const fromName = graph.get(from)?.name;
  const toName = graph.get(to)?.name;
  console.log(
    `${fromName} -> ${toName}: ${result ? `${result.kannadaLabel} (${result.kannadaScript})` : 'NULL'}  [[expected: ${expected}]]`,
  );
}
