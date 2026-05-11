import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { collectDueItems } from '../src/lib/schedule';
import type { Plant } from '../src/types';

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error('FIREBASE_SERVICE_ACCOUNT env var is required');
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
const db = getFirestore();
const messaging = getMessaging();

interface UserDoc {
  plants?: Plant[];
  fcmTokens?: string[];
  notificationsEnabled?: boolean;
  notificationTime?: string;
  timezone?: string;
  lastNotifiedDay?: string;
}

const NOTIFY_WINDOW_MIN = 30;

function parseHHMM(s: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function localTimeAndDate(now: Date, timezone: string): {
  time: { h: number; m: number };
  date: string;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return {
    time: { h: parseInt(get('hour'), 10), m: parseInt(get('minute'), 10) },
    date: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

function minutesSince(target: { h: number; m: number }, current: { h: number; m: number }): number {
  return (current.h - target.h) * 60 + (current.m - target.m);
}

async function processUser(userId: string, user: UserDoc, now: Date): Promise<string> {
  if (!user.notificationsEnabled) return 'disabled';
  if (!user.fcmTokens || user.fcmTokens.length === 0) return 'no tokens';
  if (!user.notificationTime || !user.timezone) return 'no time/tz';

  const target = parseHHMM(user.notificationTime);
  if (!target) return `bad time "${user.notificationTime}"`;

  let local;
  try {
    local = localTimeAndDate(now, user.timezone);
  } catch {
    return `bad tz "${user.timezone}"`;
  }

  const diff = minutesSince(target, local.time);
  if (diff < 0 || diff > NOTIFY_WINDOW_MIN) {
    return `outside window (local ${local.time.h}:${String(local.time.m).padStart(2, '0')} vs target ${user.notificationTime})`;
  }

  if (user.lastNotifiedDay === local.date) return 'already notified today';

  const plants = user.plants ?? [];
  const due = collectDueItems(plants, now, 0);
  if (due.length === 0) return 'no due tasks';

  const plantNames = [...new Set(due.map((d) => d.plant.name))];
  const body =
    plantNames.length === 1
      ? `${plantNames[0]} needs attention`
      : `${plantNames.length} plants need attention`;

  const result = await messaging.sendEachForMulticast({
    tokens: user.fcmTokens,
    notification: { title: 'Plant Reminder', body },
    webpush: { fcmOptions: { link: '/' } },
  });

  const badTokens: string[] = [];
  result.responses.forEach((resp, i) => {
    if (resp.success) return;
    const code = (resp.error as { code?: string } | undefined)?.code;
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token' ||
      code === 'messaging/invalid-argument'
    ) {
      badTokens.push(user.fcmTokens![i]);
    } else {
      console.warn(`  user ${userId.slice(0, 8)} token[${i}] failed: ${code}`);
    }
  });

  const validTokens = user.fcmTokens.filter((t) => !badTokens.includes(t));
  await db.collection('users').doc(userId).update({
    lastNotifiedDay: local.date,
    fcmTokens: validTokens,
  });

  return `sent ${result.successCount}/${user.fcmTokens.length}, pruned ${badTokens.length}`;
}

async function main() {
  const now = new Date();
  console.log(`notify.ts run at ${now.toISOString()}`);

  const snapshot = await db.collection('users').get();
  console.log(`  ${snapshot.size} user docs`);

  for (const doc of snapshot.docs) {
    const result = await processUser(doc.id, doc.data() as UserDoc, now);
    console.log(`  ${doc.id.slice(0, 8)}: ${result}`);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error('notify.ts failed:', err);
    process.exit(1);
  },
);
