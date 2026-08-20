import { useEffect, useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import type { FamilyUnit, FamilyUnitDraft, Gender, Person, PersonDraft } from '../types/family';

const EMPTY_PERSON: PersonDraft = { name: '', gender: 'unknown', dateOfBirth: null, dateOfDeath: null, isAlive: true, contactNumber: null, currentPlaceOfResidence: null };

interface PersonProps { open: boolean; person: Person | null; onClose: () => void; onSave: (draft: PersonDraft) => Promise<void>; onDelete?: () => Promise<void> }
export function PersonEditor({ open, person, onClose, onSave, onDelete }: PersonProps) {
  const [draft, setDraft] = useState<PersonDraft>(EMPTY_PERSON); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setDraft(person ? { name: person.name, gender: person.gender, dateOfBirth: person.dateOfBirth, dateOfDeath: person.dateOfDeath, isAlive: person.isAlive, contactNumber: person.contactNumber, currentPlaceOfResidence: person.currentPlaceOfResidence } : EMPTY_PERSON); setError(null); } }, [open, person]);
  if (!open) return null;
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(null); try { await onSave(draft); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save.'); } finally { setBusy(false); } };
  const remove = async () => { if (!onDelete || !window.confirm(`Delete ${person?.name}? This also removes them from family units.`)) return; setBusy(true); try { await onDelete(); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to delete.'); } finally { setBusy(false); } };
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><form className="editor-modal" onSubmit={(event) => void submit(event)} onMouseDown={(event) => event.stopPropagation()}>
    <div className="modal-head"><div><p className="eyebrow">{person ? 'Edit profile' : 'New profile'}</p><h2>{person ? person.name : 'Add a family member'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
    <div className="form-grid">
      <label className="field full"><span>Full name</span><input autoFocus required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Enter full name" /></label>
      <label className="field"><span>Gender</span><select value={draft.gender} onChange={(event) => setDraft({ ...draft, gender: event.target.value as Gender })}><option value="unknown">Not specified</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label>
      <label className="check-field"><input type="checkbox" checked={draft.isAlive} onChange={(event) => setDraft({ ...draft, isAlive: event.target.checked, dateOfDeath: event.target.checked ? null : draft.dateOfDeath })} /><span><strong>Living</strong><small>Turn off to record a date of death.</small></span></label>
      <label className="field"><span>Date of birth</span><input type="date" value={draft.dateOfBirth ?? ''} onChange={(event) => setDraft({ ...draft, dateOfBirth: event.target.value || null })} /></label>
      <label className="field"><span>Date of death</span><input type="date" disabled={draft.isAlive} value={draft.dateOfDeath ?? ''} onChange={(event) => setDraft({ ...draft, dateOfDeath: event.target.value || null })} /></label>
      <label className="field"><span>Contact number</span><input maxLength={32} value={draft.contactNumber ?? ''} onChange={(event) => setDraft({ ...draft, contactNumber: event.target.value || null })} placeholder="Optional" /></label>
      <label className="field"><span>Current residence</span><input maxLength={160} value={draft.currentPlaceOfResidence ?? ''} onChange={(event) => setDraft({ ...draft, currentPlaceOfResidence: event.target.value || null })} placeholder="City, state or country" /></label>
    </div>
    {error && <div className="error-banner" role="alert">{error}</div>}
    <div className="modal-actions">{onDelete && <button type="button" className="danger-button" disabled={busy} onClick={() => void remove()}><Trash2 size={15} /> Delete</button>}<span /><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={busy}><Check size={16} />{busy ? 'Saving…' : 'Save person'}</button></div>
  </form></div>;
}

interface UnitProps { open: boolean; unit: FamilyUnit | null; people: Person[]; onClose: () => void; onSave: (draft: FamilyUnitDraft) => Promise<void>; onDelete?: () => Promise<void> }
export function FamilyUnitEditor({ open, unit, people, onClose, onSave, onDelete }: UnitProps) {
  const [draft, setDraft] = useState<FamilyUnitDraft>({ husbandId: null, wifeId: null, anniversaryDate: null, childrenIds: [] }); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { const husbandId = unit?.husbandId ?? null; const wifeId = unit?.wifeId === husbandId ? null : unit?.wifeId ?? null; setDraft(unit ? { husbandId, wifeId, anniversaryDate: unit.anniversaryDate, childrenIds: unit.childrenIds.filter((id) => id !== husbandId && id !== wifeId) } : { husbandId: null, wifeId: null, anniversaryDate: null, childrenIds: [] }); setError(null); } }, [open, unit]);
  if (!open) return null;
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(null); try { await onSave(draft); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save.'); } finally { setBusy(false); } };
  const remove = async () => { if (!onDelete || !window.confirm('Delete this family unit? People will not be deleted.')) return; setBusy(true); try { await onDelete(); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to delete.'); } finally { setBusy(false); } };
  const chooseParent = (field: 'husbandId' | 'wifeId', personId: string | null) => setDraft((current) => {
    const otherField = field === 'husbandId' ? 'wifeId' : 'husbandId';
    return { ...current, [field]: personId, [otherField]: current[otherField] === personId ? null : current[otherField], childrenIds: current.childrenIds.filter((id) => id !== personId) };
  });
  const parentOptions = (otherParentId: string | null) => <><option value="">Not selected</option>{people.filter((person) => person.id !== otherParentId).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</>;
  const childOptions = people.filter((person) => person.id !== draft.husbandId && person.id !== draft.wifeId);
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><form className="editor-modal" onSubmit={(event) => void submit(event)} onMouseDown={(event) => event.stopPropagation()}>
    <div className="modal-head"><div><p className="eyebrow">Relationships</p><h2>{unit ? 'Edit family unit' : 'Connect a family'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
    <div className="form-grid"><label className="field"><span>Partner / husband</span><select value={draft.husbandId ?? ''} onChange={(event) => chooseParent('husbandId', event.target.value || null)}>{parentOptions(draft.wifeId)}</select></label><label className="field"><span>Partner / wife</span><select value={draft.wifeId ?? ''} onChange={(event) => chooseParent('wifeId', event.target.value || null)}>{parentOptions(draft.husbandId)}</select></label><label className="field full"><span>Anniversary</span><input type="date" value={draft.anniversaryDate ?? ''} onChange={(event) => setDraft({ ...draft, anniversaryDate: event.target.value || null })} /></label><label className="field full"><span>Children</span><select multiple size={Math.min(7, Math.max(4, childOptions.length))} value={draft.childrenIds} onChange={(event) => setDraft({ ...draft, childrenIds: [...new Set([...event.target.selectedOptions].map((option) => option.value))] })}>{childOptions.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><small>Parents are removed from this list automatically. Hold Command (Mac) or Ctrl (Windows) to select more than one child.</small></label></div>
    {error && <div className="error-banner" role="alert">{error}</div>}
    <div className="modal-actions">{onDelete && <button type="button" className="danger-button" disabled={busy} onClick={() => void remove()}><Trash2 size={15} /> Delete</button>}<span /><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={busy}><Check size={16} />{busy ? 'Saving…' : 'Save family'}</button></div>
  </form></div>;
}
