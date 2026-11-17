import { dismissToast, useToastMessage } from '../lib/toast';

export function Toast() {
  const message = useToastMessage();
  if (!message) return null;
  return (
    <div className="toast toast-error" role="alert" onClick={dismissToast}>
      <span className="toast-message">{message}</span>
      <button
        type="button"
        className="toast-close"
        aria-label="Dismiss"
        onClick={(e) => {
          e.stopPropagation();
          dismissToast();
        }}
      >
        ×
      </button>
    </div>
  );
}
