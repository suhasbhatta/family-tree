# Parivara Family Archive

A private, web-first family tree for administrator-approved Google accounts. The production UI is built with React, TypeScript, and [React Flow](https://reactflow.dev/); GitHub Pages hosts the static PWA while Firebase Authentication and Cloud Firestore protect the family data.

## Highlights

- Interactive family canvas with custom couple/person nodes, generation layout, relationship edges, minimap, pan, zoom, fit-to-view, search, and path highlighting
- First-time Google sign-ins create a pending request and cannot read family data
- Existing administrators approve each request as a read-only user or an administrator
- Admin management for people, couples/family units, children, and the root family
- Profile detail drawer, responsive navigation, relationship finder, and duplicate review
- Validated JSON import/export with size, ID, date, duplicate, and reference checks
- Version-checked person updates and privacy-safe audit events
- Installable, responsive GitHub Pages PWA with network-only service worker behavior so private family data is never placed in a browser cache

Family data, access records, Gmail addresses, and Firebase credentials are not committed to this repository. Firebase's public web identifiers are injected by GitHub Actions variables during the build. Only explicitly approved Google accounts can view the tree.

## Architecture

```text
GitHub Pages (React + React Flow PWA)
       │ HTTPS + Firebase Google session
       ├── Firebase Authentication
       └── Cloud Firestore
             ├── adminAccess/{googleUid}
             ├── accessRequests/{googleUid}
             ├── trees/{treeId}/people/{personId}
             ├── trees/{treeId}/personPrivate/{personId}
             ├── trees/{treeId}/familyUnits/{unitId}
             └── auditEvents/{eventId}
```

The original Flutter client remains in the repository as migration history. The production deployment is built from `web/magnetic-tree`.

## Firebase configuration

Keep the following Firebase configuration:

1. **Authentication → Sign-in method → Google** enabled.
2. The exact GitHub Pages host (for example, `suhasbhatta.github.io`) in **Authentication → Settings → Authorized domains**.
3. Keep at least one bootstrap administrator in `adminAccess/{firebaseUid}`:

   ```text
   treeId      string   primary
   status      string   active
   role        string   admin (optional for existing legacy administrators)
   displayName string   Administrator name (optional)
   ```

4. The current `trees/primary` data.

After that, do not create access records manually. A new Google account creates `accessRequests/{uid}` automatically. An administrator reviews it in **Access requests** and approves it as `user` or `admin`; the app creates the corresponding access record atomically.

Deploy rules when `firestore.rules` changes:

```bash
npx firebase-tools deploy --only firestore --project parivara-ada26
```

## Local development

From the React app directory:

```bash
cd web/magnetic-tree
npm ci
```

Create an uncommitted `.env.local` with the public Firebase web configuration:

```text
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FAMILY_TREE_ID=primary
```

Then run:

```bash
npm run dev
```

Never put a service-account key, OAuth client secret, access token, administrator UID/email, or family export in an environment file that is committed.

## Verification

```bash
cd web/magnetic-tree
npm run lint
npm test
npm run build

cd ../../functions
npm ci
npm run test:rules
```

## GitHub Pages deployment

Under **Repository settings → Secrets and variables → Actions → Variables**, retain:

- `FIREBASE_API_KEY`
- `FIREBASE_APP_ID`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_AUTH_DOMAIN`
- `FAMILY_TREE_ID` (`primary`)

Select **GitHub Actions** as the Pages source. A push to `main` verifies the React app and Firestore rules, derives the Pages base path from the repository name, and deploys `web/magnetic-tree/dist`. The current public URL is `https://suhasbhatta.github.io/parivara/`.

## Security defaults

- Google provides authentication; session persistence is limited to the current browser session.
- Firestore rules block family data until a verified Google account has an active approved access record.
- New users can create and read only their own pending access request; only administrators can list and decide requests.
- Private contact documents and audit records are readable only by active administrators for the configured tree.
- Only active administrators can add, edit, delete, import, export, or change family relationships.
- Access grants require an administrator decision and matching pending request in the same atomic transaction, preventing self-approval or standalone role creation.
- Firestore rules validate all writable schemas and every mutation creates a redacted audit event.
- Import is admin-only, JSON-only, capped at 512 KB, 300 people, and 150 family units.
- The service worker performs network-only fetches and stores no private family responses.
- The app loads no external fonts or analytics and applies a restrictive Content Security Policy.

## License

MIT
