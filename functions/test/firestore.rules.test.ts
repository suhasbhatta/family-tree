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
      treeId: 'primary', status: 'active', role: 'admin', displayName: 'Second admin',
    });
    await db.doc('adminAccess/user').set({
      treeId: 'primary', status: 'active', role: 'user', displayName: 'Approved user',
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
    await db.doc('accessRequests/requestor').set({
      treeId: 'primary',
      email: 'requestor@example.com',
      displayName: 'Requesting User',
      status: 'pending',
      approvedRole: null,
      requestedAt: now,
      updatedAt: now,
      reviewedAt: null,
      reviewedBy: null,
    });
  });
});

test('denies all family data to unauthenticated visitors', async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(db.doc('trees/primary').get());
  await assertFails(db.doc('trees/primary/people/p1').get());
});

test('blocks an unapproved Google account from family data', async () => {
  const db = environment.authenticatedContext('other', googleClaims).firestore();
  await assertFails(db.doc('trees/primary').get());
  await assertFails(db.doc('trees/primary/people/p1').get());
  await assertFails(db.doc('trees/primary/familyUnits/f1').get());
  await assertSucceeds(db.doc('adminAccess/other').get());
  await assertFails(db.doc('trees/primary/personPrivate/p1').get());
  await assertFails(db.doc('auditEvents/event1').get());
  await assertFails(db.doc('adminAccess/admin').get());
});

test('lets a verified Google account create only its own pending request', async () => {
  const db = environment.authenticatedContext('new-user', {
    email: 'new-user@example.com',
    email_verified: true,
    firebase: {sign_in_provider: 'google.com'},
  }).firestore();
  await assertSucceeds(db.doc('accessRequests/new-user').set({
    treeId: 'primary',
    email: 'new-user@example.com',
    displayName: 'New User',
    status: 'pending',
    approvedRole: null,
    requestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
  }));
  await assertSucceeds(db.doc('accessRequests/new-user').get());
  await assertFails(db.doc('accessRequests/someone-else').set({
    treeId: 'primary', email: 'new-user@example.com', displayName: 'Wrong ID',
    status: 'pending', approvedRole: null, requestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(), reviewedAt: null, reviewedBy: null,
  }));
});

test('allows an approved user to view public data but never mutate it', async () => {
  const db = environment.authenticatedContext('user', googleClaims).firestore();
  await assertSucceeds(db.doc('trees/primary').get());
  await assertSucceeds(db.doc('trees/primary/people/p1').get());
  await assertSucceeds(db.doc('trees/primary/familyUnits/f1').get());
  await assertFails(db.doc('trees/primary/personPrivate/p1').get());
  await assertFails(db.doc('auditEvents/event1').get());
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

test('allows only administrators to list tree-scoped access requests', async () => {
  const adminDb = environment.authenticatedContext('admin', googleClaims).firestore();
  const userDb = environment.authenticatedContext('user', googleClaims).firestore();
  await assertSucceeds(adminDb.collection('accessRequests').where('treeId', '==', 'primary').get());
  await assertFails(userDb.collection('accessRequests').where('treeId', '==', 'primary').get());
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

test('allows an administrator to atomically approve a request as user', async () => {
  const adminDb = environment.authenticatedContext('admin', googleClaims).firestore();
  const batch = adminDb.batch();
  batch.set(adminDb.doc('adminAccess/requestor'), {
    treeId: 'primary', status: 'active', role: 'user',
    displayName: 'Requesting User', email: 'requestor@example.com',
    createdAt: serverTimestamp(), approvedAt: serverTimestamp(), approvedBy: 'admin',
  });
  batch.update(adminDb.doc('accessRequests/requestor'), {
    status: 'approved', approvedRole: 'user', updatedAt: serverTimestamp(),
    reviewedAt: serverTimestamp(), reviewedBy: 'admin',
  });
  batch.set(adminDb.doc('auditEvents/approval'), {
    treeId: 'primary', actorUid: 'admin', action: 'access_request.approved',
    resourceType: 'accessRequest', resourceId: 'requestor', createdAt: serverTimestamp(),
  });
  await assertSucceeds(batch.commit());

  const approvedDb = environment.authenticatedContext('requestor', {
    email: 'requestor@example.com', email_verified: true,
    firebase: {sign_in_provider: 'google.com'},
  }).firestore();
  await assertSucceeds(approvedDb.doc('trees/primary').get());
  await assertFails(approvedDb.doc('trees/primary/personPrivate/p1').get());
});

test('allows an administrator to reject a pending request without granting access', async () => {
  const adminDb = environment.authenticatedContext('admin', googleClaims).firestore();
  const batch = adminDb.batch();
  batch.update(adminDb.doc('accessRequests/requestor'), {
    status: 'rejected', approvedRole: null, updatedAt: serverTimestamp(),
    reviewedAt: serverTimestamp(), reviewedBy: 'admin',
  });
  batch.set(adminDb.doc('auditEvents/rejection'), {
    treeId: 'primary', actorUid: 'admin', action: 'access_request.rejected',
    resourceType: 'accessRequest', resourceId: 'requestor', createdAt: serverTimestamp(),
  });
  await assertSucceeds(batch.commit());

  const rejectedDb = environment.authenticatedContext('requestor', {
    email: 'requestor@example.com', email_verified: true,
    firebase: {sign_in_provider: 'google.com'},
  }).firestore();
  await assertFails(rejectedDb.doc('trees/primary').get());
  await assertSucceeds(rejectedDb.doc('accessRequests/requestor').get());
});

test('prevents self-approval and non-atomic access grants', async () => {
  const adminDb = environment.authenticatedContext('admin', googleClaims).firestore();
  const requestorDb = environment.authenticatedContext('requestor', {
    email: 'requestor@example.com', email_verified: true,
    firebase: {sign_in_provider: 'google.com'},
  }).firestore();
  await assertFails(adminDb.doc('adminAccess/admin').update({status: 'disabled'}));
  await assertFails(adminDb.doc('adminAccess/requestor').set({
    treeId: 'primary', status: 'active', role: 'admin',
    displayName: 'Requesting User', email: 'requestor@example.com',
    createdAt: serverTimestamp(), approvedAt: serverTimestamp(), approvedBy: 'admin',
  }));
  await assertFails(requestorDb.doc('accessRequests/requestor').update({
    status: 'approved', approvedRole: 'admin', updatedAt: serverTimestamp(),
    reviewedAt: serverTimestamp(), reviewedBy: 'requestor',
  }));
  await assertFails(requestorDb.doc('adminAccess/requestor').set({
    treeId: 'primary', status: 'active', role: 'admin',
    displayName: 'Requesting User', email: 'requestor@example.com',
    createdAt: serverTimestamp(), approvedAt: serverTimestamp(), approvedBy: 'requestor',
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
