// Screen wake-lock helpers for the workout tab. All failures are
// swallowed: the wake lock is a nicety, never a crash.

import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

export async function keepAwakeOn(): Promise<void> {
  try {
    await activateKeepAwakeAsync();
  } catch {
    // Wake lock unavailable; stay silent.
  }
}

export async function keepAwakeOff(): Promise<void> {
  try {
    await deactivateKeepAwake();
  } catch {
    // Wake lock unavailable; stay silent.
  }
}
