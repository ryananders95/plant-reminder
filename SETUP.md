# PlantPapi — One-time Setup

Everything in this doc is **owner-only** (you, Ryan). Friends and family who use the deployed app just tap "Sign in with Google" — they don't see any of this.

We use a single Firebase project for: sign-in, plant data (Firestore), photos (Storage), and (in Phase 3) push notifications.

---

## Phase 2 — Firebase Auth + Firestore + Storage

### 1. Create the Firebase project

- Open https://console.firebase.google.com/
- Click **Add project** (or "Create a project").
- **Project name**: `PlantPapi`. Click **Continue**.
- **Google Analytics**: **disable** it (we don't need it). Click **Create project**. Wait ~30 seconds, then **Continue**.

### 2. Enable Google as a sign-in provider

- In the left sidebar: **Build** → **Authentication** → **Get started**.
- Tab: **Sign-in method**.
- Click **Google** in the provider list → toggle **Enable**.
- Set **Project support email** to your email.
- Click **Save**.

This is the key step that solves the "unverified app" problem — Firebase Auth handles the OAuth dance through Google's pre-verified Firebase backend, so your friends see a normal Google sign-in screen with no warnings.

### 3. Register a Web app to get the config

- In the left sidebar, click the **gear icon** at the very top → **Project settings**.
- Scroll down to **Your apps** → click the **</>** (Web) icon.
- **App nickname**: `PlantPapi Web`.
- **Do NOT** check "Also set up Firebase Hosting."
- Click **Register app**.
- You'll see a code snippet with a `firebaseConfig` object — looks like:
  ```js
  const firebaseConfig = {
    apiKey: "AIza...",
    authDomain: "plant-reminder-xxxxx.firebaseapp.com",
    projectId: "plant-reminder-xxxxx",
    storageBucket: "plant-reminder-xxxxx.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abc123..."
  };
  ```
  **Copy the whole object** — you'll paste it to me. (These values are **not secret**; they end up in the deployed JS bundle and that's fine — Firebase security rules are what actually protect data.)
- Click **Continue to console**.

### 4. Add your deployed URL as an authorized domain

- Still in **Authentication** → **Settings** tab → scroll to **Authorized domains**.
- Click **Add domain** → enter `ryananders95.github.io` → **Add**.
- (`localhost` and your project's `firebaseapp.com` domain are already authorized.)

### 5. Enable Firestore Database

- Sidebar → **Build** → **Firestore Database** → **Create database**.
- **Location**: pick the region closest to you (e.g., `us-east1` for the US East Coast, `us-central` is also fine). **This is permanent** — pick once.
- **Start in production mode** → click **Create**. (Wait ~30 sec for provisioning.)
- Click the **Rules** tab → replace whatever is there with:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{uid} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
        match /{document=**} {
          allow read, write: if request.auth != null && request.auth.uid == uid;
        }
      }
    }
  }
  ```
- Click **Publish**.

### 6. Enable Cloud Storage

> **Requires the Blaze plan.** Cloud Storage for Firebase (`*.firebasestorage.app` buckets) only works on the pay-as-you-go **Blaze** plan. Firestore, Auth, and FCM work on the free Spark plan, but Storage does not. This app's usage fits within Blaze's free tier, so the expected bill is $0.
>
> - Upgrade: Console → ⚙ → **Usage and billing** → **Details & settings** → **Modify plan** → **Blaze**. Link a billing account that won't expire. A Google Cloud free-trial billing account closes after 90 days, and that drops the project back to Spark.
> - Set a budget alert while you're there. We use **$1**. Budgets only send emails; they don't cap spending.
>
> **Symptom if the project falls back to Spark:** every plant photo turns into the 🪴 placeholder, while plants, schedules, and settings keep working (those live in Firestore). The app shows a red "Couldn't load plant photos." toast. Fix: upgrade back to Blaze. The photo files and each plant's `photoFileId` survive the downgrade (confirmed 2026-11-17), so photos return without re-uploading.

- Sidebar → **Build** → **Storage** → **Get started**.
- Walk through prompts: **production mode**, use the same location you picked for Firestore. Click **Done**.
- Click the **Rules** tab → replace with:
  ```
  rules_version = '2';
  service firebase.storage {
    match /b/{bucket}/o {
      match /users/{uid}/{allPaths=**} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
  ```
- Click **Publish**.

### 7. Wire the firebaseConfig into the app

Copy each value from the `firebaseConfig` object (step 3) into `.env.local` using the keys in `.env.example` (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, etc.). For the deployed build, set the same values as GitHub Secrets so `deploy.yml` can inject them at build time.

The Firebase config inside `public/firebase-messaging-sw.js` is hardcoded (it ends up in the deployed bundle anyway). If you rotate the project, update it there too.

---

## Phase 3 — Cloud Messaging + cron (push notifications)

This adds daily push notifications. Each user can pick their own preferred notification time in the app's Settings screen. The GitHub Actions cron runs every 30 minutes and only pings users whose local time matches their preferred slot.

### 1. Generate a Web Push VAPID key

Web push needs a public/private key pair so the browser can verify push messages came from your app.

- Firebase Console → ⚙ (top left) → **Project settings**.
- **Cloud Messaging** tab.
- Scroll to **Web Push certificates**.
- If a key is already listed, copy its **Key pair** value.
- If not, click **Generate key pair**, then copy the resulting value.

The VAPID key is a long base64 string like `BNdGq…`. Save it somewhere temporarily — you'll paste it into a GitHub Secret and your `.env.local`.

### 2. Generate a service account private key

The GitHub Actions cron impersonates your Firebase project to send pushes; it needs a service-account key for that.

- Same **Project settings** screen → **Service accounts** tab.
- Make sure "Firebase Admin SDK" is selected (it usually is by default).
- Click **Generate new private key** → confirm in the dialog. A JSON file downloads.

**Treat this JSON as a secret** — anyone with it can read/write your Firebase project. Do **not** commit it to the repo. We'll paste it directly into a GitHub Secret in the next step.

### 3. Add two new GitHub Secrets

Go to https://github.com/ryananders95/plant-reminder/settings/secrets/actions → **New repository secret**:

| Name | Value |
|---|---|
| `VITE_FIREBASE_VAPID_KEY` | The VAPID key string from step 1. |
| `FIREBASE_SERVICE_ACCOUNT` | **Open the downloaded JSON file in a text editor, copy its entire contents, and paste it as the secret value.** |

### 4. Add the VAPID key to `.env.local` (for local dev)

Open `C:\Users\ryana\PlantReminder\.env.local` and add a line:

```
VITE_FIREBASE_VAPID_KEY=<paste the VAPID key here>
```

(The service account is server-side only — never goes in `.env.local`.)

### 5. iOS-specific reminder for users

iPhone users **must install the PWA to their home screen** before push notifications can work. Safari tabs don't receive push on iOS. The in-app install banner and the Settings screen already nudge them.

---

## Phase 3.1 — External cron + monitoring

GitHub Actions' `schedule:` trigger is best-effort and routinely delays or skips runs, especially at `:00` / `:30` slots. The fix below makes triggering reliable and pages you by email if pushes stop going out.

The GitHub Actions `schedule:` block in `.github/workflows/notify.yml` stays in place as a fallback — the `lastNotifiedDay` dedupe and the widened `NOTIFY_WINDOW_MIN` in `scripts/notify.ts` make double-firing safe.

### 1. Create a fine-grained GitHub PAT

- https://github.com/settings/personal-access-tokens/new
- **Resource owner**: your account.
- **Repository access**: **Only select repositories** → `ryananders95/plant-reminder`.
- **Permissions** → **Repository permissions** → **Actions**: **Read and write**. Leave everything else as default (no access).
- Expiration: 1 year is fine. Set a calendar reminder to rotate before then.
- Generate, copy the `github_pat_...` token immediately — you can't see it again.

### 2. Configure cron-job.org as the primary trigger

- Sign up at https://cron-job.org (free).
- **Create cronjob** with:
  - **Title**: `PlantPapi notify`
  - **URL**: `https://api.github.com/repos/ryananders95/plant-reminder/actions/workflows/notify.yml/dispatches`
  - **Schedule**: every 30 minutes (any hour, any day).
  - **Advanced → Request method**: `POST`
  - **Advanced → Request body** (raw JSON): `{"ref":"main"}`
  - **Advanced → Request headers**:
    - `Authorization`: `Bearer <your PAT from step 1>`
    - `Accept`: `application/vnd.github+json`
    - `X-GitHub-Api-Version`: `2022-11-28`
    - `Content-Type`: `application/json`
  - **Notifications**: enable "on failure" (emails the account address). Successful dispatches return HTTP 204 — anything else is a failure.
- Click **Create cronjob**, then use "Run now" to verify a new run shows up in GitHub Actions within ~30 sec.

### 3. Configure healthchecks.io for staleness alerting

cron-job.org only catches HTTP failures of the dispatch POST. If GitHub Actions runs but `notify.ts` crashes, or if GH Actions itself is down, cron-job.org doesn't know. Healthchecks.io specifically alerts on "you should have pinged me by now."

- Sign up at https://healthchecks.io (free tier: 20 checks).
- **Add Check** named `plantpapi-notify`:
  - **Schedule** tab → **Simple**: period **30 min**, **Grace Time**: **3 hours**.
  - Copy the check's ping URL — looks like `https://hc-ping.com/<uuid>`.
- Confirm email integration is on (it's the default).
- In GitHub → repo Settings → Secrets and variables → Actions → **New repository secret**:
  - **Name**: `HEALTHCHECK_URL`
  - **Value**: the ping URL.

The workflow's `Healthcheck ping` step is guarded by `env.HEALTHCHECK_URL != ''`, so it's a no-op until the secret is added.

### 4. What to do when the alert email arrives

The healthchecks.io email means at least one `notify.yml` run hasn't succeeded in the past 3+ hours. Open https://github.com/ryananders95/plant-reminder/actions/workflows/notify.yml and look at the most recent runs — common causes:

- **Workflow disabled for inactivity**: GitHub turns off scheduled workflows after 60 days with no repo activity. The Actions page shows a banner, and the API reports `state: disabled_inactivity`. `notify.yml` has a keepalive step that re-enables itself on every run to prevent this. If it happens anyway, click **Enable workflow** on the Actions page or push any commit (a push re-enabled it on 2026-11-17).
- **Workflow not triggered at all**: check the cron-job.org execution history for HTTP errors on the dispatch POST (most often: expired PAT). Rotate the PAT and update the cron-job.org `Authorization` header.
- **Workflow ran but failed**: open the failed run's logs. Most likely a Firebase Admin SDK auth error (rotated service account?) or a code regression in `scripts/notify.ts`.
- **GitHub Actions is down**: rare; check https://www.githubstatus.com. The widened `NOTIFY_WINDOW_MIN` of 4 hours means pushes will catch up automatically once Actions recovers.
