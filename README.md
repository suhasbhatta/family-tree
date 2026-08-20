# Private Family Tree

A Flutter Web/PWA for one private family tree, administered by a small group of
approved Google accounts. GitHub Pages hosts the static application while
Firebase Authentication and Cloud Firestore protect the private family data.
Cloud Functions and phone verification are not required.

## What it supports

- Google Sign-In for 2–3 pre-approved administrators
- UID-based administrator allowlist that browser clients cannot modify
- Admin-managed people, relationships, tree root, import, and export
- Version-checked profile updates to prevent administrators overwriting each other
- Private contact details available only to approved administrators
- Privacy-safe audit records for every tree mutation
- Search, tree view, duplicate detection, and relationship finding
- Installable GitHub Pages PWA

Family data and administrator records remain in Firestore and are never bundled
into the public GitHub Pages artifact.

## Architecture

```text
GitHub Pages (Flutter Web/PWA)
       │ HTTPS + Firebase user token
       ├── Firebase Authentication (Google Sign-In)
       └── Cloud Firestore
             ├── adminAccess/{googleUid} (console-managed allowlist)
             ├── trees/{treeId}/... (private family data)
             └── auditEvents/{eventId}
```

Firestore Security Rules require a verified Google session and an active
`adminAccess/{uid}` record for the configured tree. Admin records cannot be
created, changed, or deleted by the web application.

## Prerequisites

- Flutter 3.44.4 (the repository includes `.tool-versions` for asdf)
- Node.js 22 and Java 21 for Firestore rule tests
- Firebase CLI
- A Firebase project with one Firestore database
- A GitHub repository with Pages enabled

## Firebase setup

1. Open **Firebase Console → Authentication → Sign-in method**.
2. Enable **Google**, select a project support email, and save.
3. Disable **Phone** after the Google-admin migration has been verified.
4. Under **Authentication → Settings → Authorized domains**, keep
   `localhost` and add the exact Pages host, such as `suhasbhatta.github.io`.
5. Keep the existing Firestore database and tree data. Do not recreate it.
6. Deploy the new rules only:

   ```bash
   npx firebase-tools deploy --only firestore --project parivara-ada26
   ```

### Approve each Google administrator

Administrator access is keyed by Firebase UID, not by an email stored in the
repository.

1. Run or deploy the new app.
2. Ask each administrator to click **Sign in with Google** once. Their first
   attempt is expected to show an access-denied message.
3. Open **Firebase Console → Authentication → Users** and copy that Google
   user's UID.
4. Open **Firestore Database → Data** and create:

   ```text
   adminAccess/{copiedUid}
   ```

   with these fields:

   ```text
   treeId      string   primary
   status      string   active
   displayName string   Administrator name   (optional)
   ```

5. Have that administrator sign in again. Repeat for each of the 2–3 accounts.

Never create an `adminAccess` document from the application, commit Gmail
addresses or UIDs, or grant a user access based only on a client-side check.
Each administrator should enable Google 2-Step Verification, preferably with a
passkey or security key, because these accounts can export and modify the full tree.

## Migration from the phone/Functions version

Use this order so existing family data remains available:

1. Enable Google Sign-In and add the authorized Pages domain.
2. Run the new app locally and let every administrator attempt Google sign-in.
3. Create each `adminAccess/{uid}` record in Firestore Console.
4. Deploy the new Firestore rules.
5. Deploy the new GitHub Pages build and verify add/edit/delete/import/export.
6. Delete the old deployed functions:

   ```bash
   npx firebase-tools functions:delete \
     claimAdminAccess savePerson deletePerson saveFamilyUnit \
     deleteFamilyUnit setRootFamilyUnit importTree \
     --region asia-south1 --project parivara-ada26
   ```

7. Disable the Phone authentication provider.
8. The old `adminAccess/sole`, `bootstrapAdmins`, and `_rateLimits` documents are
   no longer used. After making a backup and verifying the Google-admin version,
   they may be deleted manually from Firestore Console.
9. In **Firebase Console → Usage and billing → Details & settings**, downgrade
   the project to Spark. Confirm that no deployed Functions or other paid Google
   Cloud resources remain before unlinking the billing account.

Deleting functions or legacy documents is intentionally a post-verification
manual step; it is not performed by the web deployment.

## Local development

Start the Auth and Firestore emulators:

```bash
npx firebase-tools emulators:start --only auth,firestore
```

Run Flutter in another terminal:

```bash
flutter run -d chrome \
  --dart-define=FIREBASE_API_KEY=your-public-web-api-key \
  --dart-define=FIREBASE_APP_ID=your-web-app-id \
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=your-sender-id \
  --dart-define=FIREBASE_PROJECT_ID=your-project-id \
  --dart-define=FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com \
  --dart-define=FAMILY_TREE_ID=primary
```

Firebase Web identifiers are injected at build time. Never commit privileged
service-account keys, OAuth client secrets, access tokens, or private family
exports.

## GitHub Pages deployment

In **Repository settings → Secrets and variables → Actions → Variables**, add:

- `FIREBASE_API_KEY`
- `FIREBASE_APP_ID`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_AUTH_DOMAIN`
- `FAMILY_TREE_ID` (`primary`)

Select **GitHub Actions** as the Pages source. A push to `main` runs Flutter
analysis/tests, Firestore rule tests, builds with `/family-tree/` as the base
path, and deploys only after the checks pass.

## Verification

```bash
flutter analyze
flutter test

cd functions
npm ci
npm run test:rules
```

The `functions/` directory is retained only for the Firestore emulator test
tooling and as migration history. Its package has no Cloud Functions/Admin SDK
dependencies, it is not part of `firebase.json`, and `firebase deploy` cannot
redeploy it as a Functions codebase.

## Security defaults

- Google handles OAuth; the app stores no password or custom authentication token.
- Authentication persistence is limited to the current browser session.
- Firestore access requires a verified Google session and an active UID allowlist record.
- Administrator allowlist records are immutable from every browser client.
- Firestore rules deny unknown collections and validate writable document schemas.
- Person updates increment a version inside a transaction to detect concurrent edits.
- Import files are JSON-only, capped at 512 KB, and limited to 300 people and
  150 family units.
- Audit events contain stable UIDs, action names, and resource IDs—not profile
  contents, tokens, or Gmail addresses.
- Firestore persistent offline caching is disabled for private family data.
- The web client uses an explicit Content Security Policy and HTTPS-only production hosting.

## Existing React prototype

`web/magnetic-tree` remains an untouched visual prototype and is not included
as an application route or family data source.

## License

MIT
