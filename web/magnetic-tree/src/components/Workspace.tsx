import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Archive, ChevronRight, Crown, Download, GitBranch, HeartHandshake, LogOut, Menu, Network, Plus, Search, Settings2, Sparkles, Trash2, Upload, Users, X } from 'lucide-react';
import type { AdminIdentity } from '../lib/firebase';
import { importTree, loadTree, logout, removeFamilyUnit, removePerson, saveFamilyUnit, savePerson, setRoot } from '../lib/firebase';
import { duplicateGroups, findRelationship } from '../lib/relationships';
import { parseTreeImport } from '../lib/validation';
import type { FamilyTreeData, FamilyUnit, FamilyUnitDraft, Person, PersonDraft } from '../types/family';
import { FamilyUnitEditor, PersonEditor } from './EditorModal';
import { SearchPalette } from './SearchPalette';
import { TreeCanvas } from './TreeCanvas';

type View = 'tree' | 'people' | 'families' | 'relationships' | 'tools';

const VIEW_META: Record<View, { label: string; icon: typeof Network; subtitle: string }> = {
  tree: { label: 'Family tree', icon: Network, subtitle: 'Explore every generation' },
  people: { label: 'People', icon: Users, subtitle: 'Manage family profiles' },
  families: { label: 'Family units', icon: HeartHandshake, subtitle: 'Connect partners and children' },
  relationships: { label: 'Relationships', icon: GitBranch, subtitle: 'Find how two people connect' },
  tools: { label: 'Data & settings', icon: Settings2, subtitle: 'Root family, import, and export' },
};

function LoadingScreen() { return <div className="loading-screen"><div className="brand-mark"><GitBranch size={23} /></div><span className="loading-ring" /><p>Opening your family archive…</p></div>; }

export function Workspace({ identity }: { identity: AdminIdentity }) {
  const [tree, setTree] = useState<FamilyTreeData | null>(null); const [view, setView] = useState<View>('tree'); const [error, setError] = useState<string | null>(null); const [toast, setToast] = useState<string | null>(null); const [navOpen, setNavOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null); const [focusPersonId, setFocusPersonId] = useState<string | null>(null); const [path, setPath] = useState<string[]>([]); const [searchOpen, setSearchOpen] = useState(false);
  const [personEditor, setPersonEditor] = useState<{ open: boolean; person: Person | null }>({ open: false, person: null }); const [unitEditor, setUnitEditor] = useState<{ open: boolean; unit: FamilyUnit | null }>({ open: false, unit: null });
  const fileRef = useRef<HTMLInputElement | null>(null);
  const refresh = useCallback(async () => { try { setError(null); setTree(await loadTree()); } catch { setError('The family tree could not be loaded. Check your connection and Firestore access.'); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { const key = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); } if (event.key === 'Escape') setSearchOpen(false); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, []);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 3200); };
  const navigate = (next: View) => { setView(next); setNavOpen(false); if (next !== 'tree') setSelectedPersonId(null); };
  if (!tree && !error) return <LoadingScreen />;
  if (!tree) return <div className="fatal-state"><AlertTriangle size={28} /><h2>Unable to open the archive</h2><p>{error}</p><button className="primary-button" onClick={() => void refresh()}>Try again</button></div>;
  const selected = tree.people.find((person) => person.id === selectedPersonId) ?? null;

  const savePersonAction = async (draft: PersonDraft) => { await savePerson(personEditor.person?.id ?? null, draft, personEditor.person?.version ?? 0); await refresh(); notify(personEditor.person ? 'Profile updated' : 'Family member added'); };
  const deletePersonAction = async () => { if (!personEditor.person) return; await removePerson(personEditor.person.id); setSelectedPersonId(null); await refresh(); notify('Family member deleted'); };
  const saveUnitAction = async (draft: FamilyUnitDraft) => { await saveFamilyUnit(unitEditor.unit?.id ?? null, draft); await refresh(); notify(unitEditor.unit ? 'Family unit updated' : 'Family connected'); };
  const deleteUnitAction = async () => { if (!unitEditor.unit) return; await removeFamilyUnit(unitEditor.unit.id); await refresh(); notify('Family unit deleted'); };
  const deletePersonDirect = async (person: Person) => { if (!window.confirm(`Delete ${person.name}? They will be removed from every family connection. Empty family units will also be deleted.`)) return; try { await removePerson(person.id); if (selectedPersonId === person.id) setSelectedPersonId(null); await refresh(); notify('Family member deleted'); } catch { setError('The family member could not be deleted. Reload and try again.'); } };
  const deleteUnitDirect = async (unit: FamilyUnit) => { if (!window.confirm('Delete this family unit? The people themselves will be preserved.')) return; try { await removeFamilyUnit(unit.id); await refresh(); notify('Family unit deleted'); } catch { setError('The family unit could not be deleted. Reload and try again.'); } };
  const choosePerson = (id: string) => { setView('tree'); setSelectedPersonId(id); setFocusPersonId(id); window.setTimeout(() => setFocusPersonId(null), 800); };

  return <div className="app-shell">
    <aside className={`sidebar ${navOpen ? 'open' : ''}`}><div className="sidebar-brand"><div className="brand-mark small"><GitBranch size={19} /></div><div><strong>Parivara</strong><small>Family archive</small></div><button type="button" className="nav-close" onClick={() => setNavOpen(false)}><X size={18} /></button></div>
      <nav><p>Workspace</p>{(Object.keys(VIEW_META) as View[]).map((key) => { const item = VIEW_META[key]; const Icon = item.icon; return <button key={key} type="button" className={view === key ? 'active' : ''} onClick={() => navigate(key)}><Icon size={17} /><span>{item.label}</span>{key === 'people' && <b>{tree.people.length}</b>}</button>; })}</nav>
      <div className="sidebar-profile"><span className="profile-avatar">{identity.displayName[0]?.toLocaleUpperCase()}</span><div><strong>{identity.displayName}</strong><small>Administrator</small></div><button type="button" onClick={() => void logout()} aria-label="Sign out"><LogOut size={16} /></button></div>
    </aside>
    {navOpen && <button className="nav-scrim" onClick={() => setNavOpen(false)} aria-label="Close navigation" />}
    <main className="workspace"><header className="topbar"><button type="button" className="menu-button" onClick={() => setNavOpen(true)}><Menu size={20} /></button><div><p>{VIEW_META[view].subtitle}</p><h1>{VIEW_META[view].label}</h1></div><div className="topbar-actions"><button type="button" className="search-trigger" onClick={() => setSearchOpen(true)}><Search size={16} /><span>Search family</span><kbd>⌘ K</kbd></button>{view === 'people' && <button type="button" className="primary-button" onClick={() => setPersonEditor({ open: true, person: null })}><Plus size={16} /> Add person</button>}{view === 'families' && <button type="button" className="primary-button" onClick={() => setUnitEditor({ open: true, unit: null })}><Plus size={16} /> Connect family</button>}</div></header>
      {error && <div className="workspace-error"><AlertTriangle size={16} />{error}<button onClick={() => setError(null)}>Dismiss</button></div>}
      <section className="view-area">
        {view === 'tree' && <TreeCanvas tree={tree} selectedPersonId={selectedPersonId} focusPersonId={focusPersonId} highlightedPath={path} onSelect={setSelectedPersonId} onOpenSearch={() => setSearchOpen(true)} />}
        {view === 'people' && <PeopleView tree={tree} onSelect={choosePerson} onEdit={(person) => setPersonEditor({ open: true, person })} onDelete={(person) => void deletePersonDirect(person)} />}
        {view === 'families' && <FamiliesView tree={tree} onEdit={(unit) => setUnitEditor({ open: true, unit })} onDelete={(unit) => void deleteUnitDirect(unit)} />}
        {view === 'relationships' && <RelationshipsView tree={tree} onResult={(nextPath) => { setPath(nextPath); setView('tree'); }} />}
        {view === 'tools' && <ToolsView tree={tree} onRoot={async (id) => { await setRoot(id); await refresh(); notify('Root family updated'); }} onExport={() => exportTree(tree)} onImport={() => fileRef.current?.click()} />}
      </section>
    </main>
    {selected && view === 'tree' && <PersonDrawer person={selected} tree={tree} onClose={() => setSelectedPersonId(null)} onEdit={() => setPersonEditor({ open: true, person: selected })} onFocus={choosePerson} />}
    <SearchPalette open={searchOpen} people={tree.people} onClose={() => setSearchOpen(false)} onChoose={choosePerson} />
    <PersonEditor open={personEditor.open} person={personEditor.person} onClose={() => setPersonEditor({ open: false, person: null })} onSave={savePersonAction} onDelete={personEditor.person ? deletePersonAction : undefined} />
    <FamilyUnitEditor open={unitEditor.open} unit={unitEditor.unit} people={tree.people} onClose={() => setUnitEditor({ open: false, unit: null })} onSave={saveUnitAction} onDelete={unitEditor.unit ? deleteUnitAction : undefined} />
    <input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(event) => void handleImport(event, refresh, notify)} />
    {toast && <div className="toast"><Sparkles size={16} />{toast}</div>}
  </div>;
}

function PeopleView({ tree, onSelect, onEdit, onDelete }: { tree: FamilyTreeData; onSelect: (id: string) => void; onEdit: (person: Person) => void; onDelete: (person: Person) => void }) {
  const [query, setQuery] = useState(''); const people = tree.people.filter((person) => `${person.name} ${person.currentPlaceOfResidence ?? ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  return <div className="content-page"><div className="section-intro"><div><p className="eyebrow">{tree.people.length} profiles</p><h2>People in your family</h2><p>Keep names and life details accurate. Connections are managed separately as family units.</p></div><label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter people…" /></label></div><div className="people-grid">{people.map((person) => <article className="person-card" key={person.id}><button className="person-card-main" onClick={() => onSelect(person.id)}><span className={`avatar large avatar-${person.gender}`}>{person.name[0]}</span><span><strong>{person.name}</strong><small>{person.currentPlaceOfResidence || 'Residence not recorded'}</small></span><ChevronRight size={16} /></button><div><span>{person.isAlive ? 'Living' : 'In memory'}</span><span className="row-actions"><button onClick={() => onEdit(person)}>Edit</button><button className="delete-link" onClick={() => onDelete(person)}><Trash2 size={12} /> Delete</button></span></div></article>)}</div></div>;
}

function FamiliesView({ tree, onEdit, onDelete }: { tree: FamilyTreeData; onEdit: (unit: FamilyUnit) => void; onDelete: (unit: FamilyUnit) => void }) {
  const byId = new Map(tree.people.map((person) => [person.id, person]));
  return <div className="content-page"><div className="section-intro"><div><p className="eyebrow">{tree.familyUnits.length} connections</p><h2>Family units</h2><p>Partners form the top of each unit; their children become the next generation on the canvas.</p></div></div><div className="unit-list">{tree.familyUnits.map((unit) => { const parents = [unit.husbandId, unit.wifeId].map((id) => id ? byId.get(id)?.name : null).filter(Boolean); return <article key={unit.id} className="unit-row"><button type="button" className="unit-row-main" onClick={() => onEdit(unit)}><span className="unit-icon"><HeartHandshake size={18} /></span><span><strong>{parents.join(' & ') || 'Incomplete family'}</strong><small>{unit.childrenIds.length} {unit.childrenIds.length === 1 ? 'child' : 'children'}{unit.anniversaryDate ? ` · Since ${unit.anniversaryDate}` : ''}</small></span>{tree.selectedRootFamilyUnitId === unit.id && <span className="root-pill"><Crown size={11} /> Root</span>}<ChevronRight size={17} /></button><button type="button" className="unit-delete" onClick={() => onDelete(unit)} aria-label={`Delete ${parents.join(' and ') || 'family unit'}`}><Trash2 size={15} /><span>Delete</span></button></article>; })}</div></div>;
}

function RelationshipsView({ tree, onResult }: { tree: FamilyTreeData; onResult: (path: string[]) => void }) {
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const result = from && to ? findRelationship(from, to, tree.people, tree.familyUnits) : null; const byName = [...tree.people].sort((a, b) => a.name.localeCompare(b.name));
  return <div className="content-page narrow-page"><div className="section-intro"><div><p className="eyebrow">Relationship finder</p><h2>How are they connected?</h2><p>Choose two family members and trace the shortest known path between them.</p></div></div><div className="relationship-card"><div className="relationship-pickers"><label className="field"><span>From</span><select value={from} onChange={(event) => setFrom(event.target.value)}><option value="">Choose a person</option>{byName.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><span className="connection-dash"><GitBranch size={20} /></span><label className="field"><span>To</span><select value={to} onChange={(event) => setTo(event.target.value)}><option value="">Choose a person</option>{byName.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label></div>{from && to && <div className={`relationship-result ${result ? '' : 'missing'}`}><span>{result ? <Sparkles size={19} /> : <AlertTriangle size={19} />}</span><div><small>Relationship</small><strong>{result?.label ?? 'No known connection'}</strong></div>{result && <button className="secondary-button" onClick={() => onResult(result.path)}>Show on tree</button>}</div>}</div></div>;
}

function ToolsView({ tree, onRoot, onExport, onImport }: { tree: FamilyTreeData; onRoot: (id: string | null) => Promise<void>; onExport: () => void; onImport: () => void }) {
  const duplicates = duplicateGroups(tree.people); const byId = new Map(tree.people.map((person) => [person.id, person]));
  return <div className="content-page"><div className="section-intro"><div><p className="eyebrow">Archive controls</p><h2>Data & settings</h2><p>Choose the opening branch, review possible duplicates, or move a validated copy of your data.</p></div></div><div className="settings-grid"><section className="setting-card"><span className="setting-icon"><Crown size={19} /></span><div><h3>Root family</h3><p>The selected unit appears first and is marked on the tree.</p><select value={tree.selectedRootFamilyUnitId ?? ''} onChange={(event) => void onRoot(event.target.value || null)}><option value="">Automatic root</option>{tree.familyUnits.map((unit) => <option key={unit.id} value={unit.id}>{[unit.husbandId, unit.wifeId].map((id) => id ? byId.get(id)?.name : null).filter(Boolean).join(' & ') || unit.id}</option>)}</select></div></section><section className="setting-card"><span className="setting-icon"><Archive size={19} /></span><div><h3>Private backup</h3><p>Exports include contact details. Store downloaded files carefully.</p><div className="button-row"><button className="secondary-button" onClick={onExport}><Download size={15} /> Export JSON</button><button className="secondary-button" onClick={onImport}><Upload size={15} /> Import JSON</button></div></div></section><section className="setting-card full-setting"><span className="setting-icon"><AlertTriangle size={19} /></span><div><h3>Duplicate review</h3><p>{duplicates.length ? `${duplicates.length} possible duplicate group${duplicates.length === 1 ? '' : 's'} found. Compare profiles before deleting anything.` : 'No likely duplicates found using name and date of birth.'}</p>{duplicates.map((group) => <div className="duplicate-row" key={group.map((person) => person.id).join('|')}>{group.map((person) => person.name).join(' · ')}</div>)}</div></section></div></div>;
}

function PersonDrawer({ person, tree, onClose, onEdit, onFocus }: { person: Person; tree: FamilyTreeData; onClose: () => void; onEdit: () => void; onFocus: (id: string) => void }) {
  const relatives = useMemo(() => { const ids = new Set<string>(); for (const unit of tree.familyUnits) if ([unit.husbandId, unit.wifeId, ...unit.childrenIds].includes(person.id)) for (const id of [unit.husbandId, unit.wifeId, ...unit.childrenIds]) if (id && id !== person.id) ids.add(id); return [...ids].map((id) => tree.people.find((item) => item.id === id)).filter((item): item is Person => Boolean(item)); }, [person.id, tree]);
  return <aside className="detail-drawer"><div className="drawer-head"><p className="eyebrow">Family profile</p><button className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="drawer-person"><span className={`avatar hero avatar-${person.gender}`}>{person.name[0]}</span><h2>{person.name}</h2><p>{person.isAlive ? 'Living family member' : 'Remembered family member'}</p></div><dl className="detail-list"><div><dt>Born</dt><dd>{person.dateOfBirth || 'Not recorded'}</dd></div>{!person.isAlive && <div><dt>Died</dt><dd>{person.dateOfDeath || 'Not recorded'}</dd></div>}<div><dt>Residence</dt><dd>{person.currentPlaceOfResidence || 'Not recorded'}</dd></div><div><dt>Contact</dt><dd>{person.contactNumber || 'Not recorded'}</dd></div></dl><button className="primary-button wide" onClick={onEdit}>Edit profile</button>{relatives.length > 0 && <div className="drawer-relatives"><h3>Immediate family</h3>{relatives.map((relative) => <button key={relative.id} onClick={() => onFocus(relative.id)}><span className={`avatar avatar-${relative.gender}`}>{relative.name[0]}</span><span>{relative.name}</span><ChevronRight size={15} /></button>)}</div>}</aside>;
}

function exportTree(tree: FamilyTreeData) { const blob = new Blob([JSON.stringify({ ...tree, updatedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `family-tree-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); }
async function handleImport(event: React.ChangeEvent<HTMLInputElement>, refresh: () => Promise<void>, notify: (message: string) => void) { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; try { const data = parseTreeImport(await file.text()); const replace = window.confirm('Replace the current tree? Choose Cancel to merge this backup instead.'); await importTree(data, replace); await refresh(); notify(replace ? 'Tree replaced from backup' : 'Backup merged into tree'); } catch (cause) { window.alert(cause instanceof Error ? cause.message : 'Import failed.'); } }
