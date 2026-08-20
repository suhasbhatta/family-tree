# Private Family Tree

A sole-administrator Flutter Web/PWA for one private family tree. The static
app is hosted by GitHub Pages; Firebase provides SMS authentication, Firestore
data, and server-enforced administration.

## What it supports

- Mobile number and SMS OTP sign-in with Firebase reCAPTCHA protection
- Exactly one administrator account; every other authenticated account is denied
- Admin-managed people, relationships, tree root, import, and export
- Immediate versioned profile and relationship updates by the administrator
- Private contact numbers readable only by the administrator
- Search, tree view, duplicate detection, and relationship finding
- Installable GitHub Pages PWA

Family data, administrator access, and OTP state are never stored in the public
GitHub repository. Full JSON import/export is available only to the administrator.

## Architecture

```text
GitHub Pages (Flutter Web/PWA)
       │ HTTPS + Firebase user token
       ├── Firebase Authentication (phone OTP + reCAPTCHA)
       ├── Cloud Firestore (read-only from the client)
       └── Callable Cloud Functions (all mutations and authorization)
```

Firestore rules deny writes from every browser client. Callable functions
validate input, verify sole-administrator access and family relationships, update live data,
and append privacy-safe audit events.

## Prerequisites

- Flutter 3.44.4 (the repository includes `.tool-versions` for asdf)
- Node.js 22
- Java 21 for the Firestore emulator
- Firebase CLI and a Firebase project
- A GitHub repository with Pages enabled

## Firebase setup

1. Create a Firebase project.
2. Enable **Authentication → Phone**. Configure Firebase test phone numbers for
   development before enabling real SMS traffic.
3. Create a Firestore database in a region close to the family members.
4. Add a Firebase Web app. Add both `localhost` and
   `suhasbhatta.github.io` (or the actual Pages/custom domain) to Authentication
   authorized domains.
5. Copy the local project selector and install dependencies:

   ```bash
   cp .firebaserc.example .firebaserc
   # Replace your-firebase-project-id inside .firebaserc.
   cd functions
   npm ci
   cd ..
   ```

6. Deploy rules, indexes, and functions. When prompted for `TREE_ID`, use
   `primary` unless the build is intentionally configured otherwise:

   ```bash
   firebase deploy --only firestore,functions
   ```

### Bootstrap the sole admin

The admin number is hashed locally and the raw number is never committed. The
seed script uses Application Default Credentials:

```bash
gcloud auth application-default login
cd functions
npm run seed-admin -- \
  --project your-firebase-project-id \
  --phone +919999999999 \
  --tree-id primary
```

After seeding, the admin signs in through the normal OTP screen. The bootstrap
record is atomically marked claimed and `adminAccess/sole` prevents any second
administrator from claiming the tree.

## Local development

Start Firebase emulators:

```bash
firebase emulators:start
```

Run Flutter in another terminal with non-production Firebase Web identifiers:

```bash
flutter run -d chrome \
  --dart-define=FIREBASE_API_KEY=your-public-web-api-key \
  --dart-define=FIREBASE_APP_ID=your-web-app-id \
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=your-sender-id \
  --dart-define=FIREBASE_PROJECT_ID=your-project-id \
  --dart-define=FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com \
  --dart-define=FAMILY_TREE_ID=primary \
  --dart-define=USE_FIREBASE_EMULATORS=true
```

The values above identify the public Firebase Web app; privileged credentials,
service-account keys, and admin phone numbers must never be passed as Dart
defines or committed.

## GitHub Pages deployment

In **Repository settings → Secrets and variables → Actions → Variables**, add:

- `FIREBASE_API_KEY`
- `FIREBASE_APP_ID`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_AUTH_DOMAIN`
- `FAMILY_TREE_ID` (`primary`)

Then select **GitHub Actions** as the Pages source. A push to `main` runs Flutter
analysis/tests, Functions lint/tests, Firestore rule tests, builds with base path
`/family-tree/`, and deploys only after every check passes.

If the repository name changes, update `--base-href` in
`.github/workflows/pages.yml`.

## Verification

```bash
flutter analyze
flutter test

cd functions
npm run lint
npm test
npm run test:rules
```

For a release-equivalent local build:

```bash
flutter build web --release --base-href /family-tree/ \
  --dart-define=FIREBASE_API_KEY=... \
  --dart-define=FIREBASE_APP_ID=... \
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=... \
  --dart-define=FIREBASE_PROJECT_ID=... \
  --dart-define=FIREBASE_AUTH_DOMAIN=... \
  --dart-define=FAMILY_TREE_ID=primary
```

## Security and privacy defaults

- Firebase manages OTP sessions; the app stores no password or custom token.
- reCAPTCHA protects the OTP endpoint from basic abuse.
- Server functions are capped at two instances and also apply per-admin mutation
  limits.
- Sole-admin access and live family data cannot be written directly by clients.
- Contact information is split into admin-only Firestore documents.
- Imports are JSON-only, capped at 512 KB, fully validated before mutation, and
  limited to 300 people and 150 family units.
- Logs and audit events contain stable IDs and action names, not phone numbers,
  OTP codes, tokens, or profile contents.
- The web client uses an explicit Content Security Policy and does not enable
  persistent Firestore offline caching for private family data.

## Existing React prototype

`web/magnetic-tree` remains an untouched visual prototype. Flutter's production
web entry files live at the root of `web/`, so the prototype is not included as
an application route or data source.

## License

MIT
