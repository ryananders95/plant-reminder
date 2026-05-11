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
