import { initializeApp } from 'firebase/app';
import { browserSessionPersistence, GoogleAuthProvider, onAuthStateChanged, setPersistence, signInWithPopup, signOut, type User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import type { FamilyTreeData, FamilyUnit, FamilyUnitDraft, Person, PersonDraft } from '../types/family';
import { validId, validatePersonDraft } from './validation';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
};

export const treeId = import.meta.env.VITE_FAMILY_TREE_ID || 'primary';
export const isFirebaseConfigured = Object.values(firebaseConfig).every((value) => typeof value === 'string' && value.length > 0);
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

export interface UserIdentity { user: User; displayName: string; role: 'admin' | 'viewer' }

export async function initializeAuth(listener: (identity: UserIdentity | null, error?: string) => void): Promise<() => void> {
  if (!auth || !db) { listener(null, 'Firebase build configuration is missing.'); return () => undefined; }
  try { await setPersistence(auth, browserSessionPersistence); } catch { listener(null, 'Secure sign-in could not be initialized. Refresh and try again.'); return () => undefined; }
  return onAuthStateChanged(auth, async (user) => {
    if (!user) { listener(null); return; }
    try {
      const providers = new Set(user.providerData.map((item) => item.providerId));
      if (!user.emailVerified || !providers.has('google.com')) throw new Error('unauthorized');
      const access = await getDoc(doc(db, 'adminAccess', user.uid));
      const data = access.data();
      const isAdmin = access.exists() && data?.status === 'active' && data?.treeId === treeId;
      listener({ user, role: isAdmin ? 'admin' : 'viewer', displayName: isAdmin && typeof data.displayName === 'string' ? data.displayName : user.displayName ?? (isAdmin ? 'Administrator' : 'Viewer') });
    } catch {
      await signOut(auth);
      listener(null, 'Unable to verify Google access. Please try again.');
    }
  });
}

export async function login(): Promise<void> {
  if (!auth) throw new Error('Firebase is not configured.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try { await signInWithPopup(auth, provider); } catch { throw new Error('Unable to sign in. Please try again.'); }
}

export async function logout(): Promise<void> { if (auth) await signOut(auth); }

function requireDb() {
  if (!db || !auth?.currentUser) throw new Error('Administrator access is required.');
  return { db, uid: auth.currentUser.uid };
}

const treeRef = () => doc(requireDb().db, 'trees', treeId);
const auditRef = () => doc(collection(requireDb().db, 'auditEvents'));
const audit = (uid: string, action: string, resourceType: string, resourceId: string) => ({ treeId, actorUid: uid, action, resourceType, resourceId, createdAt: serverTimestamp() });

export async function loadTree(includePrivate = false): Promise<FamilyTreeData> {
  requireDb();
  const root = treeRef();
  const [meta, publicPeople, units, privatePeople] = await Promise.all([getDoc(root), getDocs(collection(root, 'people')), getDocs(collection(root, 'familyUnits')), includePrivate ? getDocs(collection(root, 'personPrivate')) : Promise.resolve(null)]);
  const privateById = new Map(privatePeople?.docs.map((item) => [item.id, item.data()]) ?? []);
  const people: Person[] = publicPeople.docs.map((item) => {
    const data = item.data(); const privateData = privateById.get(item.id);
    return { id: item.id, version: Number(data.version ?? 0), name: String(data.name ?? ''), gender: data.gender ?? 'unknown', dateOfBirth: data.dateOfBirth ?? null, dateOfDeath: data.dateOfDeath ?? null, isAlive: data.isAlive !== false, contactNumber: privateData?.contactNumber ?? null, currentPlaceOfResidence: data.currentPlaceOfResidence ?? null };
  });
  const familyUnits: FamilyUnit[] = units.docs.map((item) => { const data = item.data(); return { id: item.id, husbandId: data.husbandId ?? null, wifeId: data.wifeId ?? null, anniversaryDate: data.anniversaryDate ?? null, childrenIds: Array.isArray(data.childrenIds) ? data.childrenIds : [] }; });
  const data = meta.data();
  return { appVersion: Number(data?.schemaVersion ?? 2), selectedRootFamilyUnitId: data?.selectedRootFamilyUnitId ?? null, createdAt: data?.createdAt?.toDate?.().toISOString() ?? new Date().toISOString(), updatedAt: data?.updatedAt?.toDate?.().toISOString() ?? new Date().toISOString(), people, familyUnits };
}

async function ensureTree(): Promise<void> {
  const { db } = requireDb(); const root = treeRef();
  await runTransaction(db, async (tx) => { const snapshot = await tx.get(root); if (!snapshot.exists()) tx.set(root, { schemaVersion: 2, selectedRootFamilyUnitId: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); });
}

export async function savePerson(id: string | null, draftValue: PersonDraft, expectedVersion = 0): Promise<string> {
  const { db, uid } = requireDb(); await ensureTree();
  const draft = validatePersonDraft(draftValue); const personId = id ? validId(id, 'Person ID') : crypto.randomUUID();
  const publicRef = doc(treeRef(), 'people', personId); const privateRef = doc(treeRef(), 'personPrivate', personId);
  await runTransaction(db, async (tx) => {
    const current = await tx.get(publicRef); const storedVersion = Number(current.data()?.version ?? 0);
    if (id && (!current.exists() || storedVersion !== expectedVersion)) throw new Error('This person changed in another session. Reload and try again.');
    if (!id && current.exists()) throw new Error('Person already exists.');
    tx.set(publicRef, { name: draft.name, gender: draft.gender, dateOfBirth: draft.dateOfBirth, dateOfDeath: draft.dateOfDeath, isAlive: draft.isAlive, currentPlaceOfResidence: draft.currentPlaceOfResidence, version: storedVersion + 1, createdAt: current.data()?.createdAt ?? serverTimestamp(), updatedAt: serverTimestamp() });
    tx.set(privateRef, { contactNumber: draft.contactNumber, updatedAt: serverTimestamp() });
    tx.set(treeRef(), { updatedAt: serverTimestamp() }, { merge: true });
    tx.set(auditRef(), audit(uid, id ? 'person.updated' : 'person.created', 'person', personId));
  });
  return personId;
}

export async function removePerson(personId: string): Promise<void> {
  const { db, uid } = requireDb(); const root = treeRef(); const [units, meta] = await Promise.all([getDocs(collection(root, 'familyUnits')), getDoc(root)]); const batch = writeBatch(db); let removedRoot = false;
  batch.delete(doc(root, 'people', personId)); batch.delete(doc(root, 'personPrivate', personId));
  for (const unit of units.docs) { const data = unit.data(); const husbandId = data.husbandId === personId ? null : data.husbandId; const wifeId = data.wifeId === personId ? null : data.wifeId; const childrenIds = (data.childrenIds as string[]).filter((id) => id !== personId); if (data.husbandId === personId || data.wifeId === personId || childrenIds.length !== data.childrenIds.length) { if (!husbandId && !wifeId) { batch.delete(unit.ref); batch.set(auditRef(), audit(uid, 'family_unit.deleted', 'familyUnit', unit.id)); removedRoot ||= meta.data()?.selectedRootFamilyUnitId === unit.id; } else batch.update(unit.ref, { husbandId, wifeId, childrenIds, updatedAt: serverTimestamp() }); } }
  batch.set(root, { ...(removedRoot ? { selectedRootFamilyUnitId: null } : {}), updatedAt: serverTimestamp() }, { merge: true }); batch.set(auditRef(), audit(uid, 'person.deleted', 'person', personId)); await batch.commit();
}

export async function saveFamilyUnit(id: string | null, value: FamilyUnitDraft): Promise<string> {
  const { db, uid } = requireDb(); await ensureTree(); const unitId = id ? validId(id, 'Family unit ID') : crypto.randomUUID();
  const members = [value.husbandId, value.wifeId, ...value.childrenIds].filter((item): item is string => Boolean(item));
  if (!value.husbandId && !value.wifeId) throw new Error('Choose at least one parent.');
  if (value.husbandId && value.husbandId === value.wifeId) throw new Error('Choose two different people as partners.');
  if (value.childrenIds.includes(value.husbandId ?? '') || value.childrenIds.includes(value.wifeId ?? '')) throw new Error('A parent cannot also be selected as a child in the same family.');
  if (new Set(members).size !== members.length) throw new Error('A child was selected more than once.');
  const snapshots = await Promise.all(members.map((personId) => getDoc(doc(treeRef(), 'people', personId)))); if (snapshots.some((item) => !item.exists())) throw new Error('A selected person no longer exists.');
  const ref = doc(treeRef(), 'familyUnits', unitId); const current = await getDoc(ref); if (id && !current.exists()) throw new Error('Family unit not found.'); if (!id && current.exists()) throw new Error('Family unit already exists.');
  const batch = writeBatch(db); batch.set(ref, { husbandId: value.husbandId, wifeId: value.wifeId, anniversaryDate: value.anniversaryDate || null, childrenIds: [...new Set(value.childrenIds)], createdAt: current.data()?.createdAt ?? serverTimestamp(), updatedAt: serverTimestamp() }); batch.set(treeRef(), { updatedAt: serverTimestamp() }, { merge: true }); batch.set(auditRef(), audit(uid, id ? 'family_unit.updated' : 'family_unit.created', 'familyUnit', unitId)); await batch.commit(); return unitId;
}

export async function removeFamilyUnit(unitId: string): Promise<void> {
  const { db, uid } = requireDb(); const root = treeRef(); const meta = await getDoc(root); const batch = writeBatch(db); batch.delete(doc(root, 'familyUnits', unitId)); batch.set(root, { ...(meta.data()?.selectedRootFamilyUnitId === unitId ? { selectedRootFamilyUnitId: null } : {}), updatedAt: serverTimestamp() }, { merge: true }); batch.set(auditRef(), audit(uid, 'family_unit.deleted', 'familyUnit', unitId)); await batch.commit();
}

export async function setRoot(unitId: string | null): Promise<void> {
  const { db, uid } = requireDb();
  if (unitId && !(await getDoc(doc(treeRef(), 'familyUnits', validId(unitId, 'Family unit ID')))).exists()) throw new Error('Family unit not found.');
  const batch = writeBatch(db); batch.set(treeRef(), { selectedRootFamilyUnitId: unitId, updatedAt: serverTimestamp() }, { merge: true }); batch.set(auditRef(), audit(uid, 'tree.root_changed', 'tree', treeId)); await batch.commit();
}

export async function importTree(data: FamilyTreeData, replace: boolean): Promise<void> {
  const { db, uid } = requireDb(); await ensureTree(); const root = treeRef(); const [oldPeople, oldUnits] = await Promise.all([getDocs(collection(root, 'people')), getDocs(collection(root, 'familyUnits'))]);
  if (replace) {
    const deletions = [...oldPeople.docs.flatMap((item) => [item.ref, doc(root, 'personPrivate', item.id)]), ...oldUnits.docs.map((item) => item.ref)];
    for (let offset = 0; offset < deletions.length; offset += 400) { const batch = writeBatch(db); for (const ref of deletions.slice(offset, offset + 400)) batch.delete(ref); await batch.commit(); }
  }
  const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
  for (const person of data.people) { const draft = validatePersonDraft(person); const existing = replace ? undefined : oldPeople.docs.find((item) => item.id === person.id); operations.push((batch) => { batch.set(doc(root, 'people', person.id), { name: draft.name, gender: draft.gender, dateOfBirth: draft.dateOfBirth, dateOfDeath: draft.dateOfDeath, isAlive: draft.isAlive, currentPlaceOfResidence: draft.currentPlaceOfResidence, version: Number(existing?.data().version ?? 0) + 1, createdAt: existing?.data().createdAt ?? serverTimestamp(), updatedAt: serverTimestamp() }); batch.set(doc(root, 'personPrivate', person.id), { contactNumber: draft.contactNumber, updatedAt: serverTimestamp() }); }); }
  for (const unit of data.familyUnits) { const existing = replace ? undefined : oldUnits.docs.find((item) => item.id === unit.id); operations.push((batch) => batch.set(doc(root, 'familyUnits', unit.id), { husbandId: unit.husbandId, wifeId: unit.wifeId, anniversaryDate: unit.anniversaryDate, childrenIds: unit.childrenIds, createdAt: existing?.data().createdAt ?? serverTimestamp(), updatedAt: serverTimestamp() })); }
  operations.push((batch) => { batch.set(root, { schemaVersion: 2, selectedRootFamilyUnitId: data.selectedRootFamilyUnitId, updatedAt: serverTimestamp() }, { merge: true }); batch.set(auditRef(), audit(uid, replace ? 'tree.import_replaced' : 'tree.import_merged', 'tree', treeId)); });
  for (let offset = 0; offset < operations.length; offset += 190) { const batch = writeBatch(db); for (const operation of operations.slice(offset, offset + 190)) operation(batch); await batch.commit(); }
}
