/**
 * One-shot recovery script: writes a localStorage-exported AppState back to
 * a user's Firestore document. Use when Firestore data has been lost and a
 * localStorage cache from another device still has it.
 *
 * Usage (from project root, PowerShell on Windows):
 *   npx tsx scripts/restore-plants.ts <user-uid> <path-to-cache.json>
 *
 * Requirements:
 *   - `service-account.json` in the project root (the Firebase service-account
 *     JSON you downloaded for the cron). This file is gitignored.
 *   - <user-uid>: find in Firebase Console -> Firestore -> users collection
 *     (the doc id under "users/" is the uid).
 *   - <path-to-cache.json>: a file containing the JSON value of the
 *     `plantreminder.state` localStorage key.
 *
 * The script writes `{ version, plants }` to `users/<uid>` with merge: true,
 * so it overwrites the plants field but doesn't touch fcmTokens, settings, etc.
 */

import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const uid = process.argv[2];
const dataFile = process.argv[3];

if (!uid || !dataFile) {
  console.error('Usage: npx tsx scripts/restore-plants.ts <user-uid> <data-file>');
  process.exit(1);
}

const saPath = resolve(process.cwd(), 'service-account.json');
let serviceAccount: object;
try {
  serviceAccount = JSON.parse(readFileSync(saPath, 'utf-8'));
} catch (err) {
  console.error(`Could not read ${saPath}.`);
  console.error('Save your Firebase service-account JSON at that path first.');
  console.error(err);
  process.exit(1);
}

const dataPath = resolve(process.cwd(), dataFile);
let data: { version?: number; plants?: unknown[] };
try {
  data = JSON.parse(readFileSync(dataPath, 'utf-8'));
} catch (err) {
  console.error(`Could not read ${dataPath}.`);
  console.error(err);
  process.exit(1);
}

if (!Array.isArray(data.plants)) {
  console.error('Data file does not contain a plants array.');
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount as never) });
const db = getFirestore();

async function main() {
  console.log(`Restoring ${data.plants!.length} plant(s) to users/${uid}:`);
  for (const p of data.plants as Array<{ name?: string; room?: string }>) {
    console.log(`  - ${p.name ?? '<no name>'} (${p.room ?? 'no room'})`);
  }
  await db
    .collection('users')
    .doc(uid)
    .set({ version: data.version ?? 2, plants: data.plants }, { merge: true });
  console.log('Done.');
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error('Restore failed:', err);
    process.exit(1);
  },
);
