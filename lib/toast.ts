// Tiny toast bus: any screen calls toast('...') and the ToastHost
// mounted in the tab layout renders it. Auto-dismisses after 2.5s.

type Listener = (message: string | null) => void;

const listeners = new Set<Listener>();
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export function toast(message: string): void {
  for (const listener of listeners) listener(message);
  if (dismissTimer) clearTimeout(dismissTimer);
  dismissTimer = setTimeout(() => {
    for (const listener of listeners) listener(null);
  }, 2500);
}

export function subscribeToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
