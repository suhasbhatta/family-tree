import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {after, before, beforeEach, test} from 'node:test';

import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {serverTimestamp} from 'firebase/firestore';

let environment: RulesTestEnvironment;

const googleClaims = {
  email: 'admin@example.com',
  email_verified: true,
  firebase: {sign_in_provider: 'google.com'},
};

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-family-tree',
    firestore: {
      rules: readFileSync(resolve(process.cwd(), '..', 'firestore.rules'), 'utf8'),
    },
  });
});

after(async () => environment.cleanup());

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const now = new Date();
    await db.doc('adminAccess/admin').set({
      treeId: 'primary', status: 'active', displayName: 'Primary admin',
    });
    await db.doc('adminAccess/second-admin').set({
      treeId: 'primary', status: 'active', displayName: 'Second admin',
    });
    await db.doc('trees/primary').set({
      schemaVersion: 2,
      selectedRootFamilyUnitId: null,
      createdAt: now,
      updatedAt: now,
    });
    await db.doc('trees/primary/people/p1').set({
      name: 'Family Member',
      gender: 'unknown',
      dateOfBirth: null,
      dateOfDeath: null,
      isAlive: true,
      currentPlaceOfResidence: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await db.doc('trees/primary/personPrivate/p1').set({
      contactNumber: '+919999999999', updatedAt: now,
    });
    await db.doc('trees/primary/familyUnits/f1').set({
      husbandId: 'p1',
      wifeId: null,
      anniversaryDate: null,
      childrenIds: [],
      createdAt: now,
      updatedAt: now,
    });
    await db.doc('auditEvents/event1').set({
      treeId: 'primary',
      actorUid: 'admin',
      action: 'person.created',
      resourceType: 'person',
      resourceId: 'p1',
      createdAt: now,
    });
  });
});

test('denies all family data to unauthenticated visitors', async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(db.doc('trees/primary').get());
  await assertFails(db.doc('trees/primary/people/p1').get());
});

test('allows any verified Google user to read the public tree only', async () => {
  const db = environment.authenticatedContext('other', googleClaims).firestore();
  await assertSucceeds(db.doc('trees/primary').get());
  await assertSucceeds(db.doc('trees/primary/people/p1').get());
  await assertSucceeds(db.doc('trees/primary/familyUnits/f1').get());
  await assertSucceeds(db.doc('adminAccess/other').get());
  await assertFails(db.doc('trees/primary/personPrivate/p1').get());
  await assertFails(db.doc('auditEvents/event1').get());
  await assertFails(db.doc('adminAccess/admin').get());
});

test('prevents a Google viewer from changing any family data', async () => {
  const db = environment.authenticatedContext('other', googleClaims).firestore();
  await assertFails(db.doc('trees/primary/people/p2').set({
    name: 'Unauthorized change',
    gender: 'unknown',
    dateOfBirth: null,
    dateOfDeath: null,
    isAlive: true,
    currentPlaceOfResidence: null,
    version: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  await assertFails(db.doc('trees/primary/people/p1').update({
    name: 'Changed by viewer',
    version: 2,
    updatedAt: serverTimestamp(),
  }));
  await assertFails(db.doc('trees/primary/people/p1').delete());
  await assertFails(db.doc('trees/primary/familyUnits/f1').delete());
  await assertFails(db.doc('trees/primary').update({
    selectedRootFamilyUnitId: 'f1',
    updatedAt: serverTimestamp(),
  }));
  await assertFails(db.doc('auditEvents/viewer-event').set({
    treeId: 'primary',
    actorUid: 'other',
    action: 'person.created',
    resourceType: 'person',
    resourceId: 'p2',
    createdAt: serverTimestamp(),
  }));
});

test('denies a non-Google session even when its UID is allowlisted', async () => {
  const db = environment.authenticatedContext('admin', {
    email: 'admin@example.com',
    email_verified: true,
    firebase: {sign_in_provider: 'password'},
  }).firestore();
  await assertFails(db.doc('trees/primary').get());
});

test('denies an unverified Google session', async () => {
  const db = environment.authenticatedContext('other', {
    email: 'other@example.com',
    email_verified: false,
    firebase: {sign_in_provider: 'google.com'},
  }).firestore();
  await assertFails(db.doc('trees/primary').get());
});

test('allows every active Google administrator to read private tree data', async () => {
  for (const uid of ['admin', 'second-admin']) {
    const db = environment.authenticatedContext(uid, googleClaims).firestore();
    await assertSucceeds(db.doc('trees/primary').get());
    await assertSucceeds(db.doc('trees/primary/people/p1').get());
    await assertSucceeds(db.doc('trees/primary/personPrivate/p1').get());
    await assertSucceeds(db.doc(`adminAccess/${uid}`).get());
  }
});

test('allows an administrator to create validated family records', async () => {
  const db = environment.authenticatedContext('admin', googleClaims).firestore();
  await assertSucceeds(db.doc('trees/primary/people/p2').set({
    name: 'Another Member',
    gender: 'female',
    dateOfBirth: null,
    dateOfDeath: null,
    isAlive: true,
    currentPlaceOfResidence: null,
    version: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
});

test('rejects malformed records and skipped profile versions', async () => {
  const db = environment.authenticatedContext('admin', googleClaims).firestore();
  await assertFails(db.doc('trees/primary/people/p2').set({name: 'Incomplete'}));
  await assertFails(db.doc('trees/primary/people/p1').update({
    version: 7,
    updatedAt: serverTimestamp(),
  }));
});

test('prevents every browser client from changing administrator access', async () => {
  const adminDb = environment.authenticatedContext('admin', googleClaims).firestore();
  const otherDb = environment.authenticatedContext('other', googleClaims).firestore();
  await assertFails(adminDb.doc('adminAccess/admin').update({status: 'disabled'}));
  await assertFails(adminDb.doc('adminAccess/new-admin').set({
    treeId: 'primary', status: 'active',
  }));
  await assertFails(otherDb.doc('adminAccess/other').set({
    treeId: 'primary', status: 'active',
  }));
});

test('prevents administrators from forging another audit actor', async () => {
  const db = environment.authenticatedContext('admin', googleClaims).firestore();
  await assertFails(db.doc('auditEvents/forged').set({
    treeId: 'primary',
    actorUid: 'second-admin',
    action: 'person.created',
    resourceType: 'person',
    resourceId: 'p2',
    createdAt: serverTimestamp(),
  }));
});
