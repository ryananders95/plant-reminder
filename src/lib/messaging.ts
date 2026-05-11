import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
  type MessagePayload,
} from 'firebase/messaging';
import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { app, db } from './firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

let _messaging: Messaging | null | undefined = undefined;

async function getMsg(): Promise<Messaging | null> {
  if (_messaging !== undefined) return _messaging;
  try {
    const supported = await isSupported();
    _messaging = supported ? getMessaging(app) : null;
  } catch (err) {
    console.warn('FCM init failed:', err);
    _messaging = null;
  }
  return _messaging;
}

export async function isPushSupported(): Promise<boolean> {
  return (await getMsg()) !== null && !!VAPID_KEY;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.requestPermission();
}

let swRegPromise: Promise<ServiceWorkerRegistration> | null = null;

function getFcmServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!swRegPromise) {
    swRegPromise = registerAndActivate();
  }
  return swRegPromise;
}

async function registerAndActivate(): Promise<ServiceWorkerRegistration> {
  // Resolve absolute paths so the browser uses the right scope even when the
  // site lives at a sub-path like /plant-reminder/. We use an explicit nested
  // scope ("firebase-cloud-messaging-push-scope/") so this SW doesn't replace
  // the vite-plugin-pwa SW at the site root scope.
  const swUrl = new URL('firebase-messaging-sw.js', document.baseURI).pathname;
  const scope = new URL('firebase-cloud-messaging-push-scope/', document.baseURI).pathname;
  const reg = await navigator.serviceWorker.register(swUrl, { scope });

  // navigator.serviceWorker.register resolves as soon as the SW *starts*
  // installing — getToken needs it to be *active*, or the first call after
  // first-time permission grant returns null.
  if (reg.active) return reg;

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const watch = (sw: ServiceWorker | null) => {
      if (!sw) return false;
      if (sw.state === 'activated') {
        finish();
        return true;
      }
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') finish();
      });
      return true;
    };
    if (!watch(reg.installing) && !watch(reg.waiting) && !watch(reg.active)) {
      // No worker yet — wait for one to appear, then watch it.
      reg.addEventListener('updatefound', () => watch(reg.installing));
    }
    // Safety timeout in case the SW lifecycle stalls.
    setTimeout(finish, 5000);
  });

  return reg;
}

async function getCurrentFcmToken(): Promise<string | null> {
  const msg = await getMsg();
  if (!msg || !VAPID_KEY) return null;
  try {
    const reg = await getFcmServiceWorker();
    const token = await getToken(msg, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg,
    });
    return token || null;
  } catch (err) {
    console.error('getToken failed:', err);
    return null;
  }
}

export async function registerFcmToken(uid: string): Promise<string | null> {
  const token = await getCurrentFcmToken();
  if (!token) return null;
  await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(token) });
  return token;
}

export async function unregisterFcmToken(uid: string): Promise<void> {
  const msg = await getMsg();
  if (!msg) return;
  try {
    const token = await getCurrentFcmToken();
    await deleteToken(msg);
    if (token) {
      await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayRemove(token) });
    }
  } catch (err) {
    console.error('FCM token removal failed:', err);
  }
}

export function onForegroundMessage(callback: (payload: MessagePayload) => void): () => void {
  let unsub: (() => void) | null = null;
  let cancelled = false;
  void getMsg().then((msg) => {
    if (cancelled || !msg) return;
    unsub = onMessage(msg, callback);
  });
  return () => {
    cancelled = true;
    if (unsub) unsub();
  };
}
