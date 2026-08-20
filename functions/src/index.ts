import {initializeApp} from 'firebase-admin/app';
import {
  DocumentData,
  DocumentSnapshot,
  FieldValue,
  Timestamp,
  Transaction,
  QueryDocumentSnapshot,
  WriteBatch,
  getFirestore,
} from 'firebase-admin/firestore';
import {logger, setGlobalOptions} from 'firebase-functions';
import {defineString} from 'firebase-functions/params';
import {CallableRequest, HttpsError, onCall} from 'firebase-functions/v2/https';

import {
  EditablePerson,
  hashPhone,
  normalizePhone,
  validId,
  validateEditablePerson,
  validateFamilyUnit,
} from './domain.js';

initializeApp();
const db = getFirestore();
const TREE_ID = defineString('TREE_ID', {default: 'primary'});

setGlobalOptions({
  region: 'asia-south1',
  maxInstances: 2,
  concurrency: 20,
  timeoutSeconds: 60,
  memory: '256MiB',
});

type AdminAccess = {
  uid: string;
  treeId: string;
  status: string;
};

function dataOf(request: CallableRequest<unknown>): Record<string, unknown> {
  if (!request.data || typeof request.data !== 'object' || Array.isArray(request.data)) {
    throw new HttpsError('invalid-argument', 'Invalid request.');
  }
  return request.data as Record<string, unknown>;
}

function validated<T>(operation: () => T): T {
  try {
    return operation();
  } catch {
    throw new HttpsError('invalid-argument', 'Invalid request.');
  }
}

function requireUid(request: CallableRequest<unknown>): string {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  return request.auth.uid;
}

async function requireAdmin(request: CallableRequest<unknown>): Promise<{uid: string}> {
  const uid = requireUid(request);
  const snapshot = await db.collection('adminAccess').doc('sole').get();
  const access = snapshot.data() as AdminAccess | undefined;
  if (!access || access.uid !== uid || access.status !== 'active'
    || access.treeId !== TREE_ID.value()) {
    throw new HttpsError('permission-denied', 'Access denied.');
  }
  return {uid};
}

async function consumeRateLimit(uid: string, action: string, limit = 30): Promise<void> {
  const window = Math.floor(Date.now() / 60_000);
  const key = `${uid}_${action}_${window}`;
  const ref = db.collection('_rateLimits').doc(key);
  await db.runTransaction(async (transaction: Transaction) => {
    const snapshot = await transaction.get(ref);
    const count = (snapshot.data()?.count as number | undefined) ?? 0;
    if (count >= limit) {
      throw new HttpsError('resource-exhausted', 'Try again later.');
    }
    transaction.set(ref, {
      count: count + 1,
      expiresAt: Timestamp.fromMillis((window + 2) * 60_000),
    });
  });
}

function treeRef() {
  return db.collection('trees').doc(TREE_ID.value());
}

async function audit(
  actorUid: string,
  action: string,
  resourceType: string,
  resourceId: string,
): Promise<void> {
  await db.collection('auditEvents').add({
    treeId: TREE_ID.value(),
    actorUid,
    action,
    resourceType,
    resourceId,
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function touchTree(): Promise<void> {
  await treeRef().set({
    schemaVersion: 2,
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});
}

function publicPerson(person: EditablePerson, version: number): DocumentData {
  return {
    name: person.name,
    gender: person.gender,
    dateOfBirth: person.dateOfBirth,
    dateOfDeath: person.dateOfDeath,
    isAlive: person.isAlive,
    currentPlaceOfResidence: person.currentPlaceOfResidence,
    version,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export const claimAdminAccess = onCall(async (request) => {
  const uid = requireUid(request);
  await consumeRateLimit(uid, 'claim', 10);
  const phoneClaim = request.auth?.token.phone_number;
  const phone = validated(() => normalizePhone(phoneClaim));
  const phoneHash = hashPhone(phone);
  const accessRef = db.collection('adminAccess').doc('sole');
  const bootstrapRef = db.collection('bootstrapAdmins').doc(phoneHash);
  const tree = treeRef();

  const result = await db.runTransaction(async (transaction: Transaction) => {
    const existing = await transaction.get(accessRef);
    if (existing.exists) {
      const access = existing.data() as AdminAccess;
      if (access.uid !== uid || access.status !== 'active'
        || access.treeId !== TREE_ID.value()) {
        throw new HttpsError('permission-denied', 'Access denied.');
      }
      return access;
    }

    const [bootstrap, treeSnapshot] = await Promise.all([
      transaction.get(bootstrapRef),
      transaction.get(tree),
    ]);
    if (!bootstrap.exists || bootstrap.data()?.status !== 'pending'
      || bootstrap.data()?.treeId !== TREE_ID.value()) {
      throw new HttpsError('permission-denied', 'Access denied.');
    }
    transaction.update(bootstrapRef, {
      status: 'claimed', claimedByUid: uid, claimedAt: FieldValue.serverTimestamp(),
    });
    const access: AdminAccess = {
      uid, treeId: TREE_ID.value(), status: 'active',
    };
    transaction.create(accessRef, {
      ...access,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (!treeSnapshot.exists) {
      transaction.create(tree, {
        schemaVersion: 2,
        selectedRootFamilyUnitId: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return access;
  });

  await audit(uid, 'admin_access.claimed', 'adminAccess', 'sole');
  return result;
});

export const savePerson = onCall(async (request) => {
  const {uid} = await requireAdmin(request);
  await consumeRateLimit(uid, 'save_person', 60);
  const raw = dataOf(request).person;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new HttpsError('invalid-argument', 'Invalid person.');
  }
  const input = raw as Record<string, unknown>;
  const person = validated(() => validateEditablePerson({
    name: input.name, gender: input.gender, dateOfBirth: input.dateOfBirth ?? null,
    dateOfDeath: input.dateOfDeath ?? null, isAlive: input.isAlive,
    contactNumber: input.contactNumber ?? null,
    currentPlaceOfResidence: input.currentPlaceOfResidence ?? null,
  }));
  const isUpdate = input.id !== undefined;
  const ref = isUpdate
    ? treeRef().collection('people').doc(validated(() => validId(input.id)))
    : treeRef().collection('people').doc();
  const version = await db.runTransaction(async (transaction: Transaction) => {
    const existing = await transaction.get(ref);
    if (isUpdate && !existing.exists) throw new HttpsError('not-found', 'Person not found.');
    const currentVersion = (existing.data()?.version as number | undefined) ?? 0;
    const nextVersion = currentVersion + 1;
    transaction.set(ref, {
      ...publicPerson(person, nextVersion),
      createdAt: existing.exists
        ? existing.data()?.createdAt ?? FieldValue.serverTimestamp()
        : FieldValue.serverTimestamp(),
    });
    transaction.set(treeRef().collection('personPrivate').doc(ref.id), {
      contactNumber: person.contactNumber,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
    transaction.set(treeRef(), {updatedAt: FieldValue.serverTimestamp()}, {merge: true});
    return nextVersion;
  });
  await audit(uid, isUpdate ? 'person.updated' : 'person.created', 'person', ref.id);
  return {id: ref.id, version};
});

export const deletePerson = onCall(async (request) => {
  const {uid} = await requireAdmin(request);
  const personId = validated(() => validId(dataOf(request).personId, 'personId'));
  const units = await treeRef().collection('familyUnits').get();
  const batch = db.batch();
  batch.delete(treeRef().collection('people').doc(personId));
  batch.delete(treeRef().collection('personPrivate').doc(personId));
  for (const unit of units.docs) {
    const data = unit.data();
    const previousChildren = (data.childrenIds as string[] | undefined) ?? [];
    const children = previousChildren.filter((id) => id !== personId);
    if (data.husbandId === personId || data.wifeId === personId || children.length !== previousChildren.length) {
      batch.update(unit.ref, {
        husbandId: data.husbandId === personId ? null : data.husbandId ?? null,
        wifeId: data.wifeId === personId ? null : data.wifeId ?? null,
        childrenIds: children,
      });
    }
  }
  batch.set(treeRef(), {updatedAt: FieldValue.serverTimestamp()}, {merge: true});
  await batch.commit();
  await audit(uid, 'person.deleted', 'person', personId);
  return {status: 'deleted'};
});

export const saveFamilyUnit = onCall(async (request) => {
  const {uid} = await requireAdmin(request);
  const raw = dataOf(request).familyUnit;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new HttpsError('invalid-argument', 'Invalid family unit.');
  }
  const input = raw as Record<string, unknown>;
  const unit = validated(() => validateFamilyUnit({
    husbandId: input.husbandId ?? null,
    wifeId: input.wifeId ?? null,
    anniversaryDate: input.anniversaryDate ?? null,
    childrenIds: input.childrenIds,
  }));
  const ids = [unit.husbandId, unit.wifeId, ...unit.childrenIds]
    .filter((id): id is string => Boolean(id));
  const people = await Promise.all(ids.map((id) => treeRef().collection('people').doc(id).get()));
  if (people.some((person: DocumentSnapshot) => !person.exists)) {
    throw new HttpsError('failed-precondition', 'Family unit references an unknown person.');
  }
  const isUpdate = input.id !== undefined;
  const ref = isUpdate
    ? treeRef().collection('familyUnits').doc(validated(() => validId(input.id)))
    : treeRef().collection('familyUnits').doc();
  const previous = await ref.get();
  if (isUpdate && !previous.exists) throw new HttpsError('not-found', 'Family unit not found.');
  await ref.set({...unit, updatedAt: FieldValue.serverTimestamp()});
  await touchTree();
  await audit(uid, isUpdate ? 'family_unit.updated' : 'family_unit.created', 'familyUnit', ref.id);
  return {id: ref.id};
});

export const deleteFamilyUnit = onCall(async (request) => {
  const {uid} = await requireAdmin(request);
  const id = validated(() => validId(dataOf(request).familyUnitId, 'familyUnitId'));
  const ref = treeRef().collection('familyUnits').doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Family unit not found.');
  await ref.delete();
  await touchTree();
  await audit(uid, 'family_unit.deleted', 'familyUnit', id);
  return {status: 'deleted'};
});

export const setRootFamilyUnit = onCall(async (request) => {
  const {uid} = await requireAdmin(request);
  const value = dataOf(request).familyUnitId;
  const id = value === null ? null : validated(() => validId(value, 'familyUnitId'));
  if (id && !(await treeRef().collection('familyUnits').doc(id).get()).exists) {
    throw new HttpsError('not-found', 'Family unit not found.');
  }
  await treeRef().set({
    selectedRootFamilyUnitId: id,
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});
  await audit(uid, 'tree.root_changed', 'tree', TREE_ID.value());
  return {selectedRootFamilyUnitId: id};
});

type BatchOperation = (batch: WriteBatch) => void;
async function commitOperations(operations: BatchOperation[]): Promise<void> {
  for (let start = 0; start < operations.length; start += 400) {
    const batch = db.batch();
    for (const operation of operations.slice(start, start + 400)) operation(batch);
    await batch.commit();
  }
}

export const importTree = onCall({timeoutSeconds: 120}, async (request) => {
  const {uid} = await requireAdmin(request);
  await consumeRateLimit(uid, 'import', 3);
  const input = dataOf(request);
  if (input.mode !== 'replace' && input.mode !== 'merge') {
    throw new HttpsError('invalid-argument', 'Invalid import mode.');
  }
  if (!input.tree || typeof input.tree !== 'object' || Array.isArray(input.tree)) {
    throw new HttpsError('invalid-argument', 'Invalid tree.');
  }
  const tree = input.tree as Record<string, unknown>;
  if (!Array.isArray(tree.people) || !Array.isArray(tree.familyUnits)
    || tree.people.length > 300 || tree.familyUnits.length > 150) {
    throw new HttpsError('invalid-argument', 'Import exceeds supported limits.');
  }

  const people = new Map<string, EditablePerson>();
  for (const raw of tree.people) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpsError('invalid-argument', 'Invalid person.');
    const record = raw as Record<string, unknown>;
    const id = validated(() => validId(record.id));
    if (people.has(id)) throw new HttpsError('invalid-argument', 'Duplicate person ID.');
    people.set(id, validated(() => validateEditablePerson({
      name: record.name, gender: record.gender,
      dateOfBirth: record.dateOfBirth ?? null, dateOfDeath: record.dateOfDeath ?? null,
      isAlive: record.isAlive, contactNumber: record.contactNumber ?? null,
      currentPlaceOfResidence: record.currentPlaceOfResidence ?? null,
    })));
  }
  const units = new Map<string, ReturnType<typeof validateFamilyUnit>>();
  for (const raw of tree.familyUnits) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpsError('invalid-argument', 'Invalid family unit.');
    const record = raw as Record<string, unknown>;
    const id = validated(() => validId(record.id));
    const unit = validated(() => validateFamilyUnit({
      husbandId: record.husbandId ?? null, wifeId: record.wifeId ?? null,
      anniversaryDate: record.anniversaryDate ?? null,
      childrenIds: record.childrenIds,
    }));
    const refs = [unit.husbandId, unit.wifeId, ...unit.childrenIds].filter(Boolean) as string[];
    if (refs.some((personId) => !people.has(personId))) {
      throw new HttpsError('invalid-argument', 'Family unit has an unknown person.');
    }
    if (units.has(id)) throw new HttpsError('invalid-argument', 'Duplicate family unit ID.');
    units.set(id, unit);
  }

  const peopleCollection = treeRef().collection('people');
  const privateCollection = treeRef().collection('personPrivate');
  const unitsCollection = treeRef().collection('familyUnits');
  if (input.mode === 'merge') {
    const existing = await Promise.all([
      ...[...people.keys()].map((id) => peopleCollection.doc(id).get()),
      ...[...units.keys()].map((id) => unitsCollection.doc(id).get()),
    ]);
    if (existing.some((snapshot: DocumentSnapshot) => snapshot.exists)) {
      throw new HttpsError('already-exists', 'Merge contains existing IDs.');
    }
  } else {
    const [oldPeople, oldPrivate, oldUnits] = await Promise.all([
      peopleCollection.get(), privateCollection.get(), unitsCollection.get(),
    ]);
    await commitOperations([
      ...oldPeople.docs.map((doc: QueryDocumentSnapshot) => (batch: WriteBatch) => batch.delete(doc.ref)),
      ...oldPrivate.docs.map((doc: QueryDocumentSnapshot) => (batch: WriteBatch) => batch.delete(doc.ref)),
      ...oldUnits.docs.map((doc: QueryDocumentSnapshot) => (batch: WriteBatch) => batch.delete(doc.ref)),
    ]);
  }

  const operations: BatchOperation[] = [];
  for (const [id, person] of people) {
    operations.push((batch) => batch.set(peopleCollection.doc(id), {
      ...publicPerson(person, 1), createdAt: FieldValue.serverTimestamp(),
    }));
    operations.push((batch) => batch.set(privateCollection.doc(id), {
      contactNumber: person.contactNumber,
      updatedAt: FieldValue.serverTimestamp(),
    }));
  }
  for (const [id, unit] of units) {
    operations.push((batch) => batch.set(unitsCollection.doc(id), {
      ...unit, updatedAt: FieldValue.serverTimestamp(),
    }));
  }
  await commitOperations(operations);
  await treeRef().set({
    schemaVersion: 2,
    selectedRootFamilyUnitId: typeof tree.selectedRootFamilyUnitId === 'string'
      && units.has(tree.selectedRootFamilyUnitId) ? tree.selectedRootFamilyUnitId : null,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  }, {merge: input.mode === 'merge'});
  await audit(uid, `tree.imported_${input.mode}`, 'tree', TREE_ID.value());
  logger.info('tree_import_completed', {
    actorUid: uid, mode: input.mode,
    peopleCount: people.size, familyUnitCount: units.size,
  });
  return {people: people.size, familyUnits: units.size};
});
