import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {after, before, beforeEach, test} from 'node:test';

import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

let environment: RulesTestEnvironment;

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
    await db.doc('adminAccess/sole').set({
      uid: 'admin', treeId: 'primary', status: 'active',
    });
    await db.doc('trees/primary').set({schemaVersion: 2});
    await db.doc('trees/primary/people/p1').set({name: 'Family Member'});
    await db.doc('trees/primary/personPrivate/p1').set({
      contactNumber: '+919999999999',
    });
    await db.doc('auditEvents/event1').set({
      treeId: 'primary', action: 'person.created',
    });
  });
});

test('denies all family data to unauthenticated visitors', async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(db.doc('trees/primary').get());
  await assertFails(db.doc('trees/primary/people/p1').get());
});

test('denies authenticated non-admin accounts', async () => {
  const db = environment.authenticatedContext('other').firestore();
  await assertFails(db.doc('trees/primary').get());
  await assertFails(db.doc('trees/primary/personPrivate/p1').get());
  await assertFails(db.doc('adminAccess/sole').get());
});

test('allows the sole admin to read all tree and private data', async () => {
  const db = environment.authenticatedContext('admin').firestore();
  await assertSucceeds(db.doc('trees/primary').get());
  await assertSucceeds(db.doc('trees/primary/people/p1').get());
  await assertSucceeds(db.doc('trees/primary/personPrivate/p1').get());
  await assertSucceeds(db.doc('auditEvents/event1').get());
});

test('prevents the browser client from mutating live data', async () => {
  const db = environment.authenticatedContext('admin').firestore();
  await assertFails(db.doc('trees/primary/people/p1').update({name: 'Bypass'}));
  await assertFails(db.doc('trees/primary').update({schemaVersion: 99}));
});

test('prevents every client from changing sole-admin access', async () => {
  const adminDb = environment.authenticatedContext('admin').firestore();
  const otherDb = environment.authenticatedContext('other').firestore();
  await assertFails(adminDb.doc('adminAccess/sole').update({uid: 'other'}));
  await assertFails(otherDb.doc('adminAccess/sole').set({
    uid: 'other', treeId: 'primary', status: 'active',
  }));
});
