import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Person } from '../types/family';

export function SearchPalette({ open, people, onClose, onChoose }: { open: boolean; people: Person[]; onClose: () => void; onChoose: (id: string) => void }) {
  const [query, setQuery] = useState(''); useEffect(() => { if (open) setQuery(''); }, [open]);
  const matches = useMemo(() => people.filter((person) => `${person.name} ${person.currentPlaceOfResidence ?? ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice(0, 12), [people, query]);
  if (!open) return null;
  return <div className="modal-backdrop search-backdrop" role="presentation" onMouseDown={onClose}><section className="search-palette" onMouseDown={(event) => event.stopPropagation()}><div className="search-input"><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or residence…" /><button type="button" onClick={onClose} aria-label="Close"><X size={16} /></button></div><div className="search-results">{matches.length ? matches.map((person) => <button key={person.id} type="button" onClick={() => { onChoose(person.id); onClose(); }}><span className={`avatar avatar-${person.gender}`}>{person.name[0]}</span><span><strong>{person.name}</strong><small>{person.currentPlaceOfResidence || (person.dateOfBirth ? `Born ${person.dateOfBirth}` : 'No additional details')}</small></span></button>) : <p>No family members match that search.</p>}</div><footer><span>↑↓ Navigate</span><span>Enter Select</span><span>Esc Close</span></footer></section></div>;
}
