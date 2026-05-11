# PlantPapi — Roadmap

A personal-but-shareable Progressive Web App for houseplant care reminders. Hosted free on GitHub Pages, backed by Firebase (Auth + Firestore + Storage + FCM).

## Stack

- **Frontend**: Vite + React + TypeScript
- **PWA**: `vite-plugin-pwa` (service worker, install manifest, offline cache)
- **Hosting**: GitHub Pages (free), deployed via GitHub Actions on push to `main`
- **Auth**: Firebase Authentication (Google sign-in provider) — chosen so friends/family sign in without "unverified app" OAuth-verification warnings
- **Plant data**: Cloud Firestore at `users/{uid}` (one document per user; plants live as a field)
- **Photos**: Firebase Storage at `users/{uid}/photos/{uuid}.jpg`
- **Push**: Firebase Cloud Messaging (FCM)
- **Cron**: GitHub Actions scheduled workflow runs every 30 minutes, uses Firebase Admin SDK to send FCM pushes only to users whose preferred local time slot is currently open

**Total cost**: $0 across all phases. GitHub Pages, GitHub Actions free minutes, Firebase Spark plan covers Auth + Firestore + Storage + FCM at personal-app volumes.

---

## Phase 1 — Local-only MVP ✅ Done

- Vite + React + TS scaffold, PWA manifest, auto-generated icons.
- Plant CRUD, Plants list grouped by room, Today view with sectioned due/upcoming tasks.
- Schedule logic supports multiple non-overlapping rules per task (`intervalDays` + `activeMonths`). Interval chosen by month of `lastDone`.
- Storage v2, version-gated.
- GitHub Pages auto-deploy via `.github/workflows/deploy.yml`.

## Phase 2 — Firebase Auth + Firestore + Storage ✅ Done

Google sign-in (popup desktop / redirect mobile), Firestore as canonical store with localStorage cache for fast first-paint, photos uploaded to Firebase Storage with client-side 1024 px resize, install banners for both Android and iOS, in-app Help and Settings screens.

## Phase 3 — FCM push via GitHub Actions cron ✅ Done

Per-user notification time stored as `notificationTime` (half-hour slot, "HH:MM") + auto-detected IANA timezone. GitHub Actions cron runs every 30 min, iterates user docs, sends data-only FCM payloads only to users whose local time matches their preferred slot AND have at least one task due today/overdue. `lastNotifiedDay` dedupes within a day; only updated on successful send. Service worker shows notifications in background via `onBackgroundMessage`; foreground messages handled in-app via `onMessage` + `registration.showNotification`.

## Phase 3 detailed reference (preserved)

**Goal**: Android and iOS 16.4+ users get notifications when tasks are due, even if the app hasn't been opened in days.

**One-time setup** (to be added to `SETUP.md` when starting):
1. Enable Cloud Messaging in the existing Firebase project.
2. Project Settings → Cloud Messaging → generate Web Push **VAPID key**. Add as `VITE_FIREBASE_VAPID_KEY` GitHub Secret + `.env.local`.
3. Project Settings → Service Accounts → **Generate new private key** (JSON). Add as `FIREBASE_SERVICE_ACCOUNT` GitHub Secret.
4. iOS users must Add-to-Home-Screen and grant permission from the home-screen app (not Safari) for push to work.

**Code**:
- `src/lib/firebase.ts` — `getMessaging`, `getToken()` after permission, save into `users/{uid}.fcmTokens` (deduped).
- `public/firebase-messaging-sw.js` — site-root service worker for background push receipt; click handler opens the app.
- `src/lib/storage.ts` — on state save, write denormalized `users/{uid}/dueDates/{plantId_taskType}` docs (`{ dueAt: Timestamp, plantName, taskType }`). Delete stale dueDate docs.
- `scripts/notify.ts` — cron entry point:
  1. `firebase-admin.initializeApp({ credential: cert(serviceAccount) })`.
  2. `collectionGroup('dueDates').where('dueAt', '<=', now).get()`.
  3. For each, look up parent user's `fcmTokens` and send via `messaging().sendEachForMulticast(...)`.
  4. Prune dead tokens on `messaging/registration-token-not-registered`.
- `.github/workflows/notify.yml` — `cron: '0 12 * * *'` (8 AM ET) + `workflow_dispatch`. Installs `firebase-admin`, runs `notify.ts`.

**Verification**: backdate a plant to "due today," run `gh workflow run notify.yml`, confirm Android (or iOS PWA) push within ~1 min. Mark done in app → next cron does not re-send (dueDate doc deleted).

---

## Out of scope (explicitly)

- Multi-user accounts beyond Google sign-in (each Google account already isolates to its own Firestore doc).
- Watering history charts.
- Plant species lookups / AI care suggestions.
- Day-of-week schedules (multi-rule with months already covers the practical cases).
- Conflict resolution beyond last-write-wins.
- Drag-to-reorder schedules or plants.
