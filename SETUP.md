# Plant Reminder — One-time Setup

Everything in this doc is **owner-only** (you, Ryan). Friends and family who use the deployed app just tap "Sign in with Google" — they don't see any of this.

We use a single Firebase project for: sign-in, plant data (Firestore), photos (Storage), and (in Phase 3) push notifications.

---

## Phase 2 — Firebase Auth + Firestore + Storage

### 1. Create the Firebase project

- Open https://console.firebase.google.com/
- Click **Add project** (or "Create a project").
- **Project name**: `Plant Reminder`. Click **Continue**.
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
- **App nickname**: `Plant Reminder Web`.
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

### 7. Paste me the firebaseConfig

Send me the `firebaseConfig` object from step 3. I'll wire it into the app:
- Locally: `.env` file (gitignored).
- For the deployed build: GitHub Secrets, baked in at build time.

---

## Phase 3 — Cloud Messaging + cron (later)

Will be added when we start Phase 3. Same Firebase project.
