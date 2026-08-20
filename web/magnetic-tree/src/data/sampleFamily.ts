import type { Person } from '../types/family';

/**
 * Two grandparent couples (paternal Rao line, maternal Gowda line) joined by
 * the Krishna-Lakshmi marriage. Generation depth is intrinsic to each person
 * (distance from their own blood ancestors), so it stays consistent across
 * both families even though they're viewed from a single tree.
 */
export const sampleFamily: Person[] = [
  // Generation 0 — grandparents
  { id: 'p_ranganatha', name: 'Ranganatha Rao', kannadaName: 'ರಂಗನಾಥ ರಾವ್', gender: 'M', birthYear: 1945, generation: 0, parentIds: [], spouseIds: ['p_saraswati'] },
  { id: 'p_saraswati', name: 'Saraswati Rao', kannadaName: 'ಸರಸ್ವತಿ ರಾವ್', gender: 'F', birthYear: 1948, generation: 0, parentIds: [], spouseIds: ['p_ranganatha'] },
  { id: 'p_basavaraj', name: 'Basavaraj Gowda', kannadaName: 'ಬಸವರಾಜ ಗೌಡ', gender: 'M', birthYear: 1943, generation: 0, parentIds: [], spouseIds: ['p_girija'] },
  { id: 'p_girija', name: 'Girija Gowda', kannadaName: 'ಗಿರಿಜಾ ಗೌಡ', gender: 'F', birthYear: 1946, generation: 0, parentIds: [], spouseIds: ['p_basavaraj'] },

  // Generation 1 — parents' generation (blood children + married-in spouses)
  { id: 'p_gopala', name: 'Gopala Rao', kannadaName: 'ಗೋಪಾಲ ರಾವ್', gender: 'M', birthYear: 1967, generation: 1, parentIds: ['p_ranganatha', 'p_saraswati'], spouseIds: ['p_radha'] },
  { id: 'p_radha', name: 'Radha Rao', kannadaName: 'ರಾಧಾ ರಾವ್', gender: 'F', birthYear: 1969, generation: 1, parentIds: [], spouseIds: ['p_gopala'] },
  { id: 'p_krishna', name: 'Krishna Rao', kannadaName: 'ಕೃಷ್ಣ ರಾವ್', gender: 'M', birthYear: 1970, generation: 1, parentIds: ['p_ranganatha', 'p_saraswati'], spouseIds: ['p_lakshmi'] },
  { id: 'p_lakshmi', name: 'Lakshmi Rao', kannadaName: 'ಲಕ್ಷ್ಮಿ ರಾವ್', gender: 'F', birthYear: 1973, generation: 1, parentIds: ['p_basavaraj', 'p_girija'], spouseIds: ['p_krishna'] },
  { id: 'p_suresh', name: 'Suresh Rao', kannadaName: 'ಸುರೇಶ ರಾವ್', gender: 'M', birthYear: 1975, generation: 1, parentIds: ['p_ranganatha', 'p_saraswati'], spouseIds: ['p_meera'] },
  { id: 'p_meera', name: 'Meera Rao', kannadaName: 'ಮೀರಾ ರಾವ್', gender: 'F', birthYear: 1977, generation: 1, parentIds: [], spouseIds: ['p_suresh'] },
  { id: 'p_vijaya', name: 'Vijaya', kannadaName: 'ವಿಜಯಾ', gender: 'F', birthYear: 1972, generation: 1, parentIds: ['p_ranganatha', 'p_saraswati'], spouseIds: ['p_ramesh'] },
  { id: 'p_ramesh', name: 'Ramesh Gowda', kannadaName: 'ರಮೇಶ ಗೌಡ', gender: 'M', birthYear: 1970, generation: 1, parentIds: [], spouseIds: ['p_vijaya'] },
  { id: 'p_sunanda', name: 'Sunanda', kannadaName: 'ಸುನಂದಾ', gender: 'F', birthYear: 1969, generation: 1, parentIds: ['p_basavaraj', 'p_girija'], spouseIds: ['p_nagesh'] },
  { id: 'p_nagesh', name: 'Nagesh Hegde', kannadaName: 'ನಾಗೇಶ ಹೆಗ್ಡೆ', gender: 'M', birthYear: 1967, generation: 1, parentIds: [], spouseIds: ['p_sunanda'] },
  { id: 'p_manjunath', name: 'Manjunath Gowda', kannadaName: 'ಮಂಜುನಾಥ ಗೌಡ', gender: 'M', birthYear: 1976, generation: 1, parentIds: ['p_basavaraj', 'p_girija'], spouseIds: ['p_shobha'] },
  { id: 'p_shobha', name: 'Shobha Gowda', kannadaName: 'ಶೋಭಾ ಗೌಡ', gender: 'F', birthYear: 1978, generation: 1, parentIds: [], spouseIds: ['p_manjunath'] },
  { id: 'p_kavitha', name: 'Kavitha', kannadaName: 'ಕವಿತಾ', gender: 'F', birthYear: 1978, generation: 1, parentIds: ['p_basavaraj', 'p_girija'], spouseIds: ['p_prakash'] },
  { id: 'p_prakash', name: 'Prakash Hegde', kannadaName: 'ಪ್ರಕಾಶ ಹೆಗ್ಡೆ', gender: 'M', birthYear: 1976, generation: 1, parentIds: [], spouseIds: ['p_kavitha'] },

  // Generation 2 — Arjun's generation
  { id: 'p_deepak', name: 'Deepak Rao', kannadaName: 'ದೀಪಕ್ ರಾವ್', gender: 'M', birthYear: 1996, generation: 2, parentIds: ['p_gopala', 'p_radha'], spouseIds: [] },
  { id: 'p_rohit', name: 'Rohit Rao', kannadaName: 'ರೋಹಿತ್ ರಾವ್', gender: 'M', birthYear: 1995, generation: 2, parentIds: ['p_krishna', 'p_lakshmi'], spouseIds: [] },
  { id: 'p_sneha', name: 'Sneha Rao', kannadaName: 'ಸ್ನೇಹಾ ರಾವ್', gender: 'F', birthYear: 1996, generation: 2, parentIds: ['p_krishna', 'p_lakshmi'], spouseIds: [] },
  { id: 'p_arjun', name: 'Arjun Rao', kannadaName: 'ಅರ್ಜುನ್ ರಾವ್', gender: 'M', birthYear: 1998, generation: 2, parentIds: ['p_krishna', 'p_lakshmi'], spouseIds: [], title: 'You' },
  { id: 'p_divya', name: 'Divya Rao', kannadaName: 'ದಿವ್ಯಾ ರಾವ್', gender: 'F', birthYear: 2001, generation: 2, parentIds: ['p_krishna', 'p_lakshmi'], spouseIds: [] },
  { id: 'p_nikhil', name: 'Nikhil Rao', kannadaName: 'ನಿಖಿಲ್ ರಾವ್', gender: 'M', birthYear: 1999, generation: 2, parentIds: ['p_suresh', 'p_meera'], spouseIds: [] },
  { id: 'p_pooja', name: 'Pooja Gowda', kannadaName: 'ಪೂಜಾ ಗೌಡ', gender: 'F', birthYear: 1997, generation: 2, parentIds: ['p_vijaya', 'p_ramesh'], spouseIds: [] },
  { id: 'p_kiran', name: 'Kiran Hegde', kannadaName: 'ಕಿರಣ್ ಹೆಗ್ಡೆ', gender: 'M', birthYear: 1994, generation: 2, parentIds: ['p_sunanda', 'p_nagesh'], spouseIds: [] },
  { id: 'p_varun', name: 'Varun Gowda', kannadaName: 'ವರುಣ್ ಗೌಡ', gender: 'M', birthYear: 2000, generation: 2, parentIds: ['p_manjunath', 'p_shobha'], spouseIds: [] },
  { id: 'p_ananya', name: 'Ananya Hegde', kannadaName: 'ಅನನ್ಯ ಹೆಗ್ಡೆ', gender: 'F', birthYear: 2002, generation: 2, parentIds: ['p_kavitha', 'p_prakash'], spouseIds: [] },
];
