// Live Activity bridge: shows the active workout in the iOS Dynamic Island
// and on the Lock Screen (live timer + exercise progress like 7/9).
//
// iOS-only. Every function is a safe no-op on Android or when ActivityKit
// is unavailable, and no error ever interrupts a workout. Failures are
// recorded (see getIslandDiagnostics) and logged in dev builds instead of
// vanishing silently.
//
// The island renders its own ticking timer from `startedAt` (epoch seconds),
// so the app only pushes updates when exercise progress changes. If iOS
// dismisses the activity mid-workout, the next progress update restarts it,
// with a circuit breaker so a throttling system never gets hammered.

import { Platform } from 'react-native';
import type { LiveActivityHandle } from 'expo-targets';

type IslandHandle = LiveActivityHandle<'GymWidgetsAttributes'>;

export type IslandResult = { ok: boolean; reason: string | null };

let handle: IslandHandle | null = null;
let handleBroken = false;
let activeId: string | null = null;
let lastStart: { title: string; total: number; startedAtMs: number } | null =
  null;
let lastError: string | null = null;

// iOS throttles apps that start/end activities in a tight loop; never feed it.
const restartTimestamps: number[] = [];
const MAX_RESTARTS_PER_MINUTE = 3;

function canRestart(): boolean {
  const now = Date.now();
  while (
    restartTimestamps.length > 0 &&
    now - restartTimestamps[0] > 60_000
  ) {
    restartTimestamps.shift();
  }
  return restartTimestamps.length < MAX_RESTARTS_PER_MINUTE;
}

function noteError(where: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  lastError = `${where}: ${msg}`;
  if (__DEV__) {
    console.warn(`[liveActivity] ${lastError}`);
  }
}

async function getHandle(): Promise<IslandHandle | null> {
  if (Platform.OS !== 'ios' || handleBroken) return null;
  if (handle) return handle;
  try {
    const { areLiveActivitiesEnabled } = await import('expo-targets');
    if (!(await areLiveActivitiesEnabled())) {
      lastError = 'getHandle: Live Activities are disabled in iOS Settings';
      return null;
    }
    const { gymWidgetsLiveActivity } = await import('../targets/gym-widgets');
    handle = gymWidgetsLiveActivity as IslandHandle;
    return handle;
  } catch (err) {
    // Broken bridge: don't retry for the rest of this app session.
    noteError('getHandle', err);
    handleBroken = true;
    return null;
  }
}

/** Show the island when a workout session begins. Replaces any stale one. */
export async function startWorkoutIsland(
  title: string,
  total: number,
  startedAtMs: number,
  completed = 0
): Promise<IslandResult> {
  try {
    const island = await getHandle();
    if (!island) return { ok: false, reason: lastError };
    lastStart = { title, total, startedAtMs };
    if (activeId) {
      try {
        await island.end(activeId);
      } catch {
        // Stale id; the fresh start replaces it anyway.
      }
      activeId = null;
    }
    activeId = await island.start({
      attributes: { title },
      contentState: { startedAt: startedAtMs / 1000, completed, total },
    });
    lastError = null;
    return { ok: true, reason: null };
  } catch (err) {
    noteError('start', err);
    return { ok: false, reason: lastError };
  }
}

/**
 * Push progress to the island. The timer ticks on-device; no per-second pushes.
 * Returns true when an activity is live afterwards. If the activity is gone
 * (dismissed by iOS, or the start raced), restarts it from the last known
 * session so the island comes back on the next rep.
 */
export async function updateWorkoutIsland(
  completed: number,
  total: number,
  startedAtMs: number
): Promise<boolean> {
  try {
    const island = await getHandle();
    if (!island || !activeId) return false;
    const alive = await island.update(activeId, {
      startedAt: startedAtMs / 1000,
      completed,
      total,
    });
    if (alive) return true;
    if (lastStart && canRestart()) {
      restartTimestamps.push(Date.now());
      activeId = null;
      const res = await startWorkoutIsland(
        lastStart.title,
        lastStart.total,
        lastStart.startedAtMs,
        completed
      );
      return res.ok;
    }
    return false;
  } catch (err) {
    noteError('update', err);
    return false;
  }
}

/** Dismiss the island when the workout is finished. */
export async function endWorkoutIsland(): Promise<void> {
  try {
    const island = await getHandle();
    if (!island || !activeId) return;
    const id = activeId;
    activeId = null;
    lastStart = null;
    await island.end(id);
  } catch (err) {
    noteError('end', err);
  }
}

/** Where the island stands; useful when it doesn't show up. */
export function getIslandDiagnostics(): {
  active: boolean;
  lastError: string | null;
} {
  return { active: activeId !== null, lastError };
}
