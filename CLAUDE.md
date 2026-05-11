# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**PlantPapi** — a personal-but-shareable PWA for houseplant care reminders. Hosted free on GitHub Pages at `https://ryananders95.github.io/plant-reminder/`, backed by a single Firebase project (`plant-reminder-a93bf`) for auth, data, photos, and push.

See `ROADMAP.md` for the full phase plan and architectural rationale; `SETUP.md` for one-time Firebase Console setup (owner-only).

## Commands

```bash
npm install
npm run dev          # Vite dev server on http://localhost:5173
npm run build        # tsc -b && vite build (PWA assets auto-generated)
npm run preview      # serve the production build locally
npm run typecheck    # tsc -b --noEmit only

# Cron / scripts (need service-account.json at project root)
npx tsx scripts/notify.ts                              # send pushes for current window
npx tsx scripts/restore-plants.ts <uid> <data.json>    # recover from a localStorage export
```

There is no test suite.

The user's environment is **Windows + PowerShell**. Node was installed via `winget`; if `npm` errors with a script execution policy issue, the fix is `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` (already done). Bash and the bundled Git Bash both work; pass `export PATH="/c/Program Files/nodejs:$PATH"` when invoking node tooling from Bash.

## Architecture (the big picture)

**Stack**: Vite + React 19 + TypeScript + `vite-plugin-pwa`. Firebase Web SDK 11 for client, `firebase-admin` 13 in the cron. Two GitHub Actions workflows: `deploy.yml` (build → Pages) and `notify.yml` (every 30 min cron → FCM).

**Data lives in one Firestore doc per user**: `users/{uid}` holds the full `AppState` — `plants: Plant[]`, `version`, plus push-related fields (`fcmTokens`, `notificationsEnabled`, `notificationTime`, `timezone`, `lastNotifiedDay`). Photos live in Firebase Storage at `users/{uid}/photos/{uuid}.jpg`. Plants reference photos by UUID (`photoFileId`).

**localStorage is a read cache, Firestore is canonical.** First paint reads `plantreminder.state` for instant render; an `onSnapshot` subscription then overwrites with server state. App-side mutations write through both.

**Schedules**: every plant task (water / mist / fertilize) has a `ScheduleRule[]`. Each rule has `intervalDays` + `activeMonths`. Rules are non-overlapping (the UI enforces). The interval used to compute next-due is selected by the **month of the last-done date** — see `nextDueDate()` in `src/lib/schedule.ts`. This avoids the chicken-and-egg "I need the interval to find the month, but the month decides the interval" trap.

**The cron and the web app share scheduling logic.** `scripts/notify.ts` imports `collectDueItems` from `src/lib/schedule.ts` via `tsx` — there is no duplicated copy. Don't fork the math.

**Two service workers coexist.** `vite-plugin-pwa` generates one at site-root scope (`/plant-reminder/`) for offline caching. The Firebase Messaging SW (`public/firebase-messaging-sw.js`) is manually registered at a nested scope (`/plant-reminder/firebase-cloud-messaging-push-scope/`) so it doesn't clobber the PWA cache. The Firebase config inside that SW is hardcoded (it's already public in the deployed bundle); update it there if you ever rotate Firebase project credentials.

**Authentication uses Firebase Auth, not raw Google OAuth.** This was a deliberate Phase 2 pivot — Firebase proxies through Google's pre-verified backend so users don't see "unverified app" warnings. `authDomain` is `firebaseapp.com` (cross-origin from our `github.io` deployment), which breaks the redirect flow on mobile due to third-party storage blocking. **Always use `signInWithPopup`, never `signInWithRedirect`** (see `src/lib/auth.ts`).

## Non-obvious things to know before editing

- **`TASK_TYPES` order is canonical** (`['water', 'mist', 'fertilize']` in `src/types.ts`). It drives display order for: ScheduleEditor sections in PlantForm, task buttons in TodayView cards, summary text in PlantList rows, and tie-breaks in `collectDueItems`. Don't reorder it unless you mean to reorder the entire app's UI.

- **Firestore rejects `undefined` field values** by default. We use `initializeFirestore(app, { ignoreUndefinedProperties: true })` in `src/lib/firebase.ts`. If you ever switch to `getFirestore`, undefined values in `Plant.room`/`notes`/`photoFileId` will throw at write time.

- **`saveState` deliberately excludes `fcmTokens` and `lastNotifiedDay`** from its Firestore writes (see `src/lib/storage.ts`). Those fields are managed by `messaging.ts` (via `arrayUnion`/`arrayRemove`) and the cron respectively. Writing them via the app's full-state save would race-clobber concurrent updates. Use `patchUserDoc(uid, partial)` for targeted writes that bypass `saveState` entirely.

- **There's a hydration gate.** `App.tsx` tracks a `hydrated` boolean that flips true only after the first `onSnapshot` callback fires. Any side-effect that wants to *write* to Firestore based on local state (e.g., auto-detect timezone, default settings) must check `hydrated` first — otherwise it'll write `INITIAL_STATE` (empty plants) before Firestore data has loaded and overwrite the user's data. Don't reintroduce a write-during-render or write-without-`hydrated` pattern.

- **FCM SW registration must wait for `activated`.** `registerAndActivate()` in `src/lib/messaging.ts` registers the SW and then awaits a `statechange` to `'activated'` before resolving. Without this, the first call to `getToken` races ahead and returns `null`, breaking the "first tap on enable notifications" flow.

- **Cron sends data-only payloads** (`data: { title, body }`, no `notification` field). Notification-field payloads cause Firebase Web SDK to auto-display *in addition to* firing `onBackgroundMessage`, resulting in two notifications. Both `scripts/notify.ts` and the SW handler in `public/firebase-messaging-sw.js` are wired around this.

- **Foreground push: use `registration.showNotification(...)`, not `new Notification(...)`.** The constructor throws on Android Chrome for installed PWAs. App.tsx's foreground handler uses `navigator.serviceWorker.ready` to grab a registration and call `showNotification` from the main thread.

- **iOS push only works for the installed PWA**, not in a Safari tab. The Settings screen handles this gracefully (`isIOS && !isStandalone` shows an install hint instead of the toggle). The `InstallBanner` component covers the in-app nudge.

- **Vite `base` is `'./'`** (relative). Where absolute paths matter (SW registration, notification icons), resolve via `new URL('asset', document.baseURI).pathname` rather than relying on `import.meta.env.BASE_URL`, which is `'./'` and not document-rooted.

## Don't rename these (they look renameable but aren't)

- The GitHub repo slug `plant-reminder` — renaming changes the deployed URL and breaks every existing installed PWA.
- The Firebase project ID `plant-reminder-a93bf` — Firebase doesn't support project rename; you'd have to migrate.
- The localStorage cache keys `plantreminder.state` and `plantreminder.installBannerDismissed` — changing them orphans every user's local cache.
- The `name` field in `package.json` (`plant-reminder`) — purely internal npm id, but inertia exceeds value.

User-facing strings ("PlantPapi", "Plant Reminder" — formerly) are safe to edit.

## Files for orientation

| Path | What it owns |
|---|---|
| `src/App.tsx` | Root component, auth gate, view routing (today/plants/form/help/settings), timezone auto-set, foreground message handler |
| `src/types.ts` | `AppState`, `Plant`, `ScheduleRule`, `TASK_TYPES` (canonical ordering), `TASK_LABELS`, `TASK_EMOJIS` |
| `src/lib/schedule.ts` | `nextDueDate`, `daysUntilDue`, `collectDueItems`, `groupTodayByPlant`. Shared by client and `scripts/notify.ts`. |
| `src/lib/storage.ts` | Firestore subscription + `saveState` (with field exclusions) + `patchUserDoc` + localStorage cache |
| `src/lib/firebase.ts` | Firebase app init. `initializeFirestore` with `ignoreUndefinedProperties: true`. |
| `src/lib/auth.ts` | `useAuth` hook, `signInWithPopup` always. |
| `src/lib/messaging.ts` | FCM init, SW register + wait-for-activation, token register/unregister, foreground message subscription |
| `src/lib/photos.ts` | Image resize (canvas, 1024 px JPEG ~85%), upload, `getPhotoUrl` (cached), `deletePhoto`, `usePhotoUrl` hook |
| `scripts/notify.ts` | Cron entry. Iterates `users/*`, filters by local time window + dedupes via `lastNotifiedDay`, sends data-only FCM. |
| `public/firebase-messaging-sw.js` | FCM SW (compat scripts from gstatic CDN, hardcoded Firebase config) |
| `.github/workflows/deploy.yml` | Build + push to GitHub Pages; injects `VITE_FIREBASE_*` from secrets |
| `.github/workflows/notify.yml` | Cron `0,30 * * * *`; runs `notify.ts` via `tsx` with `FIREBASE_SERVICE_ACCOUNT` secret |
| `SETUP.md` | One-time Firebase Console setup (owner-only) |
| `ROADMAP.md` | Phase 1/2/3 plan + architectural decisions |
