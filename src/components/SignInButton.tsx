import { useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { signIn } from '../lib/auth';

export function SignInButton() {
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleClick = async () => {
    setError(null);
    setSigningIn(true);
    try {
      await signIn();
    } catch (err) {
      setError(describeAuthError(err));
      console.error('Sign-in error:', err);
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <>
      <button className="google-signin" onClick={handleClick} disabled={signingIn}>
        <GoogleIcon />
        {signingIn ? 'Signing in…' : 'Sign in with Google'}
      </button>
      {error && <p className="signin-error">{error}</p>}
    </>
  );
}

export function SignInScreen() {
  return (
    <div className="signin">
      <div className="signin-card">
        <div className="signin-icon">🌱</div>
        <h1>Plant Reminder</h1>
        <p>Reminders to water, fertilize, and mist your houseplants.</p>
        <SignInButton />
      </div>
    </div>
  );
}

function describeAuthError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/popup-blocked':
        return 'Your browser blocked the sign-in popup. Allow popups for this site and try again.';
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'Sign-in was cancelled. Tap the button to try again.';
      case 'auth/unauthorized-domain':
        return `This domain isn't on the Firebase authorized list. Add it under Authentication → Settings → Authorized domains.`;
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.';
      default:
        return `${err.code}: ${err.message}`;
    }
  }
  if (err instanceof Error) return err.message;
  return 'Sign-in failed for an unknown reason.';
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
