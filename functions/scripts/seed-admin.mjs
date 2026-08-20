import {createHash} from 'node:crypto';
import {applicationDefault, initializeApp} from 'firebase-admin/app';
import {FieldValue, getFirestore} from 'firebase-admin/firestore';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const projectId = argument('--project');
const rawPhone = argument('--phone');
const treeId = argument('--tree-id') ?? 'primary';

if (!projectId || !rawPhone) {
  throw new Error(
    'Usage: npm run seed-admin -- --project PROJECT_ID --phone +919999999999 '
    + '[--tree-id primary]',
  );
}

const phone = rawPhone.trim().replace(/[\s()-]/g, '');
if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
  throw new Error('Phone must use E.164 format, for example +919999999999.');
}
if (!/^[A-Za-z0-9_-]{1,128}$/.test(treeId)) {
  throw new Error('Invalid tree ID.');
}

initializeApp({credential: applicationDefault(), projectId});
const db = getFirestore();
const phoneHash = createHash('sha256').update(phone, 'utf8').digest('hex');
const existingAdmin = await db.collection('adminAccess').doc('sole').get();
if (existingAdmin.exists) {
  throw new Error('The sole administrator has already claimed access.');
}

await db.collection('bootstrapAdmins').doc(phoneHash).set({
  treeId,
  status: 'pending',
  phoneMasked: `${phone.slice(0, 3)}••••${phone.slice(-2)}`,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
});

process.stdout.write(
  `Admin bootstrap created for ${phone.slice(0, 3)}••••${phone.slice(-2)}.\n`,
);
